from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from sqlalchemy import desc, or_

from app.core.audit import log_audit_event, serialize_audit_log
from app.extensions import db
from app.models.admin import AuditLog
from app.models.inventory import (
    InventoryItem,
    ProjectStockAllocation,
    StockInventoryLine,
    StockInventorySession,
    StockLocation,
    StockMovement,
    StockOperation,
    StockOperationLine,
)
from app.models.inventory import StockSupplyRequest
from app.models.project import Project, ProjectTask
from app.models.user import User


LOCATION_TYPES = {"main_warehouse", "secondary_depot", "site"}
ITEM_CATEGORIES = {"material", "equipment", "consumable"}
MOVEMENT_TYPES = {"in", "out", "transfer", "adjustment", "allocation"}
OPERATION_KINDS = {"entry", "exit", "transfer"}
ENTRY_TYPES = {"supplier_purchase", "site_return", "internal_transfer", "stock_adjustment"}
EXIT_TYPES = {"project_assignment", "internal_consumption", "loss_breakage", "theft_anomaly"}
OPERATION_STATUSES = {"pending", "validated", "cancelled"}
INVENTORY_TYPES = {"periodic", "permanent", "cycle"}
INVENTORY_STATUSES = {"draft", "validated"}
DECIMAL_ZERO = Decimal("0")


class InventoryError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _as_decimal(
    value: Any,
    field_name: str,
    *,
    positive: bool = False,
    non_negative: bool = False,
    allow_none: bool = False,
) -> Decimal | None:
    if value in (None, ""):
        if allow_none:
            return None
        raise InventoryError(f"{field_name} is required", status_code=400)

    try:
        decimal_value = Decimal(str(value))
    except Exception as exc:
        raise InventoryError(f"{field_name} must be numeric", status_code=400) from exc

    if positive and decimal_value <= DECIMAL_ZERO:
        raise InventoryError(f"{field_name} must be greater than zero", status_code=400)
    if non_negative and decimal_value < DECIMAL_ZERO:
        raise InventoryError(f"{field_name} cannot be negative", status_code=400)

    return decimal_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _parse_date(value: Any, field_name: str) -> date:
    if value in (None, ""):
        raise InventoryError(f"{field_name} is required", status_code=400)
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError as exc:
        raise InventoryError(f"{field_name} must be in YYYY-MM-DD format", status_code=400) from exc


def _decimal_to_float(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _serialize_user_summary(user: User | None) -> dict[str, Any] | None:
    if user is None:
        return None
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": full_name or user.email,
        "job_title": user.job_title,
    }


def _serialize_project_summary(project: Project | None) -> dict[str, Any] | None:
    if project is None:
        return None
    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "status": project.status,
    }


def _serialize_task_summary(task: ProjectTask | None) -> dict[str, Any] | None:
    if task is None:
        return None
    return {
        "id": task.id,
        "project_id": task.project_id,
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
    }


def _serialize_location(row: StockLocation) -> dict[str, Any]:
    project = None
    if row.project_id is not None:
        project = Project.query.filter_by(id=row.project_id, company_id=row.company_id).first()

    return {
        "id": row.id,
        "company_id": row.company_id,
        "code": row.code,
        "name": row.name,
        "location_type": row.location_type,
        "project_id": row.project_id,
        "project": _serialize_project_summary(project),
        "address": row.address,
        "description": row.description,
    }


def _determine_alert_level(
    *,
    on_hand_quantity: Decimal,
    available_quantity: Decimal,
    min_threshold: Decimal,
    max_threshold: Decimal | None,
) -> str:
    if available_quantity <= DECIMAL_ZERO:
        return "out_of_stock"
    if available_quantity <= min_threshold:
        return "critical" if available_quantity <= (min_threshold / Decimal("2")) else "low_stock"
    if max_threshold is not None and on_hand_quantity > max_threshold:
        return "overstock"
    return "normal"


def _compute_location_stock(company_id: int, item_id: int, location_id: int) -> Decimal:
    total = DECIMAL_ZERO
    rows = StockMovement.query.filter_by(company_id=company_id, item_id=item_id).all()
    for row in rows:
        quantity = Decimal(str(row.quantity))
        if row.to_location_id == location_id:
            total += quantity
        if row.from_location_id == location_id:
            total -= quantity
    return total


def _compute_global_stock(company_id: int, item_id: int) -> Decimal:
    total = DECIMAL_ZERO
    rows = StockMovement.query.filter_by(company_id=company_id, item_id=item_id).all()
    for row in rows:
        quantity = Decimal(str(row.quantity))
        if row.to_location_id is not None:
            total += quantity
        if row.from_location_id is not None:
            total -= quantity
    return total


def _compute_reserved_quantity(company_id: int, item_id: int, location_id: int | None = None) -> Decimal:
    total = DECIMAL_ZERO
    rows = (
        db.session.query(StockOperation, StockOperationLine)
        .join(StockOperationLine, StockOperationLine.operation_id == StockOperation.id)
        .filter(
            StockOperation.company_id == company_id,
            StockOperationLine.company_id == company_id,
            StockOperation.status == "pending",
            StockOperationLine.item_id == item_id,
            StockOperation.operation_kind.in_(["exit", "transfer"]),
        )
        .all()
    )
    for operation, line in rows:
        if location_id is not None and operation.source_location_id != location_id:
            continue
        total += Decimal(str(line.quantity))
    return total


def _compute_monthly_consumption(company_id: int, item_id: int) -> Decimal:
    cutoff = datetime.combine(date.today() - timedelta(days=90), time.min)
    total = DECIMAL_ZERO
    rows = (
        StockMovement.query.filter(
            StockMovement.company_id == company_id,
            StockMovement.item_id == item_id,
            StockMovement.created_at >= cutoff,
        )
        .order_by(StockMovement.created_at.desc())
        .all()
    )
    for row in rows:
        quantity = Decimal(str(row.quantity))
        if row.movement_type in {"out", "allocation"}:
            total += quantity
        elif row.movement_type == "adjustment" and row.from_location_id is not None and row.to_location_id is None:
            total += quantity
    return (total / Decimal("3")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _compute_suggested_purchase_quantity(
    *,
    available_quantity: Decimal,
    min_threshold: Decimal,
    monthly_consumption: Decimal,
) -> Decimal:
    target = max(min_threshold * Decimal("2"), monthly_consumption)
    if target <= available_quantity:
        return DECIMAL_ZERO
    return (target - available_quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _build_item_metrics(company_id: int, item: InventoryItem) -> dict[str, Any]:
    on_hand_quantity = _compute_global_stock(company_id=company_id, item_id=item.id)
    reserved_quantity = _compute_reserved_quantity(company_id=company_id, item_id=item.id)
    available_quantity = on_hand_quantity - reserved_quantity
    min_threshold = Decimal(str(item.min_threshold))
    max_threshold = Decimal(str(item.max_threshold)) if item.max_threshold is not None else None
    monthly_consumption = _compute_monthly_consumption(company_id=company_id, item_id=item.id)
    suggested_purchase_quantity = _compute_suggested_purchase_quantity(
        available_quantity=available_quantity,
        min_threshold=min_threshold,
        monthly_consumption=monthly_consumption,
    )
    stock_value = on_hand_quantity * Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
    alert_level = _determine_alert_level(
        on_hand_quantity=on_hand_quantity,
        available_quantity=available_quantity,
        min_threshold=min_threshold,
        max_threshold=max_threshold,
    )

    return {
        "on_hand_quantity": _decimal_to_float(on_hand_quantity),
        "reserved_quantity": _decimal_to_float(reserved_quantity),
        "available_quantity": _decimal_to_float(available_quantity),
        "stock_value": _decimal_to_float(stock_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "average_monthly_consumption": _decimal_to_float(monthly_consumption),
        "suggested_purchase_quantity": _decimal_to_float(suggested_purchase_quantity),
        "alert_level": alert_level,
        "is_critical": alert_level in {"out_of_stock", "critical", "low_stock"},
    }


def _serialize_item(row: InventoryItem) -> dict[str, Any]:
    metrics = _build_item_metrics(company_id=row.company_id, item=row)
    return {
        "id": row.id,
        "company_id": row.company_id,
        "sku": row.sku,
        "name": row.name,
        "unit": row.unit,
        "category": row.category,
        "min_threshold": _decimal_to_float(Decimal(str(row.min_threshold))),
        "max_threshold": _decimal_to_float(Decimal(str(row.max_threshold))) if row.max_threshold is not None else None,
        "average_unit_cost": _decimal_to_float(Decimal(str(row.average_unit_cost))),
        "preferred_supplier": row.preferred_supplier,
        "barcode": row.barcode,
        "qr_code": row.qr_code,
        "notes": row.notes,
        **metrics,
    }


def serialize_item(row: InventoryItem) -> dict[str, Any]:
    return _serialize_item(row)


def _serialize_operation_line(row: StockOperationLine) -> dict[str, Any]:
    item = InventoryItem.query.filter_by(id=row.item_id, company_id=row.company_id).first()
    return {
        "id": row.id,
        "operation_id": row.operation_id,
        "company_id": row.company_id,
        "item_id": row.item_id,
        "item": _serialize_item(item) if item is not None else None,
        "quantity": _decimal_to_float(Decimal(str(row.quantity))),
        "unit_price": _decimal_to_float(Decimal(str(row.unit_price))) if row.unit_price is not None else None,
        "total_amount": _decimal_to_float(Decimal(str(row.total_amount))) if row.total_amount is not None else None,
        "notes": row.notes,
    }


def serialize_operation_line(row: StockOperationLine) -> dict[str, Any]:
    return _serialize_operation_line(row)


def _serialize_operation(row: StockOperation, include_lines: bool = True) -> dict[str, Any]:
    source_location = (
        StockLocation.query.filter_by(id=row.source_location_id, company_id=row.company_id).first()
        if row.source_location_id is not None
        else None
    )
    destination_location = (
        StockLocation.query.filter_by(id=row.destination_location_id, company_id=row.company_id).first()
        if row.destination_location_id is not None
        else None
    )
    project = (
        Project.query.filter_by(id=row.project_id, company_id=row.company_id).first()
        if row.project_id is not None
        else None
    )
    task = (
        ProjectTask.query.filter_by(id=row.task_id, company_id=row.company_id).first()
        if row.task_id is not None
        else None
    )
    responsible = (
        User.query.filter_by(id=row.responsible_user_id, company_id=row.company_id).first()
        if row.responsible_user_id is not None
        else None
    )
    requester = (
        User.query.filter_by(id=row.requested_by_user_id, company_id=row.company_id).first()
        if row.requested_by_user_id is not None
        else None
    )
    validator = (
        User.query.filter_by(id=row.validated_by_user_id, company_id=row.company_id).first()
        if row.validated_by_user_id is not None
        else None
    )

    lines_query = StockOperationLine.query.filter_by(operation_id=row.id, company_id=row.company_id).order_by(StockOperationLine.id.asc())
    line_rows = lines_query.all() if include_lines else []
    total_quantity = DECIMAL_ZERO
    total_amount = DECIMAL_ZERO
    has_amount = False
    for line in line_rows if include_lines else lines_query.all():
        total_quantity += Decimal(str(line.quantity))
        if line.total_amount is not None:
            total_amount += Decimal(str(line.total_amount))
            has_amount = True

    return {
        "id": row.id,
        "company_id": row.company_id,
        "operation_kind": row.operation_kind,
        "entry_type": row.entry_type,
        "exit_type": row.exit_type,
        "status": row.status,
        "operation_date": row.operation_date.isoformat(),
        "source_location_id": row.source_location_id,
        "destination_location_id": row.destination_location_id,
        "source_location": _serialize_location(source_location) if source_location is not None else None,
        "destination_location": _serialize_location(destination_location) if destination_location is not None else None,
        "supplier_name": row.supplier_name,
        "delivery_note_number": row.delivery_note_number,
        "invoice_reference": row.invoice_reference,
        "project_id": row.project_id,
        "project": _serialize_project_summary(project),
        "task_id": row.task_id,
        "task": _serialize_task_summary(task),
        "requested_by_user_id": row.requested_by_user_id,
        "requested_by_user": _serialize_user_summary(requester),
        "responsible_user_id": row.responsible_user_id,
        "responsible_user": _serialize_user_summary(responsible),
        "validated_by_user_id": row.validated_by_user_id,
        "validated_by_user": _serialize_user_summary(validator),
        "reference": row.reference,
        "notes": row.notes,
        "total_quantity": _decimal_to_float(total_quantity),
        "total_amount": _decimal_to_float(total_amount) if has_amount else None,
        "lines": [_serialize_operation_line(line) for line in line_rows] if include_lines else [],
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def serialize_operation(row: StockOperation) -> dict[str, Any]:
    return _serialize_operation(row)


def _serialize_movement(row: StockMovement) -> dict[str, Any]:
    item = InventoryItem.query.filter_by(id=row.item_id, company_id=row.company_id).first()
    project = Project.query.filter_by(id=row.project_id, company_id=row.company_id).first() if row.project_id is not None else None
    task = ProjectTask.query.filter_by(id=row.task_id, company_id=row.company_id).first() if row.task_id is not None else None
    performed_by = User.query.filter_by(id=row.performed_by_user_id, company_id=row.company_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "operation_id": row.operation_id,
        "operation_line_id": row.operation_line_id,
        "item_id": row.item_id,
        "item": _serialize_item(item) if item is not None else None,
        "from_location_id": row.from_location_id,
        "to_location_id": row.to_location_id,
        "project_id": row.project_id,
        "project": _serialize_project_summary(project),
        "task_id": row.task_id,
        "task": _serialize_task_summary(task),
        "movement_type": row.movement_type,
        "quantity": _decimal_to_float(Decimal(str(row.quantity))),
        "stock_before": _decimal_to_float(Decimal(str(row.stock_before))) if row.stock_before is not None else None,
        "stock_after": _decimal_to_float(Decimal(str(row.stock_after))) if row.stock_after is not None else None,
        "unit_cost": _decimal_to_float(Decimal(str(row.unit_cost))) if row.unit_cost is not None else None,
        "total_cost": _decimal_to_float(Decimal(str(row.total_cost))) if row.total_cost is not None else None,
        "performed_by_user_id": row.performed_by_user_id,
        "performed_by": _serialize_user_summary(performed_by),
        "reference": row.reference,
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def serialize_movement(row: StockMovement) -> dict[str, Any]:
    return _serialize_movement(row)


def _serialize_allocation(row: ProjectStockAllocation) -> dict[str, Any]:
    project = Project.query.filter_by(id=row.project_id, company_id=row.company_id).first()
    task = ProjectTask.query.filter_by(id=row.task_id, company_id=row.company_id).first() if row.task_id is not None else None
    item = InventoryItem.query.filter_by(id=row.item_id, company_id=row.company_id).first()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "project": _serialize_project_summary(project),
        "task_id": row.task_id,
        "task": _serialize_task_summary(task),
        "item_id": row.item_id,
        "item": _serialize_item(item) if item is not None else None,
        "source_location_id": row.source_location_id,
        "stock_movement_id": row.stock_movement_id,
        "quantity_allocated": _decimal_to_float(Decimal(str(row.quantity_allocated))),
        "allocated_by_user_id": row.allocated_by_user_id,
        "responsible_user_id": row.responsible_user_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def serialize_allocation(row: ProjectStockAllocation) -> dict[str, Any]:
    return _serialize_allocation(row)


def _serialize_inventory_line(row: StockInventoryLine) -> dict[str, Any]:
    item = InventoryItem.query.filter_by(id=row.item_id, company_id=row.company_id).first()
    return {
        "id": row.id,
        "session_id": row.session_id,
        "company_id": row.company_id,
        "item_id": row.item_id,
        "item": _serialize_item(item) if item is not None else None,
        "system_quantity": _decimal_to_float(Decimal(str(row.system_quantity))),
        "counted_quantity": _decimal_to_float(Decimal(str(row.counted_quantity))),
        "difference_quantity": _decimal_to_float(Decimal(str(row.difference_quantity))),
        "observation": row.observation,
    }


def serialize_inventory_line(row: StockInventoryLine) -> dict[str, Any]:
    return _serialize_inventory_line(row)


def _serialize_inventory_session(row: StockInventorySession, include_lines: bool = True) -> dict[str, Any]:
    location = StockLocation.query.filter_by(id=row.location_id, company_id=row.company_id).first()
    responsible = User.query.filter_by(id=row.responsible_user_id, company_id=row.company_id).first()
    validator = (
        User.query.filter_by(id=row.validated_by_user_id, company_id=row.company_id).first()
        if row.validated_by_user_id is not None
        else None
    )
    lines = (
        StockInventoryLine.query.filter_by(session_id=row.id, company_id=row.company_id).order_by(StockInventoryLine.id.asc()).all()
        if include_lines
        else []
    )
    discrepancy_total = DECIMAL_ZERO
    for line in lines:
        discrepancy_total += abs(Decimal(str(line.difference_quantity)))

    return {
        "id": row.id,
        "company_id": row.company_id,
        "location_id": row.location_id,
        "location": _serialize_location(location) if location is not None else None,
        "inventory_type": row.inventory_type,
        "status": row.status,
        "inventory_date": row.inventory_date.isoformat(),
        "responsible_user_id": row.responsible_user_id,
        "responsible_user": _serialize_user_summary(responsible),
        "validated_by_user_id": row.validated_by_user_id,
        "validated_by_user": _serialize_user_summary(validator),
        "reference": row.reference,
        "notes": row.notes,
        "discrepancy_total": _decimal_to_float(discrepancy_total),
        "lines": [_serialize_inventory_line(line) for line in lines] if include_lines else [],
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def serialize_inventory_session(row: StockInventorySession) -> dict[str, Any]:
    return _serialize_inventory_session(row)


def _require_item(company_id: int, item_id: int) -> InventoryItem:
    item = InventoryItem.query.filter_by(id=item_id, company_id=company_id).first()
    if item is None or item.deleted_at is not None:
        raise InventoryError("Item not found", status_code=404)
    return item


def _require_location(company_id: int, location_id: int) -> StockLocation:
    location = StockLocation.query.filter_by(id=location_id, company_id=company_id).first()
    if location is None or location.deleted_at is not None:
        raise InventoryError("Location not found", status_code=404)
    return location


def _require_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None:
        raise InventoryError("User not found in company", status_code=404)
    return user


def _require_project(company_id: int, project_id: int) -> Project:
    project = Project.query.filter_by(id=project_id, company_id=company_id).first()
    if project is None or project.deleted_at is not None:
        raise InventoryError("Project not found", status_code=404)
    return project


def _require_task(company_id: int, task_id: int, *, project_id: int | None = None) -> ProjectTask:
    task = ProjectTask.query.filter_by(id=task_id, company_id=company_id).first()
    if task is None or task.deleted_at is not None:
        raise InventoryError("Task not found", status_code=404)
    if project_id is not None and task.project_id != project_id:
        raise InventoryError("task_id does not belong to the selected project", status_code=400)
    return task


def _require_operation(company_id: int, operation_id: int) -> StockOperation:
    operation = StockOperation.query.filter_by(id=operation_id, company_id=company_id).first()
    if operation is None:
        raise InventoryError("Operation not found", status_code=404)
    return operation


def _require_inventory_session(company_id: int, session_id: int) -> StockInventorySession:
    session = StockInventorySession.query.filter_by(id=session_id, company_id=company_id).first()
    if session is None:
        raise InventoryError("Inventory session not found", status_code=404)
    return session


def _validate_location_type(location_type: str) -> str:
    normalized = location_type.strip().lower()
    if normalized == "warehouse":
        normalized = "main_warehouse"
    if normalized not in LOCATION_TYPES:
        raise InventoryError("location_type is invalid", status_code=400)
    return normalized


def _validate_item_category(category: str) -> str:
    normalized = category.strip().lower()
    if normalized not in ITEM_CATEGORIES:
        raise InventoryError("category is invalid", status_code=400)
    return normalized


def _validate_operation_kind(operation_kind: str) -> str:
    normalized = operation_kind.strip().lower()
    if normalized not in OPERATION_KINDS:
        raise InventoryError("operation_kind is invalid", status_code=400)
    return normalized


def _build_operation_line_payloads(payload: dict[str, Any]) -> list[dict[str, Any]]:
    lines = payload.get("lines") or []
    if not lines:
        raise InventoryError("lines must contain at least one article", status_code=400)
    normalized_lines: list[dict[str, Any]] = []
    for index, raw_line in enumerate(lines):
        item_id = raw_line.get("item_id")
        if item_id is None:
            raise InventoryError(f"lines[{index}].item_id is required", status_code=400)
        quantity = _as_decimal(raw_line.get("quantity"), f"lines[{index}].quantity", positive=True)
        unit_price = _as_decimal(
            raw_line.get("unit_price"),
            f"lines[{index}].unit_price",
            non_negative=True,
            allow_none=True,
        )
        total_amount = _as_decimal(
            raw_line.get("total_amount"),
            f"lines[{index}].total_amount",
            non_negative=True,
            allow_none=True,
        )
        normalized_lines.append(
            {
                "item_id": int(item_id),
                "quantity": quantity,
                "unit_price": unit_price,
                "total_amount": total_amount,
                "notes": (raw_line.get("notes") or "").strip() or None,
            }
        )
    return normalized_lines


def _upsert_deleted_location(existing: StockLocation, *, payload: dict[str, Any]) -> StockLocation:
    existing.deleted_at = None
    existing.name = str(payload.get("name") or existing.name).strip()
    existing.location_type = _validate_location_type(str(payload.get("location_type") or existing.location_type))
    existing.project_id = payload.get("project_id")
    existing.address = (payload.get("address") or "").strip() or None
    existing.description = (payload.get("description") or "").strip() or None
    return existing


def _upsert_deleted_item(existing: InventoryItem, *, payload: dict[str, Any]) -> InventoryItem:
    existing.deleted_at = None
    existing.name = str(payload.get("name") or existing.name).strip()
    existing.unit = str(payload.get("unit") or existing.unit).strip().lower()
    existing.category = _validate_item_category(str(payload.get("category") or existing.category or "material"))
    existing.min_threshold = _as_decimal(payload.get("min_threshold", existing.min_threshold), "min_threshold", non_negative=True)
    max_threshold = _as_decimal(payload.get("max_threshold", existing.max_threshold), "max_threshold", non_negative=True, allow_none=True)
    if max_threshold is not None and max_threshold < existing.min_threshold:
        raise InventoryError("max_threshold cannot be lower than min_threshold", status_code=400)
    existing.max_threshold = max_threshold
    existing.average_unit_cost = _as_decimal(
        payload.get("average_unit_cost", existing.average_unit_cost),
        "average_unit_cost",
        non_negative=True,
    )
    existing.preferred_supplier = (payload.get("preferred_supplier") or "").strip() or None
    existing.barcode = (payload.get("barcode") or "").strip() or None
    existing.qr_code = (payload.get("qr_code") or "").strip() or None
    existing.notes = (payload.get("notes") or "").strip() or None
    return existing


def build_items_query(company_id: int):
    return (
        InventoryItem.query.filter(InventoryItem.company_id == company_id, InventoryItem.deleted_at.is_(None))
        .order_by(InventoryItem.sku.asc())
    )


def list_items(company_id: int) -> list[dict[str, Any]]:
    return [serialize_item(row) for row in build_items_query(company_id=company_id).all()]


def create_item(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    sku = str(payload.get("sku") or "").strip().upper()
    name = str(payload.get("name") or "").strip()
    unit = str(payload.get("unit") or "pcs").strip().lower()
    if not sku or not name:
        raise InventoryError("sku and name are required", status_code=400)

    category = _validate_item_category(str(payload.get("category") or "material"))
    min_threshold = _as_decimal(payload.get("min_threshold", 0), "min_threshold", non_negative=True)
    max_threshold = _as_decimal(payload.get("max_threshold"), "max_threshold", non_negative=True, allow_none=True)
    if max_threshold is not None and max_threshold < min_threshold:
        raise InventoryError("max_threshold cannot be lower than min_threshold", status_code=400)
    average_unit_cost = _as_decimal(
        payload.get("average_unit_cost", 0),
        "average_unit_cost",
        non_negative=True,
    )

    existing = InventoryItem.query.filter_by(company_id=company_id, sku=sku).first()
    if existing is not None:
        if existing.deleted_at is None:
            raise InventoryError("Item SKU already exists", status_code=409)
        item = _upsert_deleted_item(existing, payload=payload)
    else:
        item = InventoryItem(
            company_id=company_id,
            sku=sku,
            name=name,
            unit=unit,
            category=category,
            min_threshold=min_threshold,
            max_threshold=max_threshold,
            average_unit_cost=average_unit_cost,
            preferred_supplier=(payload.get("preferred_supplier") or "").strip() or None,
            barcode=(payload.get("barcode") or "").strip() or None,
            qr_code=(payload.get("qr_code") or "").strip() or None,
            notes=(payload.get("notes") or "").strip() or None,
        )
        db.session.add(item)

    item.name = name
    item.unit = unit
    item.category = category
    item.min_threshold = min_threshold
    item.max_threshold = max_threshold
    item.average_unit_cost = average_unit_cost
    item.preferred_supplier = (payload.get("preferred_supplier") or "").strip() or None
    item.barcode = (payload.get("barcode") or "").strip() or None
    item.qr_code = (payload.get("qr_code") or "").strip() or None
    item.notes = (payload.get("notes") or "").strip() or None
    db.session.commit()

    return _serialize_item(item)


def update_item(company_id: int, item_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    item = _require_item(company_id=company_id, item_id=item_id)

    if "sku" in payload:
        new_sku = str(payload.get("sku") or "").strip().upper()
        if not new_sku:
            raise InventoryError("sku is required", status_code=400)
        existing = InventoryItem.query.filter(
            InventoryItem.company_id == company_id,
            InventoryItem.sku == new_sku,
            InventoryItem.id != item_id,
            InventoryItem.deleted_at.is_(None),
        ).first()
        if existing is not None:
            raise InventoryError("Item SKU already exists", status_code=409)
        item.sku = new_sku

    if "name" in payload:
        name = str(payload.get("name") or "").strip()
        if not name:
            raise InventoryError("name is required", status_code=400)
        item.name = name

    if "unit" in payload:
        unit = str(payload.get("unit") or "").strip().lower()
        if not unit:
            raise InventoryError("unit is required", status_code=400)
        item.unit = unit

    if "category" in payload:
        item.category = _validate_item_category(str(payload.get("category") or item.category or "material"))

    if "min_threshold" in payload:
        item.min_threshold = _as_decimal(payload.get("min_threshold"), "min_threshold", non_negative=True)

    if "max_threshold" in payload:
        item.max_threshold = _as_decimal(payload.get("max_threshold"), "max_threshold", non_negative=True, allow_none=True)

    if "average_unit_cost" in payload:
        item.average_unit_cost = _as_decimal(payload.get("average_unit_cost"), "average_unit_cost", non_negative=True)

    if item.max_threshold is not None and Decimal(str(item.max_threshold)) < Decimal(str(item.min_threshold)):
        raise InventoryError("max_threshold cannot be lower than min_threshold", status_code=400)

    if "preferred_supplier" in payload:
        item.preferred_supplier = (payload.get("preferred_supplier") or "").strip() or None
    if "barcode" in payload:
        item.barcode = (payload.get("barcode") or "").strip() or None
    if "qr_code" in payload:
        item.qr_code = (payload.get("qr_code") or "").strip() or None
    if "notes" in payload:
        item.notes = (payload.get("notes") or "").strip() or None

    db.session.commit()
    return _serialize_item(item)


def soft_delete_item(company_id: int, item_id: int) -> None:
    item = _require_item(company_id=company_id, item_id=item_id)
    item.deleted_at = datetime.utcnow()
    db.session.commit()


def list_locations(company_id: int) -> list[dict[str, Any]]:
    rows = (
        StockLocation.query.filter(StockLocation.company_id == company_id, StockLocation.deleted_at.is_(None))
        .order_by(StockLocation.code.asc())
        .all()
    )
    return [_serialize_location(row) for row in rows]


def create_location(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    code = str(payload.get("code") or "").strip().upper()
    name = str(payload.get("name") or "").strip()
    if not code or not name:
        raise InventoryError("code and name are required", status_code=400)

    location_type = _validate_location_type(str(payload.get("location_type") or "main_warehouse"))
    project_id = payload.get("project_id")
    if location_type == "site":
        if project_id is None:
            raise InventoryError("project_id is required for site locations", status_code=400)
        _require_project(company_id=company_id, project_id=int(project_id))
    elif project_id is not None:
        _require_project(company_id=company_id, project_id=int(project_id))

    existing = StockLocation.query.filter_by(company_id=company_id, code=code).first()
    if existing is not None:
        if existing.deleted_at is None:
            raise InventoryError("Location code already exists", status_code=409)
        location = _upsert_deleted_location(existing, payload=payload)
    else:
        location = StockLocation(
            company_id=company_id,
            code=code,
            name=name,
            location_type=location_type,
            project_id=project_id,
            address=(payload.get("address") or "").strip() or None,
            description=(payload.get("description") or "").strip() or None,
        )
        db.session.add(location)

    location.name = name
    location.location_type = location_type
    location.project_id = int(project_id) if project_id is not None else None
    location.address = (payload.get("address") or "").strip() or None
    location.description = (payload.get("description") or "").strip() or None
    db.session.commit()

    return _serialize_location(location)


def get_item_stock(company_id: int, item_id: int, location_id: int | None = None) -> dict[str, Any]:
    item = _require_item(company_id=company_id, item_id=item_id)
    monthly_consumption = _compute_monthly_consumption(company_id=company_id, item_id=item.id)
    if location_id is not None:
        _require_location(company_id=company_id, location_id=location_id)
        on_hand_quantity = _compute_location_stock(company_id=company_id, item_id=item.id, location_id=location_id)
        reserved_quantity = _compute_reserved_quantity(company_id=company_id, item_id=item.id, location_id=location_id)
    else:
        on_hand_quantity = _compute_global_stock(company_id=company_id, item_id=item.id)
        reserved_quantity = _compute_reserved_quantity(company_id=company_id, item_id=item.id)

    available_quantity = on_hand_quantity - reserved_quantity
    min_threshold = Decimal(str(item.min_threshold))
    max_threshold = Decimal(str(item.max_threshold)) if item.max_threshold is not None else None
    alert_level = _determine_alert_level(
        on_hand_quantity=on_hand_quantity,
        available_quantity=available_quantity,
        min_threshold=min_threshold,
        max_threshold=max_threshold,
    )
    stock_value = on_hand_quantity * Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
    suggested_purchase_quantity = _compute_suggested_purchase_quantity(
        available_quantity=available_quantity,
        min_threshold=min_threshold,
        monthly_consumption=monthly_consumption,
    )
    return {
        "item_id": item.id,
        "sku": item.sku,
        "name": item.name,
        "unit": item.unit,
        "category": item.category,
        "location_id": location_id,
        "quantity": _decimal_to_float(on_hand_quantity),
        "on_hand_quantity": _decimal_to_float(on_hand_quantity),
        "reserved_quantity": _decimal_to_float(reserved_quantity),
        "available_quantity": _decimal_to_float(available_quantity),
        "min_threshold": _decimal_to_float(min_threshold),
        "max_threshold": _decimal_to_float(max_threshold) if max_threshold is not None else None,
        "below_threshold": available_quantity <= min_threshold,
        "alert_level": alert_level,
        "stock_value": _decimal_to_float(stock_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        "average_monthly_consumption": _decimal_to_float(monthly_consumption),
        "suggested_purchase_quantity": _decimal_to_float(suggested_purchase_quantity),
    }


def build_movements_query(company_id: int, item_id: int | None = None, location_id: int | None = None, project_id: int | None = None):
    query = StockMovement.query.filter(StockMovement.company_id == company_id)
    if item_id is not None:
        query = query.filter(StockMovement.item_id == item_id)
    if location_id is not None:
        query = query.filter(
            or_(
                StockMovement.from_location_id == location_id,
                StockMovement.to_location_id == location_id,
            )
        )
    if project_id is not None:
        query = query.filter(StockMovement.project_id == project_id)
    return query.order_by(StockMovement.created_at.desc())


def list_movements(company_id: int, item_id: int | None = None, location_id: int | None = None) -> list[dict[str, Any]]:
    return [
        serialize_movement(row)
        for row in build_movements_query(company_id=company_id, item_id=item_id, location_id=location_id).all()
    ]


def build_allocations_query(company_id: int, project_id: int | None = None):
    query = ProjectStockAllocation.query.filter(ProjectStockAllocation.company_id == company_id)
    if project_id is not None:
        query = query.filter(ProjectStockAllocation.project_id == project_id)
    return query.order_by(ProjectStockAllocation.created_at.desc())


def list_allocations(company_id: int, project_id: int | None = None) -> list[dict[str, Any]]:
    return [serialize_allocation(row) for row in build_allocations_query(company_id=company_id, project_id=project_id).all()]


def _create_ledger_movement(
    *,
    company_id: int,
    item_id: int,
    movement_type: str,
    quantity: Decimal,
    performed_by_user_id: int,
    from_location_id: int | None = None,
    to_location_id: int | None = None,
    operation_id: int | None = None,
    operation_line_id: int | None = None,
    project_id: int | None = None,
    task_id: int | None = None,
    reference: str | None = None,
    notes: str | None = None,
    unit_cost: Decimal | None = None,
) -> StockMovement:
    if movement_type not in MOVEMENT_TYPES:
        raise InventoryError("Invalid movement_type", status_code=400)

    anchor_location_id = from_location_id if from_location_id is not None else to_location_id
    stock_before = None
    stock_after = None
    if anchor_location_id is not None:
        before_qty = _compute_location_stock(company_id=company_id, item_id=item_id, location_id=anchor_location_id)
        stock_before = before_qty
        if from_location_id is not None and anchor_location_id == from_location_id:
            stock_after = before_qty - quantity
        else:
            stock_after = before_qty + quantity

    total_cost = None
    if unit_cost is not None:
        total_cost = (quantity * unit_cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    movement = StockMovement(
        company_id=company_id,
        operation_id=operation_id,
        operation_line_id=operation_line_id,
        item_id=item_id,
        from_location_id=from_location_id,
        to_location_id=to_location_id,
        project_id=project_id,
        task_id=task_id,
        movement_type=movement_type,
        quantity=quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        unit_cost=unit_cost,
        total_cost=total_cost,
        performed_by_user_id=performed_by_user_id,
        reference=reference,
        notes=notes,
    )
    db.session.add(movement)
    db.session.flush()
    return movement


def create_movement(company_id: int, performed_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    item_id = payload.get("item_id")
    if item_id is None:
        raise InventoryError("item_id is required", status_code=400)

    movement_type = str(payload.get("movement_type") or "").strip().lower()
    if movement_type not in MOVEMENT_TYPES:
        raise InventoryError("Invalid movement_type", status_code=400)

    item = _require_item(company_id=company_id, item_id=int(item_id))
    _require_user(company_id=company_id, user_id=performed_by_user_id)
    quantity = _as_decimal(payload.get("quantity"), "quantity", positive=True)
    from_location_id = int(payload["from_location_id"]) if payload.get("from_location_id") is not None else None
    to_location_id = int(payload["to_location_id"]) if payload.get("to_location_id") is not None else None
    project_id = int(payload["project_id"]) if payload.get("project_id") is not None else None
    task_id = int(payload["task_id"]) if payload.get("task_id") is not None else None

    if from_location_id is not None:
        _require_location(company_id=company_id, location_id=from_location_id)
    if to_location_id is not None:
        _require_location(company_id=company_id, location_id=to_location_id)
    if project_id is not None:
        _require_project(company_id=company_id, project_id=project_id)
    if task_id is not None:
        _require_task(company_id=company_id, task_id=task_id, project_id=project_id)

    if movement_type == "in" and to_location_id is None:
        raise InventoryError("to_location_id is required for movement_type in", status_code=400)
    if movement_type in {"out", "allocation"} and from_location_id is None:
        raise InventoryError("from_location_id is required for movement_type out/allocation", status_code=400)
    if movement_type == "transfer":
        if from_location_id is None or to_location_id is None:
            raise InventoryError("from_location_id and to_location_id are required for transfer", status_code=400)
        if from_location_id == to_location_id:
            raise InventoryError("from_location_id and to_location_id must differ", status_code=400)

    if movement_type in {"out", "transfer", "allocation"} and from_location_id is not None:
        available_qty = _compute_location_stock(company_id=company_id, item_id=int(item_id), location_id=from_location_id)
        if available_qty < quantity:
            raise InventoryError("Insufficient stock in from location", status_code=400)

    if movement_type == "adjustment" and from_location_id is None and to_location_id is None:
        raise InventoryError("adjustment requires from_location_id or to_location_id", status_code=400)

    unit_cost = _as_decimal(payload.get("unit_cost"), "unit_cost", non_negative=True, allow_none=True)
    if unit_cost is None:
        unit_cost = Decimal(str(item.average_unit_cost or DECIMAL_ZERO))

    if movement_type == "in":
        global_before = _compute_global_stock(company_id=company_id, item_id=int(item_id))
        if quantity > DECIMAL_ZERO:
            new_total_qty = global_before + quantity
            if new_total_qty > DECIMAL_ZERO:
                weighted_total = (global_before * Decimal(str(item.average_unit_cost or DECIMAL_ZERO))) + (quantity * unit_cost)
                item.average_unit_cost = (weighted_total / new_total_qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    movement = _create_ledger_movement(
        company_id=company_id,
        item_id=int(item_id),
        movement_type=movement_type,
        quantity=quantity,
        performed_by_user_id=performed_by_user_id,
        from_location_id=from_location_id,
        to_location_id=to_location_id,
        project_id=project_id,
        task_id=task_id,
        reference=(payload.get("reference") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
        unit_cost=unit_cost,
    )

    if movement_type == "allocation" and project_id is not None:
        allocation = ProjectStockAllocation(
            company_id=company_id,
            project_id=project_id,
            task_id=task_id,
            item_id=int(item_id),
            source_location_id=from_location_id,
            stock_movement_id=movement.id,
            quantity_allocated=quantity,
            allocated_by_user_id=performed_by_user_id,
            responsible_user_id=int(payload["responsible_user_id"]) if payload.get("responsible_user_id") is not None else None,
        )
        db.session.add(allocation)

    log_audit_event(
        module="inventory",
        action="movement.recorded",
        description="Stock movement recorded",
        company_id=company_id,
        actor_user_id=performed_by_user_id,
        target_type="stock_movement",
        target_id=movement.id,
        details={
            "item_id": int(item_id),
            "movement_type": movement_type,
            "quantity": _decimal_to_float(quantity),
            "project_id": project_id,
        },
    )
    db.session.commit()
    return _serialize_movement(movement)


def allocate_stock_to_project(company_id: int, allocated_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    item_id = payload.get("item_id")
    project_id = payload.get("project_id")
    from_location_id = payload.get("from_location_id")
    if item_id is None or project_id is None or from_location_id is None:
        raise InventoryError("item_id, project_id and from_location_id are required", status_code=400)

    quantity = _as_decimal(payload.get("quantity_allocated"), "quantity_allocated", positive=True)
    item = _require_item(company_id=company_id, item_id=int(item_id))
    _require_project(company_id=company_id, project_id=int(project_id))
    _require_location(company_id=company_id, location_id=int(from_location_id))
    _require_user(company_id=company_id, user_id=allocated_by_user_id)
    task_id = int(payload["task_id"]) if payload.get("task_id") is not None else None
    if task_id is not None:
        _require_task(company_id=company_id, task_id=task_id, project_id=int(project_id))

    available_qty = _compute_location_stock(company_id=company_id, item_id=int(item_id), location_id=int(from_location_id))
    if available_qty < quantity:
        raise InventoryError("Insufficient stock in from location", status_code=400)

    movement = _create_ledger_movement(
        company_id=company_id,
        item_id=int(item_id),
        movement_type="allocation",
        quantity=quantity,
        performed_by_user_id=allocated_by_user_id,
        from_location_id=int(from_location_id),
        to_location_id=int(payload["to_location_id"]) if payload.get("to_location_id") is not None else None,
        project_id=int(project_id),
        task_id=task_id,
        reference=(payload.get("reference") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
        unit_cost=Decimal(str(item.average_unit_cost or DECIMAL_ZERO)),
    )

    allocation = ProjectStockAllocation(
        company_id=company_id,
        project_id=int(project_id),
        task_id=task_id,
        item_id=int(item_id),
        source_location_id=int(from_location_id),
        stock_movement_id=movement.id,
        quantity_allocated=quantity,
        allocated_by_user_id=allocated_by_user_id,
        responsible_user_id=int(payload["responsible_user_id"]) if payload.get("responsible_user_id") is not None else None,
    )
    db.session.add(allocation)
    log_audit_event(
        module="inventory",
        action="project.allocation",
        description="Stock allocated to project",
        company_id=company_id,
        actor_user_id=allocated_by_user_id,
        target_type="project_stock_allocation",
        target_id=allocation.id,
        details={
            "project_id": int(project_id),
            "item_id": int(item_id),
            "quantity_allocated": _decimal_to_float(quantity),
        },
    )
    db.session.commit()
    return _serialize_allocation(allocation)


def build_operations_query(
    company_id: int,
    *,
    status: str | None = None,
    operation_kind: str | None = None,
    project_id: int | None = None,
) -> Any:
    query = StockOperation.query.filter(StockOperation.company_id == company_id)
    if status:
        query = query.filter(StockOperation.status == status)
    if operation_kind:
        query = query.filter(StockOperation.operation_kind == operation_kind)
    if project_id is not None:
        query = query.filter(StockOperation.project_id == project_id)
    return query.order_by(StockOperation.operation_date.desc(), StockOperation.created_at.desc())


def list_operations(
    company_id: int,
    *,
    status: str | None = None,
    operation_kind: str | None = None,
    project_id: int | None = None,
) -> list[dict[str, Any]]:
    return [
        _serialize_operation(row)
        for row in build_operations_query(
            company_id=company_id,
            status=status,
            operation_kind=operation_kind,
            project_id=project_id,
        ).all()
    ]


def _apply_operation(operation: StockOperation, *, validated_by_user_id: int) -> StockOperation:
    if operation.status == "validated":
        return operation
    if operation.status != "pending":
        raise InventoryError("Only pending operations can be validated", status_code=400)

    lines = StockOperationLine.query.filter_by(operation_id=operation.id, company_id=operation.company_id).order_by(StockOperationLine.id.asc()).all()
    if not lines:
        raise InventoryError("Operation has no lines", status_code=400)

    if operation.operation_kind == "entry" and operation.destination_location_id is None:
        raise InventoryError("destination_location_id is required for entry operations", status_code=400)
    if operation.operation_kind == "exit" and operation.source_location_id is None:
        raise InventoryError("source_location_id is required for exit operations", status_code=400)
    if operation.operation_kind == "transfer":
        if operation.source_location_id is None or operation.destination_location_id is None:
            raise InventoryError("source_location_id and destination_location_id are required for transfer operations", status_code=400)
        if operation.source_location_id == operation.destination_location_id:
            raise InventoryError("source_location_id and destination_location_id must differ", status_code=400)

    if operation.operation_kind == "exit" and operation.destination_location_id is not None and operation.exit_type != "project_assignment":
        raise InventoryError("destination_location_id is only supported for project_assignment exits", status_code=400)

    for line in lines:
        item = _require_item(company_id=operation.company_id, item_id=line.item_id)
        quantity = Decimal(str(line.quantity))

        if operation.operation_kind == "entry":
            unit_price = (
                Decimal(str(line.unit_price))
                if line.unit_price is not None
                else Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
            )
            global_before = _compute_global_stock(company_id=operation.company_id, item_id=item.id)
            if quantity > DECIMAL_ZERO:
                new_total_quantity = global_before + quantity
                if new_total_quantity > DECIMAL_ZERO:
                    weighted_total = (global_before * Decimal(str(item.average_unit_cost or DECIMAL_ZERO))) + (quantity * unit_price)
                    item.average_unit_cost = (weighted_total / new_total_quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if line.total_amount is None:
                line.total_amount = (quantity * unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            _create_ledger_movement(
                company_id=operation.company_id,
                item_id=item.id,
                movement_type="in",
                quantity=quantity,
                performed_by_user_id=validated_by_user_id,
                to_location_id=operation.destination_location_id,
                operation_id=operation.id,
                operation_line_id=line.id,
                project_id=operation.project_id,
                task_id=operation.task_id,
                reference=operation.reference or operation.delivery_note_number,
                notes=line.notes or operation.notes,
                unit_cost=unit_price,
            )

        elif operation.operation_kind == "exit":
            available_qty = _compute_location_stock(
                company_id=operation.company_id,
                item_id=item.id,
                location_id=int(operation.source_location_id),
            )
            if available_qty < quantity:
                raise InventoryError(f"Insufficient stock for item {item.sku}", status_code=400)
            unit_cost = (
                Decimal(str(line.unit_price))
                if line.unit_price is not None
                else Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
            )
            if line.total_amount is None:
                line.total_amount = (quantity * unit_cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            movement_type = "allocation" if operation.exit_type == "project_assignment" else "out"
            movement = _create_ledger_movement(
                company_id=operation.company_id,
                item_id=item.id,
                movement_type=movement_type,
                quantity=quantity,
                performed_by_user_id=validated_by_user_id,
                from_location_id=operation.source_location_id,
                to_location_id=operation.destination_location_id,
                operation_id=operation.id,
                operation_line_id=line.id,
                project_id=operation.project_id,
                task_id=operation.task_id,
                reference=operation.reference,
                notes=line.notes or operation.notes,
                unit_cost=unit_cost,
            )
            if operation.project_id is not None and operation.exit_type == "project_assignment":
                allocation = ProjectStockAllocation(
                    company_id=operation.company_id,
                    project_id=operation.project_id,
                    task_id=operation.task_id,
                    item_id=item.id,
                    source_location_id=operation.source_location_id,
                    stock_movement_id=movement.id,
                    quantity_allocated=quantity,
                    allocated_by_user_id=validated_by_user_id,
                    responsible_user_id=operation.responsible_user_id,
                )
                db.session.add(allocation)

        elif operation.operation_kind == "transfer":
            available_qty = _compute_location_stock(
                company_id=operation.company_id,
                item_id=item.id,
                location_id=int(operation.source_location_id),
            )
            if available_qty < quantity:
                raise InventoryError(f"Insufficient stock for item {item.sku}", status_code=400)
            unit_cost = (
                Decimal(str(line.unit_price))
                if line.unit_price is not None
                else Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
            )
            if line.total_amount is None:
                line.total_amount = (quantity * unit_cost).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            _create_ledger_movement(
                company_id=operation.company_id,
                item_id=item.id,
                movement_type="transfer",
                quantity=quantity,
                performed_by_user_id=validated_by_user_id,
                from_location_id=operation.source_location_id,
                to_location_id=operation.destination_location_id,
                operation_id=operation.id,
                operation_line_id=line.id,
                project_id=operation.project_id,
                task_id=operation.task_id,
                reference=operation.reference,
                notes=line.notes or operation.notes,
                unit_cost=unit_cost,
            )
        else:
            raise InventoryError("Unsupported operation kind", status_code=400)

    operation.status = "validated"
    operation.validated_by_user_id = validated_by_user_id
    db.session.flush()
    return operation


def create_operation(company_id: int, created_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=created_by_user_id)
    operation_kind = _validate_operation_kind(str(payload.get("operation_kind") or ""))
    lines = _build_operation_line_payloads(payload)
    operation_date = _parse_date(payload.get("operation_date"), "operation_date")
    source_location_id = int(payload["source_location_id"]) if payload.get("source_location_id") is not None else None
    destination_location_id = int(payload["destination_location_id"]) if payload.get("destination_location_id") is not None else None
    project_id = int(payload["project_id"]) if payload.get("project_id") is not None else None
    task_id = int(payload["task_id"]) if payload.get("task_id") is not None else None
    responsible_user_id = int(payload["responsible_user_id"]) if payload.get("responsible_user_id") is not None else None
    requested_by_user_id = int(payload["requested_by_user_id"]) if payload.get("requested_by_user_id") is not None else None
    validate_now = bool(payload.get("validate_now")) if payload.get("validate_now") is not None else operation_kind == "entry"

    if source_location_id is not None:
        _require_location(company_id=company_id, location_id=source_location_id)
    if destination_location_id is not None:
        _require_location(company_id=company_id, location_id=destination_location_id)
    if project_id is not None:
        _require_project(company_id=company_id, project_id=project_id)
    if task_id is not None:
        _require_task(company_id=company_id, task_id=task_id, project_id=project_id)
    if responsible_user_id is not None:
        _require_user(company_id=company_id, user_id=responsible_user_id)
    if requested_by_user_id is not None:
        _require_user(company_id=company_id, user_id=requested_by_user_id)

    entry_type = (payload.get("entry_type") or "").strip().lower() or None
    exit_type = (payload.get("exit_type") or "").strip().lower() or None
    if operation_kind == "entry":
        if entry_type is not None and entry_type not in ENTRY_TYPES:
            raise InventoryError("entry_type is invalid", status_code=400)
        if destination_location_id is None:
            raise InventoryError("destination_location_id is required for entry operations", status_code=400)
    elif operation_kind == "exit":
        if exit_type is None:
            raise InventoryError("exit_type is required for exit operations", status_code=400)
        if exit_type not in EXIT_TYPES:
            raise InventoryError("exit_type is invalid", status_code=400)
        if source_location_id is None:
            raise InventoryError("source_location_id is required for exit operations", status_code=400)
        if exit_type == "project_assignment" and project_id is None:
            raise InventoryError("project_id is required for project_assignment exits", status_code=400)
    elif operation_kind == "transfer":
        if source_location_id is None or destination_location_id is None:
            raise InventoryError("source_location_id and destination_location_id are required for transfer operations", status_code=400)
        if source_location_id == destination_location_id:
            raise InventoryError("source_location_id and destination_location_id must differ", status_code=400)

    operation = StockOperation(
        company_id=company_id,
        operation_kind=operation_kind,
        entry_type=entry_type,
        exit_type=exit_type,
        status="pending",
        operation_date=operation_date,
        source_location_id=source_location_id,
        destination_location_id=destination_location_id,
        supplier_name=(payload.get("supplier_name") or "").strip() or None,
        delivery_note_number=(payload.get("delivery_note_number") or "").strip() or None,
        invoice_reference=(payload.get("invoice_reference") or "").strip() or None,
        project_id=project_id,
        task_id=task_id,
        requested_by_user_id=requested_by_user_id,
        responsible_user_id=responsible_user_id,
        reference=(payload.get("reference") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
    )
    db.session.add(operation)
    db.session.flush()

    for line_payload in lines:
        _require_item(company_id=company_id, item_id=line_payload["item_id"])
        line = StockOperationLine(
            company_id=company_id,
            operation_id=operation.id,
            item_id=line_payload["item_id"],
            quantity=line_payload["quantity"],
            unit_price=line_payload["unit_price"],
            total_amount=line_payload["total_amount"],
            notes=line_payload["notes"],
        )
        db.session.add(line)

    db.session.flush()

    if validate_now:
        operation.status = "pending"
        _apply_operation(operation, validated_by_user_id=created_by_user_id)

    log_audit_event(
        module="inventory",
        action="operation.created",
        description="Stock operation created",
        company_id=company_id,
        actor_user_id=created_by_user_id,
        target_type="stock_operation",
        target_id=operation.id,
        details={
            "operation_kind": operation_kind,
            "status": operation.status,
            "project_id": project_id,
            "line_count": len(lines),
        },
    )
    db.session.commit()
    return _serialize_operation(operation)


def validate_operation(company_id: int, operation_id: int, validated_by_user_id: int) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=validated_by_user_id)
    operation = _require_operation(company_id=company_id, operation_id=operation_id)
    _apply_operation(operation, validated_by_user_id=validated_by_user_id)
    log_audit_event(
        module="inventory",
        action="operation.validated",
        description="Stock operation validated",
        company_id=company_id,
        actor_user_id=validated_by_user_id,
        target_type="stock_operation",
        target_id=operation.id,
        details={
            "operation_kind": operation.operation_kind,
            "status": operation.status,
        },
    )
    db.session.commit()
    return _serialize_operation(operation)


def cancel_operation(company_id: int, operation_id: int, cancelled_by_user_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=cancelled_by_user_id)
    operation = _require_operation(company_id=company_id, operation_id=operation_id)
    if operation.status != "pending":
        raise InventoryError("Only pending operations can be cancelled", status_code=400)
    cancellation_note = ((payload or {}).get("notes") or "").strip() or None
    operation.status = "cancelled"
    if cancellation_note:
        operation.notes = "\n".join(part for part in [operation.notes, f"Annulation: {cancellation_note}"] if part)
    log_audit_event(
        module="inventory",
        action="operation.cancelled",
        description="Stock operation cancelled",
        company_id=company_id,
        actor_user_id=cancelled_by_user_id,
        target_type="stock_operation",
        target_id=operation.id,
        details={"notes": cancellation_note},
    )
    db.session.commit()
    return _serialize_operation(operation)


def build_inventory_sessions_query(company_id: int, status: str | None = None):
    query = StockInventorySession.query.filter(StockInventorySession.company_id == company_id)
    if status:
        query = query.filter(StockInventorySession.status == status)
    return query.order_by(StockInventorySession.inventory_date.desc(), StockInventorySession.created_at.desc())


def list_inventory_sessions(company_id: int, status: str | None = None) -> list[dict[str, Any]]:
    return [serialize_inventory_session(row) for row in build_inventory_sessions_query(company_id=company_id, status=status).all()]


def _apply_inventory_session(session: StockInventorySession, *, validated_by_user_id: int) -> StockInventorySession:
    if session.status == "validated":
        return session
    if session.status != "draft":
        raise InventoryError("Only draft inventory sessions can be validated", status_code=400)

    lines = StockInventoryLine.query.filter_by(session_id=session.id, company_id=session.company_id).order_by(StockInventoryLine.id.asc()).all()
    if not lines:
        raise InventoryError("Inventory session has no lines", status_code=400)

    for line in lines:
        diff = Decimal(str(line.difference_quantity))
        if diff == DECIMAL_ZERO:
            continue
        item = _require_item(company_id=session.company_id, item_id=line.item_id)
        unit_cost = Decimal(str(item.average_unit_cost or DECIMAL_ZERO))
        if diff > DECIMAL_ZERO:
            _create_ledger_movement(
                company_id=session.company_id,
                item_id=line.item_id,
                movement_type="adjustment",
                quantity=diff,
                performed_by_user_id=validated_by_user_id,
                to_location_id=session.location_id,
                reference=session.reference,
                notes=line.observation or session.notes,
                unit_cost=unit_cost,
            )
        else:
            _create_ledger_movement(
                company_id=session.company_id,
                item_id=line.item_id,
                movement_type="adjustment",
                quantity=abs(diff),
                performed_by_user_id=validated_by_user_id,
                from_location_id=session.location_id,
                reference=session.reference,
                notes=line.observation or session.notes,
                unit_cost=unit_cost,
            )

    session.status = "validated"
    session.validated_by_user_id = validated_by_user_id
    db.session.flush()
    return session


def create_inventory_session(company_id: int, responsible_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=responsible_user_id)
    location_id = payload.get("location_id")
    if location_id is None:
        raise InventoryError("location_id is required", status_code=400)
    location = _require_location(company_id=company_id, location_id=int(location_id))

    inventory_type = str(payload.get("inventory_type") or "periodic").strip().lower()
    if inventory_type not in INVENTORY_TYPES:
        raise InventoryError("inventory_type is invalid", status_code=400)

    lines_payload = payload.get("lines") or []
    if not lines_payload:
        raise InventoryError("lines must contain at least one article", status_code=400)

    session = StockInventorySession(
        company_id=company_id,
        location_id=location.id,
        inventory_type=inventory_type,
        status="draft",
        inventory_date=_parse_date(payload.get("inventory_date"), "inventory_date"),
        responsible_user_id=responsible_user_id,
        reference=(payload.get("reference") or "").strip() or None,
        notes=(payload.get("notes") or "").strip() or None,
    )
    db.session.add(session)
    db.session.flush()

    for index, raw_line in enumerate(lines_payload):
        item_id = raw_line.get("item_id")
        if item_id is None:
            raise InventoryError(f"lines[{index}].item_id is required", status_code=400)
        _require_item(company_id=company_id, item_id=int(item_id))
        system_quantity = _compute_location_stock(company_id=company_id, item_id=int(item_id), location_id=location.id)
        counted_quantity = _as_decimal(raw_line.get("counted_quantity"), f"lines[{index}].counted_quantity", non_negative=True)
        line = StockInventoryLine(
            company_id=company_id,
            session_id=session.id,
            item_id=int(item_id),
            system_quantity=system_quantity,
            counted_quantity=counted_quantity,
            difference_quantity=(counted_quantity - system_quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            observation=(raw_line.get("observation") or "").strip() or None,
        )
        db.session.add(line)

    db.session.flush()

    if payload.get("validate_now"):
        _apply_inventory_session(session, validated_by_user_id=responsible_user_id)

    log_audit_event(
        module="inventory",
        action="inventory.created",
        description="Inventory session created",
        company_id=company_id,
        actor_user_id=responsible_user_id,
        target_type="stock_inventory_session",
        target_id=session.id,
        details={
            "location_id": location.id,
            "inventory_type": inventory_type,
            "status": session.status,
        },
    )
    db.session.commit()
    return _serialize_inventory_session(session)


def validate_inventory_session(company_id: int, session_id: int, validated_by_user_id: int) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=validated_by_user_id)
    session = _require_inventory_session(company_id=company_id, session_id=session_id)
    _apply_inventory_session(session, validated_by_user_id=validated_by_user_id)
    log_audit_event(
        module="inventory",
        action="inventory.validated",
        description="Inventory session validated",
        company_id=company_id,
        actor_user_id=validated_by_user_id,
        target_type="stock_inventory_session",
        target_id=session.id,
        details={"status": session.status},
    )
    db.session.commit()
    return _serialize_inventory_session(session)


def list_alerts(company_id: int) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    items = build_items_query(company_id=company_id).all()
    for item in items:
        metrics = _build_item_metrics(company_id=company_id, item=item)
        if metrics["alert_level"] == "normal":
            continue
        severity = "medium"
        message = "Stock level requires attention"
        if metrics["alert_level"] == "out_of_stock":
            severity = "high"
            message = "Rupture de stock detectee"
        elif metrics["alert_level"] in {"critical", "low_stock"}:
            severity = "high" if metrics["alert_level"] == "critical" else "medium"
            message = "Stock faible sous le seuil minimum"
        elif metrics["alert_level"] == "overstock":
            severity = "medium"
            message = "Surstock detecte"
        alerts.append(
            {
                "type": "item_stock",
                "severity": severity,
                "message": message,
                "item_id": item.id,
                "item": {
                    "id": item.id,
                    "sku": item.sku,
                    "name": item.name,
                    "unit": item.unit,
                },
                "metrics": metrics,
            }
        )

    anomaly_operations = (
        StockOperation.query.filter(
            StockOperation.company_id == company_id,
            StockOperation.exit_type.in_(["loss_breakage", "theft_anomaly"]),
            StockOperation.status.in_(["pending", "validated"]),
        )
        .order_by(desc(StockOperation.created_at))
        .limit(10)
        .all()
    )
    for operation in anomaly_operations:
        alerts.append(
            {
                "type": "operation_anomaly",
                "severity": "high" if operation.exit_type == "theft_anomaly" else "medium",
                "message": "Operation sensible a verifier",
                "operation": _serialize_operation(operation),
            }
        )

    discrepancy_rows = (
        db.session.query(StockInventorySession, StockInventoryLine)
        .join(StockInventoryLine, StockInventoryLine.session_id == StockInventorySession.id)
        .filter(
            StockInventorySession.company_id == company_id,
            StockInventoryLine.company_id == company_id,
            StockInventoryLine.difference_quantity != 0,
        )
        .order_by(StockInventorySession.created_at.desc())
        .limit(10)
        .all()
    )
    for session, line in discrepancy_rows:
        item = InventoryItem.query.filter_by(id=line.item_id, company_id=company_id).first()
        alerts.append(
            {
                "type": "inventory_discrepancy",
                "severity": "medium",
                "message": "Ecart d'inventaire detecte",
                "session_id": session.id,
                "item": {
                    "id": item.id if item else line.item_id,
                    "sku": item.sku if item else None,
                    "name": item.name if item else None,
                },
                "difference_quantity": _decimal_to_float(Decimal(str(line.difference_quantity))),
            }
        )

    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda row: severity_order.get(row["severity"], 99))
    return alerts


def get_dashboard(company_id: int) -> dict[str, Any]:
    items = build_items_query(company_id=company_id).all()
    locations = list_locations(company_id=company_id)
    total_value = DECIMAL_ZERO
    critical_count = 0
    suggested_purchases = 0
    for item in items:
        metrics = _build_item_metrics(company_id=company_id, item=item)
        total_value += Decimal(str(metrics["stock_value"] or 0))
        if metrics["is_critical"]:
            critical_count += 1
        if (metrics["suggested_purchase_quantity"] or 0) > 0:
            suggested_purchases += 1

    latest_entries = (
        StockOperation.query.filter(
            StockOperation.company_id == company_id,
            StockOperation.operation_kind == "entry",
        )
        .order_by(desc(StockOperation.operation_date), desc(StockOperation.created_at))
        .limit(5)
        .all()
    )
    latest_exits = (
        StockOperation.query.filter(
            StockOperation.company_id == company_id,
            StockOperation.operation_kind == "exit",
        )
        .order_by(desc(StockOperation.operation_date), desc(StockOperation.created_at))
        .limit(5)
        .all()
    )
    pending_operations = (
        StockOperation.query.filter(
            StockOperation.company_id == company_id,
            StockOperation.status == "pending",
        )
        .order_by(desc(StockOperation.operation_date), desc(StockOperation.created_at))
        .limit(5)
        .all()
    )

    return {
        "summary": {
            "tracked_items": len(items),
            "locations": len(locations),
            "critical_items": critical_count,
            "pending_validations": StockOperation.query.filter_by(company_id=company_id, status="pending").count(),
            "stock_value": _decimal_to_float(total_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "suggested_purchases": suggested_purchases,
        },
        "alerts": list_alerts(company_id=company_id)[:8],
        "latest_entries": [_serialize_operation(row) for row in latest_entries],
        "latest_exits": [_serialize_operation(row) for row in latest_exits],
        "pending_operations": [_serialize_operation(row) for row in pending_operations],
    }


def get_reports_summary(company_id: int) -> dict[str, Any]:
    items = build_items_query(company_id=company_id).all()
    valuation_rows = []
    total_value = DECIMAL_ZERO
    by_category: dict[str, dict[str, Any]] = defaultdict(lambda: {"items": 0, "stock_value": Decimal("0.00")})

    for item in items:
        metrics = _build_item_metrics(company_id=company_id, item=item)
        stock_value = Decimal(str(metrics["stock_value"] or 0))
        total_value += stock_value
        by_category[item.category]["items"] += 1
        by_category[item.category]["stock_value"] += stock_value
        valuation_rows.append(
            {
                "item_id": item.id,
                "sku": item.sku,
                "name": item.name,
                "category": item.category,
                "on_hand_quantity": metrics["on_hand_quantity"],
                "stock_value": metrics["stock_value"],
                "average_monthly_consumption": metrics["average_monthly_consumption"],
            }
        )

    consumption_by_project: dict[int, dict[str, Any]] = {}
    movement_rows = (
        StockMovement.query.filter(
            StockMovement.company_id == company_id,
            StockMovement.project_id.isnot(None),
            StockMovement.movement_type.in_(["allocation", "out"]),
        )
        .order_by(StockMovement.created_at.desc())
        .all()
    )
    for row in movement_rows:
        project = Project.query.filter_by(id=row.project_id, company_id=company_id).first()
        if project is None:
            continue
        bucket = consumption_by_project.setdefault(
            project.id,
            {
                "project_id": project.id,
                "project_code": project.code,
                "project_name": project.name,
                "total_quantity": 0.0,
                "total_cost": 0.0,
            },
        )
        bucket["total_quantity"] += float(row.quantity)
        bucket["total_cost"] += float(row.total_cost or 0)

    loss_operations = (
        StockOperation.query.filter(
            StockOperation.company_id == company_id,
            StockOperation.exit_type.in_(["loss_breakage", "theft_anomaly"]),
            StockOperation.status == "validated",
        )
        .order_by(desc(StockOperation.created_at))
        .all()
    )

    return {
        "stock_state": {
            "tracked_items": len(items),
            "total_stock_value": _decimal_to_float(total_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
            "by_category": [
                {
                    "category": category,
                    "items": values["items"],
                    "stock_value": _decimal_to_float(values["stock_value"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
                }
                for category, values in by_category.items()
            ],
        },
        "valuation": sorted(valuation_rows, key=lambda row: row["stock_value"] or 0, reverse=True),
        "consumption_by_project": sorted(
            consumption_by_project.values(),
            key=lambda row: row["total_cost"],
            reverse=True,
        ),
        "losses_and_anomalies": [_serialize_operation(operation) for operation in loss_operations],
        "inventories": list_inventory_sessions(company_id=company_id)[:10],
    }


def get_support_data(company_id: int) -> dict[str, Any]:
    projects = (
        Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None))
        .order_by(Project.name.asc())
        .all()
    )
    tasks = (
        ProjectTask.query.filter(ProjectTask.company_id == company_id, ProjectTask.deleted_at.is_(None))
        .order_by(ProjectTask.title.asc())
        .all()
    )
    users = (
        User.query.filter(
            User.company_id == company_id,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
        )
        .order_by(User.first_name.asc(), User.last_name.asc())
        .all()
    )
    return {
        "locations": list_locations(company_id=company_id),
        "items": list_items(company_id=company_id),
        "projects": [_serialize_project_summary(row) for row in projects],
        "tasks": [_serialize_task_summary(row) for row in tasks],
        "users": [_serialize_user_summary(row) for row in users],
        "enums": {
            "location_types": sorted(LOCATION_TYPES),
            "item_categories": sorted(ITEM_CATEGORIES),
            "operation_kinds": sorted(OPERATION_KINDS),
            "entry_types": sorted(ENTRY_TYPES),
            "exit_types": sorted(EXIT_TYPES),
            "inventory_types": sorted(INVENTORY_TYPES),
            "operation_statuses": sorted(OPERATION_STATUSES),
            "inventory_statuses": sorted(INVENTORY_STATUSES),
        },
    }


def build_activity_query(company_id: int):
    return AuditLog.query.filter(
        AuditLog.company_id == company_id,
        AuditLog.module == "inventory",
    ).order_by(AuditLog.created_at.desc())


def list_activity(company_id: int) -> list[dict[str, Any]]:
    return [serialize_audit_log(row) for row in build_activity_query(company_id=company_id).all()]


def register_mobile_scan(company_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _require_user(company_id=company_id, user_id=actor_user_id)
    scanned_value = str(payload.get("scanned_value") or "").strip()
    if not scanned_value:
        raise InventoryError("scanned_value is required", status_code=400)

    matched_item_id = payload.get("matched_item_id")
    matched_item = None
    if matched_item_id is not None:
        matched_item = _require_item(company_id=company_id, item_id=int(matched_item_id))

    audit_row = log_audit_event(
        module="inventory",
        action="mobile_scan.logged",
        description="Mobile stock scan captured",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="inventory_item" if matched_item is not None else "inventory_scan",
        target_id=matched_item.id if matched_item is not None else None,
        details={
            "scanned_value": scanned_value,
            "matched_item_id": matched_item.id if matched_item is not None else None,
            "matched_item_name": payload.get("matched_item_name") or (matched_item.name if matched_item is not None else None),
            "scan_target": payload.get("scan_target") or "lookup",
            "scan_mode": payload.get("scan_mode") or "manual",
            "captured_at": payload.get("captured_at"),
            "device_label": payload.get("device_label"),
            "notes": payload.get("notes"),
            "offline_action_id": payload.get("offline_action_id"),
            "synced_from_offline": bool(payload.get("synced_from_offline")),
        },
    )
    db.session.commit()
    return serialize_audit_log(audit_row)


# ---------------------------------------------------------------------------
# Supply request helpers
# ---------------------------------------------------------------------------

def _serialize_supply_request(row: StockSupplyRequest) -> dict[str, Any]:
    item = InventoryItem.query.filter_by(id=row.item_id, company_id=row.company_id).first()
    requester = User.query.filter_by(id=row.requester_user_id).first()
    assignee = User.query.filter_by(id=row.assignee_user_id).first() if row.assignee_user_id else None
    transmitted_to = User.query.filter_by(id=row.transmitted_to_user_id).first() if row.transmitted_to_user_id else None
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "item_id": row.item_id,
        "item": _serialize_item(item) if item else None,
        "requested_quantity": _decimal_to_float(Decimal(str(row.requested_quantity))),
        "reason": row.reason,
        "urgency": row.urgency,
        "status": row.status,
        "requester_user_id": row.requester_user_id,
        "requester": _serialize_user_summary(requester),
        "assignee_user_id": row.assignee_user_id,
        "assignee": _serialize_user_summary(assignee),
        "transmitted_to_user_id": row.transmitted_to_user_id,
        "transmitted_to": _serialize_user_summary(transmitted_to),
        "notes": row.notes,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def serialize_supply_request(row: StockSupplyRequest) -> dict[str, Any]:
    return _serialize_supply_request(row)


def build_supply_requests_query(company_id: int, project_id: int | None = None, status: str | None = None):
    query = StockSupplyRequest.query.filter(StockSupplyRequest.company_id == company_id)
    if project_id is not None:
        query = query.filter(StockSupplyRequest.project_id == project_id)
    if status is not None:
        query = query.filter(StockSupplyRequest.status == status)
    return query.order_by(StockSupplyRequest.created_at.desc())


def create_supply_request(company_id: int, requester_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    item_id = payload.get("item_id")
    project_id = payload.get("project_id")
    if item_id is None or project_id is None:
        raise InventoryError("item_id and project_id are required", status_code=400)
    quantity = _as_decimal(payload.get("requested_quantity"), "requested_quantity", positive=True)
    _require_item(company_id=company_id, item_id=int(item_id))
    _require_project(company_id=company_id, project_id=int(project_id))
    _require_user(company_id=company_id, user_id=requester_user_id)
    assignee_user_id = int(payload["assignee_user_id"]) if payload.get("assignee_user_id") is not None else None
    row = StockSupplyRequest(
        company_id=company_id,
        project_id=int(project_id),
        item_id=int(item_id),
        requested_quantity=quantity,
        reason=(payload.get("reason") or "").strip() or None,
        urgency=payload.get("urgency") or "normal",
        status="pending",
        requester_user_id=requester_user_id,
        assignee_user_id=assignee_user_id,
        notes=(payload.get("notes") or "").strip() or None,
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_supply_request(row)


def update_supply_request(company_id: int, request_id: int, actor_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = StockSupplyRequest.query.filter_by(id=request_id, company_id=company_id).first()
    if row is None:
        raise InventoryError("Supply request not found", status_code=404)
    new_status = payload.get("status")
    if new_status:
        row.status = new_status
    if payload.get("transmitted_to_user_id") is not None:
        row.transmitted_to_user_id = int(payload["transmitted_to_user_id"])
        row.status = "transmitted"
    extra_notes = (payload.get("notes") or "").strip()
    if extra_notes:
        row.notes = extra_notes
    db.session.commit()
    return _serialize_supply_request(row)
