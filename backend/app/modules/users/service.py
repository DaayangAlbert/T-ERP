from __future__ import annotations

from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_, func, or_

from app.core.audit import log_audit_event, serialize_audit_log
from app.core.file_storage import get_stored_file_name
from app.core.default_profiles import ensure_company_admin_role, ensure_default_global_profiles
from app.core.operational_profiles import (
    OPERATIONAL_PROFILE_TEMPLATES,
    get_operational_profile_template,
    infer_operational_profile_code,
    list_operational_access_matrix,
    list_operational_profile_templates,
    list_operational_role_interactions,
)
from app.extensions import db
from app.models.admin import AuditLog, CompanySubscription
from app.models.attendance import AttendanceRecord
from app.models.company import Company
from app.models.finance import FinanceEntry, Invoice
from app.models.inventory import InventoryItem, StockMovement
from app.models.payroll import EmployeePayrollProfile, PayrollLeaveRequest, PayrollRunItem
from app.models.personnel import OrganizationUnit, OrganizationUnitAssignment
from app.models.project import Project, ProjectAssignment
from app.models.user import Permission, Role, RolePermission, User, UserRole
from app.modules.auth.service import hash_password


TERMINAL_PROJECT_STATUSES = {"completed", "final_acceptance", "archived", "cancelled"}
HR_DASHBOARD_LOOKBACK_DAYS = 30
PENDING_LEAVE_REQUEST_STATUSES = {"submitted", "received", "in_review", "processing"}
ATTENDANCE_LEAVE_SYNC_NOTE_PREFIX = "payroll_leave_request:"


def _serialize_project_spotlight_row(project: Project, today: date) -> dict[str, Any]:
    status = str(project.status or "").strip().lower() or "planned"
    progress = float(project.progress_percent or 0)
    budget = float(project.budget_amount or 0)
    is_terminal = status in TERMINAL_PROJECT_STATUSES
    is_delayed = bool(project.end_date and project.end_date < today and not is_terminal)

    days_to_deadline = None
    if project.end_date:
        days_to_deadline = (project.end_date - today).days

    return {
        "id": project.id,
        "code": project.code,
        "name": project.name,
        "status": status,
        "progress_percent": round(progress, 2),
        "budget_amount": round(budget, 2),
        "end_date": project.end_date.isoformat() if project.end_date else None,
        "days_to_deadline": days_to_deadline,
        "is_delayed": is_delayed,
    }


def _serialize_user_project_assignments(company_id: int, user_id: int) -> list[dict[str, Any]]:
    rows = (
        db.session.query(ProjectAssignment, Project)
        .join(Project, Project.id == ProjectAssignment.project_id)
        .filter(
            ProjectAssignment.company_id == company_id,
            ProjectAssignment.user_id == user_id,
            ProjectAssignment.is_active.is_(True),
            Project.deleted_at.is_(None),
        )
        .order_by(Project.status.asc(), Project.end_date.asc().nullslast(), Project.name.asc())
        .all()
    )

    return [
        {
            "id": assignment.id,
            "project_id": project.id,
            "project_code": project.code,
            "project_name": project.name,
            "project_status": project.status,
            "project_role": assignment.project_role,
            "responsibility": assignment.responsibility,
            "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
            "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
        }
        for assignment, project in rows
    ]


def _project_priority_sort_key(project: Project, today: date) -> tuple[int, int, int, int, str]:
    status = str(project.status or "").strip().lower()
    progress = float(project.progress_percent or 0)
    is_terminal = status in TERMINAL_PROJECT_STATUSES
    delayed_days = 0
    days_to_deadline = 9999

    if project.end_date:
        days_to_deadline = (project.end_date - today).days
        delayed_days = max(-days_to_deadline, 0)

    return (
        1 if delayed_days > 0 and not is_terminal else 0,
        delayed_days,
        1 if status in {"in_progress", "planned", "on_hold", "suspended"} else 0,
        int(max(0, 100 - progress)),
        str(project.name or "").lower(),
    )


class UserManagementError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str | None = None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def _require_fields(payload: dict[str, Any], fields: list[str]) -> None:
    for field in fields:
        value = payload.get(field)
        if value is None or str(value).strip() == "":
            raise UserManagementError(f"Missing field: {field}", status_code=400)


def _serialize_user_roles(company_id: int, user_id: int) -> list[dict[str, Any]]:
    rows = (
        db.session.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id, UserRole.company_id == company_id)
        .order_by(Role.name.asc())
        .all()
    )
    return [
        {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "company_id": row.company_id,
        }
        for row in rows
    ]


def _serialize_role_permissions(role_id: int) -> list[str]:
    rows = (
        db.session.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == role_id)
        .all()
    )
    return sorted([row.code for row in rows])


def _serialize_role(role: Role) -> dict[str, Any]:
    return {
        "id": role.id,
        "name": role.name,
        "code": role.code,
        "description": role.description,
        "is_system": role.is_system,
        "company_id": role.company_id,
        "permissions": _serialize_role_permissions(role.id),
    }


def _ensure_global_roles_ready() -> None:
    ensure_default_global_profiles()
    db.session.commit()


def _serialize_organization_unit(unit: OrganizationUnit | None) -> dict[str, Any] | None:
    if unit is None:
        return None

    return {
        "id": unit.id,
        "company_id": unit.company_id,
        "parent_unit_id": unit.parent_unit_id,
        "manager_user_id": unit.manager_user_id,
        "code": unit.code,
        "name": unit.name,
        "unit_type": unit.unit_type,
        "description": unit.description,
        "hierarchy_level": unit.hierarchy_level,
        "sort_order": unit.sort_order,
        "is_active": unit.is_active,
    }


def _build_organization_tree(units: list[OrganizationUnit]) -> list[dict[str, Any]]:
    nodes = {
        unit.id: {
            **(_serialize_organization_unit(unit) or {}),
            "children": [],
        }
        for unit in units
    }
    roots: list[dict[str, Any]] = []

    for unit in units:
        node = nodes[unit.id]
        if unit.parent_unit_id and unit.parent_unit_id in nodes:
            nodes[unit.parent_unit_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


def _build_organization_tree_from_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    nodes = {item["id"]: {**item, "children": []} for item in items}
    roots: list[dict[str, Any]] = []

    for item in items:
        node = nodes[item["id"]]
        parent_unit_id = item.get("parent_unit_id")
        if parent_unit_id and parent_unit_id in nodes:
            nodes[parent_unit_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


def _load_organization_units_by_codes(company_id: int, unit_codes: list[str]) -> dict[str, OrganizationUnit]:
    if not unit_codes:
        return {}

    rows = (
        OrganizationUnit.query.filter(
            OrganizationUnit.company_id == company_id,
            func.lower(OrganizationUnit.code).in_([code.lower() for code in unit_codes]),
        )
        .order_by(OrganizationUnit.hierarchy_level.asc(), OrganizationUnit.sort_order.asc(), OrganizationUnit.name.asc())
        .all()
    )
    return {row.code.lower(): row for row in rows}


def _organization_unit_specs_from_profiles() -> list[dict[str, Any]]:
    specs: dict[str, dict[str, Any]] = {}
    for template in OPERATIONAL_PROFILE_TEMPLATES:
        assignment = dict(template.get("default_assignment") or {})
        code = str(assignment.get("unit_code") or "").strip().upper()
        name = str(assignment.get("unit_name") or assignment.get("department") or "").strip()
        if not code or not name:
            continue

        specs[code] = {
            "code": code,
            "name": name,
            "unit_type": str(assignment.get("unit_type") or "service").strip() or "service",
            "description": assignment.get("unit_description"),
            "hierarchy_level": int(assignment.get("unit_hierarchy_level") or assignment.get("hierarchy_level") or 1),
            "parent_unit_code": str(assignment.get("parent_unit_code") or "").strip().upper() or None,
            "sort_order": int(assignment.get("unit_sort_order") or 0),
        }

    return sorted(
        specs.values(),
        key=lambda row: (row["hierarchy_level"], 0 if row["parent_unit_code"] is None else 1, row["name"]),
    )


def _upsert_organization_unit(company_id: int, spec: dict[str, Any], units_by_code: dict[str, OrganizationUnit]) -> OrganizationUnit:
    normalized_code = spec["code"].lower()
    row = units_by_code.get(normalized_code)
    parent_unit = units_by_code.get((spec.get("parent_unit_code") or "").lower()) if spec.get("parent_unit_code") else None

    if row is None:
        row = OrganizationUnit(
            company_id=company_id,
            code=spec["code"],
            name=spec["name"],
            unit_type=spec["unit_type"],
            description=spec.get("description"),
            hierarchy_level=spec["hierarchy_level"],
            sort_order=spec.get("sort_order", 0),
            is_active=True,
            parent_unit_id=parent_unit.id if parent_unit else None,
        )
        db.session.add(row)
        db.session.flush()
        units_by_code[normalized_code] = row
        return row

    row.name = spec["name"]
    row.unit_type = spec["unit_type"]
    row.description = spec.get("description")
    row.hierarchy_level = spec["hierarchy_level"]
    row.sort_order = spec.get("sort_order", 0)
    row.parent_unit_id = parent_unit.id if parent_unit else None
    if row.is_active is None:
        row.is_active = True
    db.session.flush()
    units_by_code[normalized_code] = row
    return row


def _ensure_default_organization_units(company_id: int) -> dict[str, OrganizationUnit]:
    specs = _organization_unit_specs_from_profiles()
    units_by_code = _load_organization_units_by_codes(company_id, [spec["code"] for spec in specs])
    pending = list(specs)
    guard = len(pending) + 2

    while pending and guard > 0:
        next_round: list[dict[str, Any]] = []
        progress = False

        for spec in pending:
            parent_code = spec.get("parent_unit_code")
            if parent_code and parent_code.lower() not in units_by_code:
                next_round.append(spec)
                continue

            _upsert_organization_unit(company_id, spec, units_by_code)
            progress = True

        if not progress:
            raise UserManagementError("Unable to resolve organization unit hierarchy", status_code=500)

        pending = next_round
        guard -= 1

    return units_by_code


def _get_organization_unit(company_id: int, organization_unit_id: int | None) -> OrganizationUnit | None:
    if organization_unit_id is None:
        return None

    row = OrganizationUnit.query.filter_by(id=organization_unit_id, company_id=company_id).first()
    if row is None:
        raise UserManagementError("Organization unit not found in company", status_code=404)
    return row


def _validate_organization_unit_uniqueness(
    company_id: int,
    *,
    code: str | None = None,
    name: str | None = None,
    parent_unit_id: int | None = None,
    exclude_unit_id: int | None = None,
) -> None:
    query = OrganizationUnit.query.filter(OrganizationUnit.company_id == company_id)
    if exclude_unit_id is not None:
        query = query.filter(OrganizationUnit.id != exclude_unit_id)

    if code:
        exists = query.filter(func.lower(OrganizationUnit.code) == code.lower()).first()
        if exists:
            raise UserManagementError("Organization unit code already exists in this company", status_code=409)

    if name:
        exists = query.filter(
            func.lower(OrganizationUnit.name) == name.lower(),
            OrganizationUnit.parent_unit_id == parent_unit_id,
        ).first()
        if exists:
            raise UserManagementError("Organization unit name already exists at this level", status_code=409)


def _serialize_primary_organization_assignment(company_id: int | None, user_id: int) -> dict[str, Any] | None:
    if company_id is None:
        return None

    row = (
        db.session.query(OrganizationUnitAssignment, OrganizationUnit)
        .join(OrganizationUnit, OrganizationUnit.id == OrganizationUnitAssignment.organization_unit_id)
        .filter(
            OrganizationUnitAssignment.company_id == company_id,
            OrganizationUnitAssignment.user_id == user_id,
            OrganizationUnitAssignment.is_primary.is_(True),
            OrganizationUnitAssignment.is_active.is_(True),
        )
        .order_by(OrganizationUnitAssignment.updated_at.desc(), OrganizationUnitAssignment.id.desc())
        .first()
    )
    if row is None:
        return None

    assignment, unit = row
    return {
        "id": assignment.id,
        "organization_unit_id": assignment.organization_unit_id,
        "assignment_title": assignment.assignment_title,
        "is_primary": assignment.is_primary,
        "starts_on": assignment.starts_on.isoformat() if assignment.starts_on else None,
        "ends_on": assignment.ends_on.isoformat() if assignment.ends_on else None,
        "is_active": assignment.is_active,
        "organization_unit": _serialize_organization_unit(unit),
    }


def _sync_primary_organization_assignment(
    company_id: int,
    user_id: int,
    organization_unit_id: int | None,
    *,
    assignment_title: str | None = None,
) -> dict[str, Any] | None:
    rows = OrganizationUnitAssignment.query.filter_by(company_id=company_id, user_id=user_id).all()
    target_assignment = None
    target_unit = None

    if organization_unit_id is not None:
        target_unit = _get_organization_unit(company_id, organization_unit_id)

    for row in rows:
        is_target = organization_unit_id is not None and row.organization_unit_id == organization_unit_id
        row.is_primary = is_target
        row.is_active = is_target
        if is_target:
            target_assignment = row

    if organization_unit_id is None:
        return None

    if target_assignment is None:
        target_assignment = OrganizationUnitAssignment(
            company_id=company_id,
            organization_unit_id=organization_unit_id,
            user_id=user_id,
            assignment_title=assignment_title,
            is_primary=True,
            is_active=True,
        )
        db.session.add(target_assignment)
    else:
        target_assignment.assignment_title = assignment_title
        target_assignment.is_primary = True
        target_assignment.is_active = True

    db.session.flush()
    return {
        "id": target_assignment.id,
        "organization_unit_id": target_assignment.organization_unit_id,
        "assignment_title": target_assignment.assignment_title,
        "is_primary": target_assignment.is_primary,
        "starts_on": target_assignment.starts_on.isoformat() if target_assignment.starts_on else None,
        "ends_on": target_assignment.ends_on.isoformat() if target_assignment.ends_on else None,
        "is_active": target_assignment.is_active,
        "organization_unit": _serialize_organization_unit(target_unit),
    }


def _get_company_user(company_id: int, user_id: int | None) -> User | None:
    if user_id is None:
        return None

    row = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if row is None:
        raise UserManagementError("User not found in company", status_code=404)
    return row


def _load_roles_by_codes(company_id: int, role_codes: list[str]) -> dict[str, Role]:
    if not role_codes:
        return {}

    rows = (
        Role.query.filter(
            Role.code.in_(role_codes),
            or_(Role.company_id == company_id, Role.company_id.is_(None)),
        )
        .order_by(Role.name.asc())
        .all()
    )

    selected: dict[str, Role] = {}
    for row in rows:
        existing = selected.get(row.code)
        if existing is None or (existing.company_id is None and row.company_id == company_id):
            selected[row.code] = row

    return selected


def _resolve_operational_profile_defaults(
    company_id: int,
    profile_code: str | None,
    *,
    existing_user_type: str | None = None,
) -> dict[str, Any] | None:
    template = get_operational_profile_template(profile_code)
    if template is None:
        if profile_code:
            raise UserManagementError("Unknown operational_profile_code", status_code=400)
        return None

    _ensure_global_roles_ready()
    assignment = dict(template.get("default_assignment") or {})
    default_role_codes = list(assignment.get("default_role_codes") or [])
    roles_by_code = _load_roles_by_codes(company_id, default_role_codes)
    missing_codes = [code for code in default_role_codes if code not in roles_by_code]
    if missing_codes:
        raise UserManagementError(
            f"Operational profile roles are unavailable: {', '.join(missing_codes)}",
            status_code=503,
        )

    expected_user_type = str(assignment.get("user_type") or "employee").strip()
    current_user_type = str(existing_user_type or "").strip() or None
    if current_user_type and current_user_type != expected_user_type:
        raise UserManagementError(
            f"operational_profile_code '{template['code']}' requires user_type '{expected_user_type}'",
            status_code=400,
        )

    organization_unit_id = None
    organization_unit_payload = None
    unit_code = str(assignment.get("unit_code") or "").strip().lower()
    if unit_code:
        units_by_code = _ensure_default_organization_units(company_id)
        organization_unit = units_by_code.get(unit_code)
        if organization_unit is None:
            raise UserManagementError(
                f"Operational profile organization unit is unavailable: {assignment.get('unit_code')}",
                status_code=503,
            )
        organization_unit_id = organization_unit.id
        organization_unit_payload = _serialize_organization_unit(organization_unit)

    return {
        "code": template["code"],
        "name": template["name"],
        "user_type": expected_user_type,
        "job_title": assignment.get("job_title"),
        "department": assignment.get("department"),
        "hierarchy_level": assignment.get("hierarchy_level"),
        "role_ids": [roles_by_code[code].id for code in default_role_codes],
        "organization_unit_id": organization_unit_id,
        "organization_unit": organization_unit_payload,
    }


def _apply_operational_profile_defaults(
    company_id: int,
    payload: dict[str, Any],
    *,
    existing_user_type: str | None = None,
) -> dict[str, Any] | None:
    profile = _resolve_operational_profile_defaults(
        company_id,
        payload.get("operational_profile_code"),
        existing_user_type=payload.get("user_type") or existing_user_type,
    )
    if profile is None:
        return None

    if not payload.get("user_type"):
        payload["user_type"] = profile["user_type"]
    if not (payload.get("job_title") or "").strip():
        payload["job_title"] = profile["job_title"]
    if not (payload.get("department") or "").strip():
        payload["department"] = profile["department"]
    if payload.get("hierarchy_level") is None:
        payload["hierarchy_level"] = profile["hierarchy_level"]
    if not payload.get("role_ids"):
        payload["role_ids"] = list(profile["role_ids"])
    if payload.get("organization_unit_id") is None and profile.get("organization_unit_id") is not None:
        payload["organization_unit_id"] = profile["organization_unit_id"]

    return profile


def _is_account_active(status: str) -> bool:
    return status == "active"


def _normalize_user_status(payload: dict[str, Any]) -> str:
    status = str(payload.get("account_status") or "").strip().lower()
    if not status:
        is_active = bool(payload.get("is_active", True))
        return "active" if is_active else "inactive"
    if status not in {"active", "inactive", "suspended", "archived", "locked", "exited"}:
        raise UserManagementError("Invalid account_status", status_code=400)
    return status


def _validate_unique_user_fields(company_id: int, *, email: str | None = None, login_identifier: str | None = None, employee_number: str | None = None, exclude_user_id: int | None = None) -> None:
    query = User.query.filter(User.company_id == company_id, User.deleted_at.is_(None))
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)

    if email:
        exists = query.filter(func.lower(User.email) == email.lower()).first()
        if exists:
            raise UserManagementError("User email already exists in this company", status_code=409)

    if login_identifier:
        exists = query.filter(func.lower(User.login_identifier) == login_identifier.lower()).first()
        if exists:
            raise UserManagementError("Login identifier already exists in this company", status_code=409)

    if employee_number:
        exists = query.filter(func.lower(User.employee_number) == employee_number.lower()).first()
        if exists:
            raise UserManagementError("Employee number already exists in this company", status_code=409)


def _infer_operational_profile_code(
    roles: list[dict[str, Any]],
    *,
    job_title: str | None = None,
    department: str | None = None,
) -> str | None:
    return infer_operational_profile_code(
        role_codes=[str(role.get("code") or "").strip().lower() for role in roles],
        job_title=job_title,
        department=department,
    )


def serialize_user(user: User) -> dict[str, Any]:
    roles = _serialize_user_roles(user.company_id, user.id) if user.company_id else []
    organization_assignment = _serialize_primary_organization_assignment(user.company_id, user.id)
    return {
        "id": user.id,
        "company_id": user.company_id,
        "full_name": f"{user.first_name} {user.last_name}".strip(),
        "login_identifier": user.login_identifier,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "gender": user.gender,
        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
        "address_line": user.address_line,
        "job_title": user.job_title,
        "department": user.department,
        "employee_number": user.employee_number,
        "hire_date": user.hire_date.isoformat() if user.hire_date else None,
        "contract_type": user.contract_type,
        "base_salary": float(user.base_salary or 0) if user.base_salary is not None else None,
        "profile_photo_url": user.profile_photo_url,
        "identity_document_type": user.identity_document_type,
        "identity_document_number": user.identity_document_number,
        "identity_issue_date": user.identity_issue_date.isoformat() if user.identity_issue_date else None,
        "identity_document_url": user.identity_document_url,
        "taxpayer_number": user.taxpayer_number,
        "cv_url": user.cv_url,
        "hierarchy_level": user.hierarchy_level,
        "user_type": user.user_type,
        "preferred_language": user.preferred_language,
        "account_status": user.account_status,
        "is_active": user.is_active,
        "must_change_password": user.must_change_password,
        "is_primary_admin": user.is_primary_admin,
        "locked_until": user.locked_until.isoformat() if user.locked_until else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "last_password_reset_at": user.last_password_reset_at.isoformat() if user.last_password_reset_at else None,
        "chat_notifications_enabled": user.chat_notifications_enabled,
        "payslip_notifications_enabled": user.payslip_notifications_enabled,
        "last_seen_payslip_at": user.last_seen_payslip_at.isoformat() if user.last_seen_payslip_at else None,
        "employment_end_date": user.employment_end_date.isoformat() if user.employment_end_date else None,
        "exit_reason": user.exit_reason,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "operational_profile_code": _infer_operational_profile_code(
            roles,
            job_title=user.job_title,
            department=user.department,
        ),
        "organization_assignment": organization_assignment,
        "organization_unit_id": organization_assignment["organization_unit_id"] if organization_assignment else None,
        "organization_unit": organization_assignment["organization_unit"] if organization_assignment else None,
        "project_assignments": _serialize_user_project_assignments(user.company_id, user.id) if user.company_id else [],
        "roles": roles,
    }


def _normalize_filter_value(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _apply_exact_ci_filter(query, column, value: str | None):
    normalized = _normalize_filter_value(value)
    if normalized is None:
        return query
    return query.filter(func.lower(column) == normalized.lower())


def build_users_query(
    company_id: int,
    include_inactive: bool = False,
    *,
    search: str | None = None,
    department: str | None = None,
    contract_type: str | None = None,
    account_status: str | None = None,
    user_type: str | None = None,
    hierarchy_level: int | None = None,
    organization_unit_id: int | None = None,
):
    query = User.query.filter(User.company_id == company_id, User.deleted_at.is_(None))

    normalized_search = _normalize_filter_value(search)
    if normalized_search is not None:
        pattern = f"%{normalized_search.lower()}%"
        query = query.filter(
            or_(
                func.lower(User.first_name).like(pattern),
                func.lower(User.last_name).like(pattern),
                func.lower(User.email).like(pattern),
                func.lower(func.coalesce(User.login_identifier, "")).like(pattern),
                func.lower(func.coalesce(User.employee_number, "")).like(pattern),
                func.lower(func.coalesce(User.job_title, "")).like(pattern),
                func.lower(func.coalesce(User.department, "")).like(pattern),
            )
        )

    query = _apply_exact_ci_filter(query, User.department, department)
    query = _apply_exact_ci_filter(query, User.contract_type, contract_type)
    query = _apply_exact_ci_filter(query, User.user_type, user_type)

    normalized_status = _normalize_filter_value(account_status)
    if normalized_status is not None:
        query = query.filter(func.lower(User.account_status) == normalized_status.lower())
    elif not include_inactive:
        query = query.filter(User.account_status == "active", User.is_active.is_(True))

    if hierarchy_level is not None:
        query = query.filter(User.hierarchy_level == hierarchy_level)

    if organization_unit_id is not None:
        query = query.join(
            OrganizationUnitAssignment,
            and_(
                OrganizationUnitAssignment.user_id == User.id,
                OrganizationUnitAssignment.company_id == company_id,
                OrganizationUnitAssignment.is_primary.is_(True),
                OrganizationUnitAssignment.is_active.is_(True),
            ),
        ).filter(OrganizationUnitAssignment.organization_unit_id == organization_unit_id)

    return query.order_by(
        User.is_primary_admin.desc(),
        func.lower(func.coalesce(User.department, "")),
        func.lower(User.last_name),
        func.lower(User.first_name),
    )


def list_users(company_id: int, include_inactive: bool = False) -> list[dict[str, Any]]:
    return [serialize_user(user) for user in build_users_query(company_id=company_id, include_inactive=include_inactive).all()]


def _serialize_self_service_payroll_profile(company_id: int | None, user_id: int) -> dict[str, Any]:
    if company_id is None:
        return {
            "cnps_number": None,
            "bank_account_number": None,
            "bank_name": None,
            "payment_method": "bank_transfer",
        }

    profile = EmployeePayrollProfile.query.filter_by(company_id=company_id, user_id=user_id).first()
    return {
        "cnps_number": profile.cnps_number if profile else None,
        "bank_account_number": profile.bank_account_number if profile else None,
        "bank_name": profile.bank_domiciliation if profile else None,
        "payment_method": profile.payment_method if profile and profile.payment_method else "bank_transfer",
    }


def _serialize_self_service_uploads(user: User) -> dict[str, Any]:
    assets = {
        "profile_photo": user.profile_photo_url,
        "identity_document": user.identity_document_url,
        "cv": user.cv_url,
    }

    return {
        key: {
            "available": bool(stored_path),
            "filename": get_stored_file_name(stored_path),
            "download_url": f"/api/v1/users/me/profile/assets/{key}" if stored_path else None,
        }
        for key, stored_path in assets.items()
    }


def _conversation_notification_title(conversation: dict[str, Any], *, user_id: int) -> str:
    if str(conversation.get("type") or "").strip().lower() == "group":
        return str(conversation.get("title") or "").strip() or f"Groupe #{conversation['id']}"

    participants = conversation.get("participants") or []
    target = next((participant for participant in participants if participant.get("id") != user_id), None)
    if target is not None:
        return str(target.get("display_name") or target.get("email") or "").strip() or f"Conversation #{conversation['id']}"
    return str(conversation.get("title") or "").strip() or f"Conversation #{conversation['id']}"


def _build_self_service_notifications(user: User) -> dict[str, Any]:
    chat_items: list[dict[str, Any]] = []
    payslip_items: list[dict[str, Any]] = []
    chat_total_unread = 0
    payslip_new_count = 0

    if user.company_id is not None:
        from app.modules.chat.service import list_user_conversations

        unread_conversations = [
            conversation
            for conversation in list_user_conversations(company_id=user.company_id, user_id=user.id)
            if int(conversation.get("unread_count") or 0) > 0
        ]
        chat_total_unread = sum(int(conversation.get("unread_count") or 0) for conversation in unread_conversations)
        chat_items = [
            {
                "kind": "chat_message",
                "conversation_id": conversation["id"],
                "title": _conversation_notification_title(conversation, user_id=user.id),
                "description": f"{int(conversation.get('unread_count') or 0)} message(s) non lu(s)",
                "count": int(conversation.get("unread_count") or 0),
                "created_at": conversation.get("last_message", {}).get("created_at"),
                "link": "/app/chat",
            }
            for conversation in unread_conversations
        ]

        payslips_query = PayrollRunItem.query.filter(
            PayrollRunItem.company_id == user.company_id,
            PayrollRunItem.user_id == user.id,
            PayrollRunItem.pdf_path.isnot(None),
        )
        if user.last_seen_payslip_at is None:
            payslip_new_count = payslips_query.count()
        else:
            payslip_new_count = payslips_query.filter(PayrollRunItem.created_at > user.last_seen_payslip_at).count()

        payslip_rows = (
            payslips_query
            .order_by(PayrollRunItem.created_at.desc(), PayrollRunItem.id.desc())
            .limit(5)
            .all()
        )
        payslip_items = [
            {
                "kind": "payslip",
                "payslip_id": row.id,
                "title": f"Bulletin {row.period_key}",
                "description": row.employee_name,
                "count": 1,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "period_key": row.period_key,
                "link": "/app/payroll",
            }
            for row in payslip_rows
            if user.last_seen_payslip_at is None or (row.created_at and row.created_at > user.last_seen_payslip_at)
        ]

    items = sorted(
        [*chat_items, *payslip_items],
        key=lambda item: str(item.get("created_at") or ""),
        reverse=True,
    )

    return {
        "chat": {
            "enabled": bool(user.chat_notifications_enabled),
            "total_unread": chat_total_unread,
            "items": chat_items[:5],
        },
        "payslips": {
            "enabled": bool(user.payslip_notifications_enabled),
            "new_count": payslip_new_count,
            "last_seen_at": user.last_seen_payslip_at.isoformat() if user.last_seen_payslip_at else None,
            "items": payslip_items[:5],
        },
        "total_active": (
            (chat_total_unread if user.chat_notifications_enabled else 0)
            + (payslip_new_count if user.payslip_notifications_enabled else 0)
        ),
        "items": items[:8],
    }


def get_my_profile_settings(*, user_id: int) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found", status_code=404)

    return {
        "company_id": user.company_id,
        "user": serialize_user(user),
        "payroll_profile": _serialize_self_service_payroll_profile(user.company_id, user.id),
        "uploads": _serialize_self_service_uploads(user),
        "notifications": _build_self_service_notifications(user),
    }


def update_my_profile_settings(*, user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found", status_code=404)

    company_id = user.company_id
    if user.user_type == "company_admin":
        forbidden_fields = [
            field
            for field in ("cnps_number", "bank_account_number", "bank_name", "payment_method")
            if field in payload
        ]
        if forbidden_fields:
            raise UserManagementError(
                "These fields are not editable for company_admin: " + ", ".join(sorted(forbidden_fields)),
                status_code=400,
            )

    user_payload_keys = {
        "first_name",
        "last_name",
        "phone",
        "gender",
        "birth_date",
        "address_line",
        "preferred_language",
        "profile_photo_url",
        "identity_document_type",
        "identity_document_number",
        "identity_issue_date",
        "identity_document_url",
        "taxpayer_number",
        "cv_url",
        "chat_notifications_enabled",
        "payslip_notifications_enabled",
    }
    user_payload = {key: payload[key] for key in user_payload_keys if key in payload}

    if user_payload:
        update_user(
            company_id=company_id,
            user_id=user.id,
            payload=user_payload,
            actor_user_id=user.id,
        )

    payroll_payload: dict[str, Any] = {}
    if "cnps_number" in payload:
        payroll_payload["cnps_number"] = payload.get("cnps_number")
    if "bank_account_number" in payload:
        payroll_payload["bank_account_number"] = payload.get("bank_account_number")
    if "bank_name" in payload:
        payroll_payload["bank_domiciliation"] = payload.get("bank_name")
    if "payment_method" in payload:
        payroll_payload["payment_method"] = payload.get("payment_method")

    if company_id is not None and payroll_payload:
        from app.modules.payroll.service import upsert_payroll_employee_profile

        upsert_payroll_employee_profile(
            company_id=company_id,
            user_id=user.id,
            payload=payroll_payload,
            actor_user_id=user.id,
        )

    refreshed_user = User.query.filter_by(id=user.id).filter(User.deleted_at.is_(None)).first()
    if refreshed_user is None:
        raise UserManagementError("User not found", status_code=404)

    return {
        "company_id": refreshed_user.company_id,
        "user": serialize_user(refreshed_user),
        "payroll_profile": _serialize_self_service_payroll_profile(refreshed_user.company_id, refreshed_user.id),
        "uploads": _serialize_self_service_uploads(refreshed_user),
        "notifications": _build_self_service_notifications(refreshed_user),
    }


def get_my_notifications(*, user_id: int) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found", status_code=404)
    return _build_self_service_notifications(user)


def mark_my_notifications_seen(*, user_id: int, categories: list[str]) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found", status_code=404)

    normalized_categories = {str(category or "").strip().lower() for category in categories}
    updated_categories: list[str] = []

    if "payslips" in normalized_categories:
        latest_row = None
        if user.company_id is not None:
            latest_row = (
                db.session.query(PayrollRunItem.created_at)
                .filter(
                    PayrollRunItem.company_id == user.company_id,
                    PayrollRunItem.user_id == user.id,
                    PayrollRunItem.pdf_path.isnot(None),
                )
                .order_by(PayrollRunItem.created_at.desc(), PayrollRunItem.id.desc())
                .first()
            )
        latest_created_at = latest_row[0] if latest_row is not None else None
        user.last_seen_payslip_at = latest_created_at or datetime.now(timezone.utc)
        updated_categories.append("payslips")

    if updated_categories:
        log_audit_event(
            module="users",
            action="notification_seen",
            company_id=user.company_id,
            actor_user_id=user.id,
            target_type="user",
            target_id=user.id,
            description="User notification counters updated",
            details={"categories": updated_categories},
        )
        db.session.commit()

    return _build_self_service_notifications(user)


def _get_role_rows(company_id: int, role_ids: list[int]) -> list[Role]:
    roles = Role.query.filter(Role.id.in_(role_ids)).all()
    if len(roles) != len(set(role_ids)):
        raise UserManagementError("One or more roles do not exist", status_code=404)

    for role in roles:
        if role.company_id not in (None, company_id):
            raise UserManagementError("Role does not belong to this company", status_code=403)

    return roles


def _replace_primary_admin(company_id: int, user_id: int | None = None) -> None:
    rows = User.query.filter_by(company_id=company_id, is_primary_admin=True).all()
    for row in rows:
        row.is_primary_admin = row.id == user_id


def _assign_roles_internal(company_id: int, user_id: int, role_ids: list[int], *, replace: bool) -> list[dict[str, Any]]:
    if replace:
        UserRole.query.filter_by(user_id=user_id, company_id=company_id).delete()

    if role_ids:
        roles = _get_role_rows(company_id, role_ids)
        for role in roles:
            exists = UserRole.query.filter_by(user_id=user_id, role_id=role.id, company_id=company_id).first()
            if exists is None:
                db.session.add(UserRole(user_id=user_id, role_id=role.id, company_id=company_id))

    db.session.flush()
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    return _serialize_user_roles(company_id, user.id) if user else []


def create_user(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    payload = dict(payload)
    required_fields = ["email", "password", "first_name", "last_name", "user_type"]
    _require_fields(payload, required_fields)

    email = payload["email"].strip().lower()
    login_identifier = (payload.get("login_identifier") or email).strip().lower()
    preferred_language = str(payload.get("preferred_language") or "fr").strip().lower()
    if preferred_language not in ("fr", "en"):
        raise UserManagementError("preferred_language must be fr or en", status_code=400)

    user_type = payload["user_type"].strip()
    allowed_user_types = {"company_admin", "employee", "external_controller", "job_seeker"}
    if user_type not in allowed_user_types:
        raise UserManagementError("Invalid user_type for company user creation", status_code=400)

    employee_number = (payload.get("employee_number") or "").strip() or None
    _validate_unique_user_fields(
        company_id,
        email=email,
        login_identifier=login_identifier,
        employee_number=employee_number,
    )

    account_status = _normalize_user_status(payload)
    is_primary_admin = bool(payload.get("is_primary_admin", False))
    if is_primary_admin and user_type != "company_admin":
        raise UserManagementError("Primary admin must have user_type company_admin", status_code=400)

    _apply_operational_profile_defaults(company_id, payload)
    role_ids = payload.get("role_ids") or []
    if user_type == "company_admin" and not role_ids:
        role, _ = ensure_company_admin_role(company_id)
        role_ids = [role.id]

    organization_unit = _get_organization_unit(company_id, payload.get("organization_unit_id"))
    department_name = (payload.get("department") or "").strip() or None
    if organization_unit is not None and not department_name:
        department_name = organization_unit.name

    user = User(
        company_id=company_id,
        login_identifier=login_identifier,
        email=email,
        password_hash=hash_password(payload["password"]),
        first_name=payload["first_name"].strip(),
        last_name=payload["last_name"].strip(),
        phone=(payload.get("phone") or "").strip() or None,
        gender=(payload.get("gender") or "").strip() or None,
        birth_date=payload.get("birth_date"),
        address_line=(payload.get("address_line") or "").strip() or None,
        job_title=(payload.get("job_title") or "").strip() or None,
        department=department_name,
        employee_number=employee_number,
        hire_date=payload.get("hire_date"),
        contract_type=(payload.get("contract_type") or "").strip() or None,
        base_salary=payload.get("base_salary"),
        profile_photo_url=(payload.get("profile_photo_url") or "").strip() or None,
        identity_document_type=(payload.get("identity_document_type") or "").strip() or None,
        identity_document_number=(payload.get("identity_document_number") or "").strip() or None,
        identity_issue_date=payload.get("identity_issue_date"),
        identity_document_url=(payload.get("identity_document_url") or "").strip() or None,
        taxpayer_number=(payload.get("taxpayer_number") or "").strip() or None,
        cv_url=(payload.get("cv_url") or "").strip() or None,
        hierarchy_level=payload.get("hierarchy_level"),
        preferred_language=preferred_language,
        user_type=user_type,
        account_status=account_status,
        is_active=_is_account_active(account_status),
        must_change_password=bool(payload.get("must_change_password", False)),
        is_primary_admin=is_primary_admin,
        chat_notifications_enabled=bool(payload.get("chat_notifications_enabled", True)),
        payslip_notifications_enabled=bool(payload.get("payslip_notifications_enabled", True)),
    )
    db.session.add(user)
    db.session.flush()

    if is_primary_admin:
        _replace_primary_admin(company_id, user.id)

    assigned_roles = _assign_roles_internal(company_id, user.id, role_ids, replace=True)
    assignment = _sync_primary_organization_assignment(
        company_id,
        user.id,
        organization_unit.id if organization_unit else None,
        assignment_title=user.job_title,
    )
    if assignment and user.department != assignment["organization_unit"]["name"]:
        user.department = assignment["organization_unit"]["name"]
    log_audit_event(
        module="users",
        action="user_created",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="Company user created",
        details={"user_type": user.user_type, "roles": [role["code"] for role in assigned_roles]},
    )
    db.session.commit()
    return serialize_user(user)


def list_roles(company_id: int) -> list[dict[str, Any]]:
    _ensure_global_roles_ready()
    roles = Role.query.filter((Role.company_id == company_id) | (Role.company_id.is_(None))).order_by(Role.name.asc()).all()

    return [_serialize_role(role) for role in roles]


def list_operational_profiles(company_id: int) -> dict[str, Any]:
    _ensure_global_roles_ready()
    units_by_code = _ensure_default_organization_units(company_id)
    db.session.commit()

    templates = list_operational_profile_templates()
    role_codes: list[str] = []
    for template in templates:
        assignment = template.get("default_assignment") or {}
        for code in [
            *(assignment.get("default_role_codes") or []),
            *(assignment.get("related_role_codes") or []),
        ]:
            if code not in role_codes:
                role_codes.append(code)

    roles_by_code = _load_roles_by_codes(company_id, role_codes)
    items = []
    for template in templates:
        assignment = dict(template.get("default_assignment") or {})
        default_role_codes = list(assignment.get("default_role_codes") or [])
        related_role_codes = list(assignment.get("related_role_codes") or [])
        organization_unit = None
        organization_unit_id = None
        unit_code = str(assignment.get("unit_code") or "").strip().lower()
        if unit_code:
            organization_unit_row = units_by_code.get(unit_code)
            if organization_unit_row is not None:
                organization_unit = _serialize_organization_unit(organization_unit_row)
                organization_unit_id = organization_unit_row.id
        linked_roles = []
        for code in [*default_role_codes, *related_role_codes]:
            role = roles_by_code.get(code)
            if role is None:
                continue
            linked_roles.append(_serialize_role(role))

        items.append(
            {
                **template,
                "default_assignment": {
                    **assignment,
                    "organization_unit_id": organization_unit_id,
                    "organization_unit": organization_unit,
                },
                "default_organization_unit_id": organization_unit_id,
                "default_organization_unit": organization_unit,
                "default_role_ids": [roles_by_code[code].id for code in default_role_codes if code in roles_by_code],
                "linked_roles": linked_roles,
            }
        )

    return {
        "items": items,
        "count": len(items),
        "interactions": list_operational_role_interactions(),
        "access_matrix": list_operational_access_matrix(),
    }


def list_organization_units(company_id: int, *, active_only: bool = False) -> dict[str, Any]:
    _ensure_default_organization_units(company_id)
    db.session.commit()

    query = OrganizationUnit.query.filter_by(company_id=company_id)
    if active_only:
        query = query.filter(OrganizationUnit.is_active.is_(True))

    units = (
        query.order_by(
            OrganizationUnit.hierarchy_level.asc(),
            OrganizationUnit.sort_order.asc(),
            func.lower(OrganizationUnit.name),
        ).all()
    )

    headcount_rows = (
        db.session.query(
            OrganizationUnitAssignment.organization_unit_id,
            func.count(OrganizationUnitAssignment.id).label("headcount"),
        )
        .filter(
            OrganizationUnitAssignment.company_id == company_id,
            OrganizationUnitAssignment.is_active.is_(True),
        )
        .group_by(OrganizationUnitAssignment.organization_unit_id)
        .all()
    )
    headcount_by_unit = {row.organization_unit_id: int(row.headcount or 0) for row in headcount_rows}
    parent_map = {unit.id: unit for unit in units}

    items = []
    for unit in units:
        items.append(
            {
                **(_serialize_organization_unit(unit) or {}),
                "headcount": headcount_by_unit.get(unit.id, 0),
                "parent_unit": _serialize_organization_unit(parent_map.get(unit.parent_unit_id)),
            }
        )

    return {
        "items": items,
        "tree": _build_organization_tree_from_items(items),
        "count": len(items),
    }


def create_organization_unit(company_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    payload = dict(payload)
    _require_fields(payload, ["code", "name"])

    code = payload["code"].strip().upper()
    name = payload["name"].strip()
    unit_type = str(payload.get("unit_type") or "service").strip().lower() or "service"
    if unit_type not in {"directorate", "department", "service", "team"}:
        raise UserManagementError("Invalid organization unit type", status_code=400)

    parent_unit = _get_organization_unit(company_id, payload.get("parent_unit_id"))
    manager_user = _get_company_user(company_id, payload.get("manager_user_id"))
    hierarchy_level = payload.get("hierarchy_level")
    if hierarchy_level is None:
        hierarchy_level = (parent_unit.hierarchy_level + 1) if parent_unit else 1

    _validate_organization_unit_uniqueness(
        company_id,
        code=code,
        name=name,
        parent_unit_id=parent_unit.id if parent_unit else None,
    )

    unit = OrganizationUnit(
        company_id=company_id,
        parent_unit_id=parent_unit.id if parent_unit else None,
        manager_user_id=manager_user.id if manager_user else None,
        code=code,
        name=name,
        unit_type=unit_type,
        description=(payload.get("description") or "").strip() or None,
        hierarchy_level=hierarchy_level,
        sort_order=int(payload.get("sort_order") or 0),
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(unit)
    db.session.flush()

    log_audit_event(
        module="users",
        action="organization_unit_created",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="organization_unit",
        target_id=unit.id,
        description="Organization unit created",
        details={"code": unit.code, "name": unit.name, "unit_type": unit.unit_type},
    )
    db.session.commit()
    return {
        **(_serialize_organization_unit(unit) or {}),
        "headcount": 0,
        "parent_unit": _serialize_organization_unit(parent_unit),
    }


def update_organization_unit(
    company_id: int,
    organization_unit_id: int,
    payload: dict[str, Any],
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    payload = dict(payload)
    unit = _get_organization_unit(company_id, organization_unit_id)
    if unit is None:
        raise UserManagementError("Organization unit not found in company", status_code=404)

    next_parent_unit = unit.parent_unit_id
    parent_unit = _get_organization_unit(company_id, payload.get("parent_unit_id")) if "parent_unit_id" in payload else _get_organization_unit(company_id, unit.parent_unit_id)
    if parent_unit and parent_unit.id == unit.id:
        raise UserManagementError("An organization unit cannot be its own parent", status_code=400)

    current_parent = parent_unit
    while current_parent is not None:
        if current_parent.id == unit.id:
            raise UserManagementError("Organization unit hierarchy cannot contain cycles", status_code=400)
        current_parent = _get_organization_unit(company_id, current_parent.parent_unit_id)

    if parent_unit is not None:
        next_parent_unit = parent_unit.id
    elif "parent_unit_id" in payload:
        next_parent_unit = None

    next_code = payload["code"].strip().upper() if "code" in payload else unit.code
    next_name = payload["name"].strip() if "name" in payload else unit.name
    _validate_organization_unit_uniqueness(
        company_id,
        code=next_code if next_code.lower() != unit.code.lower() else None,
        name=next_name if next_name.lower() != unit.name.lower() or next_parent_unit != unit.parent_unit_id else None,
        parent_unit_id=next_parent_unit,
        exclude_unit_id=unit.id,
    )

    if "manager_user_id" in payload:
        manager_user = _get_company_user(company_id, payload.get("manager_user_id"))
        unit.manager_user_id = manager_user.id if manager_user else None
    if "code" in payload:
        unit.code = next_code
    if "name" in payload:
        unit.name = next_name
    if "unit_type" in payload:
        unit.unit_type = payload["unit_type"].strip().lower()
    if "description" in payload:
        unit.description = (payload["description"] or "").strip() or None
    if "parent_unit_id" in payload:
        unit.parent_unit_id = next_parent_unit
    if "hierarchy_level" in payload:
        unit.hierarchy_level = payload.get("hierarchy_level") or unit.hierarchy_level
    elif "parent_unit_id" in payload and parent_unit is not None:
        unit.hierarchy_level = parent_unit.hierarchy_level + 1
    if "sort_order" in payload:
        unit.sort_order = int(payload.get("sort_order") or 0)
    if "is_active" in payload:
        unit.is_active = bool(payload["is_active"])

    if "name" in payload:
        assigned_users = (
            db.session.query(User)
            .join(
                OrganizationUnitAssignment,
                and_(
                    OrganizationUnitAssignment.user_id == User.id,
                    OrganizationUnitAssignment.company_id == company_id,
                    OrganizationUnitAssignment.organization_unit_id == unit.id,
                    OrganizationUnitAssignment.is_primary.is_(True),
                    OrganizationUnitAssignment.is_active.is_(True),
                ),
            )
            .filter(User.company_id == company_id, User.deleted_at.is_(None))
            .all()
        )
        for assigned_user in assigned_users:
            assigned_user.department = unit.name

    db.session.flush()
    active_assignment_count = (
        OrganizationUnitAssignment.query.filter_by(
            company_id=company_id,
            organization_unit_id=unit.id,
            is_active=True,
        ).count()
    )
    log_audit_event(
        module="users",
        action="organization_unit_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="organization_unit",
        target_id=unit.id,
        description="Organization unit updated",
        details={"updated_fields": sorted(payload.keys())},
    )
    db.session.commit()
    return {
        **(_serialize_organization_unit(unit) or {}),
        "headcount": active_assignment_count,
        "parent_unit": _serialize_organization_unit(parent_unit if unit.parent_unit_id else None),
    }


def create_role(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    required_fields = ["name", "code", "permissions"]
    _require_fields(payload, required_fields)

    code = payload["code"].strip().lower()
    name = payload["name"].strip()
    permissions = payload.get("permissions")

    if not isinstance(permissions, list) or len(permissions) == 0:
        raise UserManagementError("permissions must be a non-empty list", status_code=400)

    existing = Role.query.filter_by(company_id=company_id, code=code).first()
    if existing:
        raise UserManagementError("Role code already exists in this company", status_code=409)

    permission_rows = Permission.query.filter(Permission.code.in_(permissions)).all()
    found_codes = {p.code for p in permission_rows}
    missing_codes = [code_item for code_item in permissions if code_item not in found_codes]
    if missing_codes:
        raise UserManagementError(f"Unknown permissions: {', '.join(missing_codes)}", status_code=400)

    role = Role(
        company_id=company_id,
        name=name,
        code=code,
        description=(payload.get("description") or "").strip() or None,
        is_system=False,
    )
    db.session.add(role)
    db.session.flush()

    for permission in permission_rows:
        db.session.add(RolePermission(role_id=role.id, permission_id=permission.id))

    db.session.commit()

    return {
        "id": role.id,
        "name": role.name,
        "code": role.code,
        "description": role.description,
        "company_id": role.company_id,
        "permissions": sorted(list(found_codes)),
    }


def assign_roles(company_id: int, user_id: int, role_ids: list[int], replace: bool = False, actor_user_id: int | None = None) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    if not isinstance(role_ids, list) or len(role_ids) == 0:
        raise UserManagementError("role_ids must be a non-empty list", status_code=400)

    assigned_roles = _assign_roles_internal(company_id, user.id, role_ids, replace=replace)
    log_audit_event(
        module="users",
        action="roles_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="User roles updated",
        details={"roles": [role["code"] for role in assigned_roles], "replace": replace},
    )
    db.session.commit()

    return {
        "user_id": user.id,
        "company_id": company_id,
        "roles": assigned_roles,
    }


def update_user(company_id: int, user_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    payload = dict(payload)
    user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    next_email = payload.get("email")
    next_login_identifier = payload.get("login_identifier")
    next_employee_number = payload.get("employee_number")
    _validate_unique_user_fields(
        company_id,
        email=next_email.strip().lower() if next_email else None,
        login_identifier=next_login_identifier.strip().lower() if next_login_identifier else None,
        employee_number=next_employee_number.strip() if next_employee_number else None,
        exclude_user_id=user.id,
    )

    _apply_operational_profile_defaults(company_id, payload, existing_user_type=user.user_type)
    organization_unit = _get_organization_unit(company_id, payload.get("organization_unit_id")) if "organization_unit_id" in payload else None

    if "email" in payload:
        user.email = payload["email"].strip().lower()
    if "first_name" in payload:
        user.first_name = payload["first_name"].strip()
    if "last_name" in payload:
        user.last_name = payload["last_name"].strip()
    if "login_identifier" in payload:
        user.login_identifier = (payload["login_identifier"] or "").strip().lower() or user.email
    if "phone" in payload:
        user.phone = (payload["phone"] or "").strip() or None
    if "preferred_language" in payload:
        user.preferred_language = payload["preferred_language"].strip().lower()
    if "user_type" in payload:
        user.user_type = payload["user_type"].strip()
    if "gender" in payload:
        user.gender = (payload["gender"] or "").strip() or None
    if "birth_date" in payload:
        user.birth_date = payload.get("birth_date")
    if "address_line" in payload:
        user.address_line = (payload["address_line"] or "").strip() or None
    if "job_title" in payload:
        user.job_title = (payload["job_title"] or "").strip() or None
    if "department" in payload:
        user.department = (payload["department"] or "").strip() or None
    if "employee_number" in payload:
        user.employee_number = (payload["employee_number"] or "").strip() or None
    if "hire_date" in payload:
        user.hire_date = payload.get("hire_date")
    if "contract_type" in payload:
        user.contract_type = (payload["contract_type"] or "").strip() or None
    if "base_salary" in payload:
        user.base_salary = payload.get("base_salary")
    if "profile_photo_url" in payload:
        user.profile_photo_url = (payload["profile_photo_url"] or "").strip() or None
    if "identity_document_type" in payload:
        user.identity_document_type = (payload["identity_document_type"] or "").strip() or None
    if "identity_document_number" in payload:
        user.identity_document_number = (payload["identity_document_number"] or "").strip() or None
    if "identity_issue_date" in payload:
        user.identity_issue_date = payload.get("identity_issue_date")
    if "identity_document_url" in payload:
        user.identity_document_url = (payload["identity_document_url"] or "").strip() or None
    if "taxpayer_number" in payload:
        user.taxpayer_number = (payload["taxpayer_number"] or "").strip() or None
    if "cv_url" in payload:
        user.cv_url = (payload["cv_url"] or "").strip() or None
    if "hierarchy_level" in payload:
        user.hierarchy_level = payload.get("hierarchy_level")
    if "employment_end_date" in payload:
        user.employment_end_date = payload.get("employment_end_date")
    if "exit_reason" in payload:
        user.exit_reason = (payload["exit_reason"] or "").strip() or None
    if "chat_notifications_enabled" in payload:
        user.chat_notifications_enabled = bool(payload["chat_notifications_enabled"])
    if "payslip_notifications_enabled" in payload:
        user.payslip_notifications_enabled = bool(payload["payslip_notifications_enabled"])
    if "account_status" in payload:
        user.account_status = payload["account_status"].strip().lower()
        user.is_active = _is_account_active(user.account_status)
        if user.account_status != "active":
            user.auth_token_version = int(user.auth_token_version or 1) + 1
    if "must_change_password" in payload:
        user.must_change_password = bool(payload["must_change_password"])
    if "is_primary_admin" in payload:
        if payload["is_primary_admin"] and user.user_type != "company_admin":
            raise UserManagementError("Primary admin must have user_type company_admin", status_code=400)
        user.is_primary_admin = bool(payload["is_primary_admin"])
        if user.is_primary_admin:
            _replace_primary_admin(company_id, user.id)

    if "role_ids" in payload and payload["role_ids"] is not None:
        _assign_roles_internal(company_id, user.id, payload["role_ids"], replace=True)

    if "organization_unit_id" in payload:
        assignment = _sync_primary_organization_assignment(
            company_id,
            user.id,
            organization_unit.id if organization_unit else None,
            assignment_title=user.job_title,
        )
        if assignment is not None and ("department" not in payload or not (payload.get("department") or "").strip()):
            user.department = assignment["organization_unit"]["name"]
        if assignment is None and "department" not in payload:
            user.department = None

    log_audit_event(
        module="users",
        action="user_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="User profile updated",
        details={"updated_fields": sorted(list(payload.keys()))},
    )
    db.session.commit()
    return serialize_user(user)


def update_user_status(company_id: int, user_id: int, payload: dict[str, Any], actor_user_id: int | None = None) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    status = payload["account_status"].strip().lower()
    if status not in {"active", "inactive", "suspended", "archived", "locked", "exited"}:
        raise UserManagementError("Invalid account_status", status_code=400)

    user.account_status = status
    user.is_active = _is_account_active(status)
    user.locked_until = payload.get("locked_until") if status == "locked" else None
    if status in {"archived", "suspended", "locked", "exited", "inactive"}:
        user.auth_token_version = int(user.auth_token_version or 1) + 1
    if status == "archived":
        user.deleted_at = datetime.now(timezone.utc)
    if status == "exited":
        user.employment_end_date = payload.get("employment_end_date")
        user.exit_reason = (payload.get("reason") or "").strip() or None

    log_audit_event(
        module="security",
        action="user_status_updated",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="User status updated",
        details={"account_status": status, "reason": payload.get("reason")},
    )
    db.session.commit()
    return serialize_user(user)


def reset_user_password(
    company_id: int,
    user_id: int,
    *,
    new_password: str,
    must_change_password: bool = True,
    actor_user_id: int | None = None,
) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    user.password_hash = hash_password(new_password)
    user.must_change_password = must_change_password
    user.last_password_reset_at = datetime.now(timezone.utc)
    user.locked_until = None
    user.auth_token_version = int(user.auth_token_version or 1) + 1

    log_audit_event(
        module="security",
        action="password_reset",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="User password reset",
        details={"must_change_password": must_change_password},
    )
    db.session.commit()
    return serialize_user(user)


def force_logout_user(company_id: int, user_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
    user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    user.auth_token_version = int(user.auth_token_version or 1) + 1
    log_audit_event(
        module="security",
        action="force_logout",
        company_id=company_id,
        actor_user_id=actor_user_id,
        target_type="user",
        target_id=user.id,
        description="User sessions revoked",
    )
    db.session.commit()
    return serialize_user(user)


def list_activity_logs(company_id: int, user_id: int | None = None, limit: int = 50) -> dict[str, Any]:
    query = AuditLog.query.filter(AuditLog.company_id == company_id)
    if user_id is not None:
        query = query.filter(
            or_(
                AuditLog.actor_user_id == user_id,
                and_(AuditLog.target_type == "user", AuditLog.target_id == user_id),
            )
        )

    rows = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).all()
    return {"items": [serialize_audit_log(row) for row in rows], "count": len(rows)}


def _compute_low_stock_count(company_id: int) -> int:
    items = InventoryItem.query.filter(InventoryItem.company_id == company_id, InventoryItem.deleted_at.is_(None)).all()
    if not items:
        return 0

    qty_by_item: dict[int, float] = {item.id: 0.0 for item in items}
    movements = StockMovement.query.filter_by(company_id=company_id).all()
    for movement in movements:
        quantity = float(movement.quantity or 0)
        if movement.movement_type == "in":
            qty_by_item[movement.item_id] = qty_by_item.get(movement.item_id, 0.0) + quantity
        elif movement.movement_type in {"out", "allocation"}:
            qty_by_item[movement.item_id] = qty_by_item.get(movement.item_id, 0.0) - quantity
        elif movement.movement_type == "adjustment":
            qty_by_item[movement.item_id] = qty_by_item.get(movement.item_id, 0.0) + quantity

    return sum(1 for item in items if qty_by_item.get(item.id, 0.0) < float(item.min_threshold or 0))


def _build_counter(users: list[User], getter) -> dict[str, int]:
    counter = Counter()
    for user in users:
        value = getter(user)
        normalized = str(value or "").strip()
        if normalized:
            counter[normalized] += 1
    return dict(counter.most_common())


def _is_leave_synced_attendance_note(notes: str | None) -> bool:
    return str(notes or "").startswith(ATTENDANCE_LEAVE_SYNC_NOTE_PREFIX)


def _build_attendance_dashboard_summary(company_id: int, *, today: date) -> dict[str, Any]:
    window_start = today - timedelta(days=max(HR_DASHBOARD_LOOKBACK_DAYS - 1, 0))
    rows = (
        AttendanceRecord.query.filter(
            AttendanceRecord.company_id == company_id,
            AttendanceRecord.attendance_date >= window_start,
            AttendanceRecord.attendance_date <= today,
        )
        .order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.id.desc())
        .all()
    )

    counts = {"present": 0, "late": 0, "absent": 0, "overtime": 0}
    late_minutes_total = 0
    overtime_minutes_total = 0
    unjustified_absent_records = 0

    for row in rows:
        counts[row.status] = counts.get(row.status, 0) + 1
        late_minutes_total += int(row.minutes_late or 0)
        overtime_minutes_total += int(row.overtime_minutes or 0)
        if row.status == "absent" and not _is_leave_synced_attendance_note(row.notes):
            unjustified_absent_records += 1

    return {
        "lookback_days": HR_DASHBOARD_LOOKBACK_DAYS,
        "window_start": window_start.isoformat(),
        "window_end": today.isoformat(),
        "tracked_records": len(rows),
        "employees_tracked": len({row.user_id for row in rows}),
        "present_records": counts["present"],
        "late_records": counts["late"],
        "absent_records": counts["absent"],
        "unjustified_absent_records": unjustified_absent_records,
        "overtime_records": counts["overtime"],
        "late_minutes_total": late_minutes_total,
        "overtime_minutes_total": overtime_minutes_total,
    }


def _build_leave_requests_dashboard_summary(company_id: int, *, today: date) -> dict[str, Any]:
    window_start = today - timedelta(days=max(HR_DASHBOARD_LOOKBACK_DAYS - 1, 0))
    pending_rows = (
        PayrollLeaveRequest.query.filter(
            PayrollLeaveRequest.company_id == company_id,
            PayrollLeaveRequest.status.in_(tuple(PENDING_LEAVE_REQUEST_STATUSES)),
        )
        .order_by(PayrollLeaveRequest.start_date.asc(), PayrollLeaveRequest.id.asc())
        .all()
    )
    approved_recent_rows = (
        PayrollLeaveRequest.query.filter(
            PayrollLeaveRequest.company_id == company_id,
            PayrollLeaveRequest.status.in_(("approved", "resolved")),
        )
        .order_by(PayrollLeaveRequest.reviewed_at.desc(), PayrollLeaveRequest.id.desc())
        .all()
    )

    pending_by_type = Counter(str(row.type or "").strip() or "paid_leave" for row in pending_rows)
    approved_last_30d = sum(
        1
        for row in approved_recent_rows
        if row.reviewed_at is not None and window_start <= row.reviewed_at.date() <= today
    )

    return {
        "lookback_days": HR_DASHBOARD_LOOKBACK_DAYS,
        "pending_requests": len(pending_rows),
        "pending_days_total": round(sum(float(row.days_requested or 0) for row in pending_rows), 2),
        "pending_by_type": dict(pending_by_type),
        "approved_last_30d": approved_last_30d,
    }


def get_company_dashboard(company_id: int) -> dict[str, Any]:
    company = Company.query.filter_by(id=company_id).first()
    if company is None:
        raise UserManagementError("Company not found", status_code=404)

    users = User.query.filter(User.company_id == company_id, User.deleted_at.is_(None)).all()
    total_users = len(users)
    active_users = sum(1 for user in users if user.account_status == "active" and user.is_active)
    inactive_users = total_users - active_users
    users_by_job = Counter((user.job_title or user.user_type or "unknown") for user in users)
    suspended_users = sum(1 for user in users if user.account_status in {"suspended", "locked"})
    users_by_department = _build_counter(users, lambda user: user.department)
    users_by_contract_type = _build_counter(users, lambda user: user.contract_type)
    users_by_user_type = _build_counter(users, lambda user: user.user_type)
    users_by_account_status = _build_counter(users, lambda user: user.account_status)
    without_department = sum(1 for user in users if not (user.department or "").strip())
    without_job_title = sum(1 for user in users if not (user.job_title or "").strip())
    without_employee_number = sum(1 for user in users if not (user.employee_number or "").strip())
    incomplete_profiles = sum(
        1
        for user in users
        if not (user.department or "").strip()
        or not (user.job_title or "").strip()
        or not (user.employee_number or "").strip()
    )
    managers_count = sum(
        1
        for user in users
        if user.user_type == "company_admin" or (user.hierarchy_level is not None and user.hierarchy_level <= 2)
    )
    today = datetime.now(timezone.utc).date()
    recent_hires_30d = sum(
        1
        for user in users
        if user.hire_date is not None and 0 <= (today - user.hire_date).days <= 30
    )

    latest_logs = (
        AuditLog.query.filter(AuditLog.company_id == company_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .limit(8)
        .all()
    )

    projects = (
        Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None))
        .order_by(Project.updated_at.desc(), Project.id.desc())
        .all()
    )
    active_projects = sum(1 for project in projects if project.status == "in_progress")
    total_projects = len(projects)
    delayed_projects = sum(
        1
        for project in projects
        if project.end_date and project.end_date < today and project.status not in TERMINAL_PROJECT_STATUSES
    )
    spotlight_projects = [
        _serialize_project_spotlight_row(project, today)
        for project in sorted(projects, key=lambda project: _project_priority_sort_key(project, today), reverse=True)[:6]
    ]

    revenue_total = (
        db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
        .filter(
            FinanceEntry.company_id == company_id,
            FinanceEntry.deleted_at.is_(None),
            FinanceEntry.entry_type == "revenue",
        )
        .scalar()
        or 0
    )
    expense_total = (
        db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
        .filter(
            FinanceEntry.company_id == company_id,
            FinanceEntry.deleted_at.is_(None),
            FinanceEntry.entry_type == "expense",
        )
        .scalar()
        or 0
    )
    invoices = Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None)).all()
    outstanding_total = sum(float(invoice.amount_total or 0) - float(invoice.amount_paid or 0) for invoice in invoices)

    latest_subscription = (
        CompanySubscription.query.filter_by(company_id=company_id)
        .order_by(CompanySubscription.created_at.desc(), CompanySubscription.id.desc())
        .first()
    )
    low_stock_count = _compute_low_stock_count(company_id)
    attendance_summary = _build_attendance_dashboard_summary(company_id, today=today)
    leave_requests_summary = _build_leave_requests_dashboard_summary(company_id, today=today)

    alerts: list[dict[str, Any]] = []
    if latest_subscription and latest_subscription.end_date:
        remaining_days = (latest_subscription.end_date - datetime.now(timezone.utc).date()).days
        if remaining_days <= 30:
            alerts.append(
                {
                    "type": "subscription_expiring",
                    "message": "subscription_expiring",
                    "days_remaining": remaining_days,
                }
            )

    if low_stock_count > 0:
        alerts.append({"type": "low_stock", "message": "low_stock", "count": low_stock_count})

    if suspended_users > 0:
        alerts.append({"type": "suspended_users", "message": "suspended_users", "count": suspended_users})
    if incomplete_profiles > 0:
        alerts.append({"type": "incomplete_profiles", "message": "incomplete_profiles", "count": incomplete_profiles})
    if leave_requests_summary["pending_requests"] > 0:
        alerts.append(
            {
                "type": "pending_leave_requests",
                "message": "pending_leave_requests",
                "count": leave_requests_summary["pending_requests"],
            }
        )
    if active_users > 0 and attendance_summary["tracked_records"] == 0:
        alerts.append(
            {
                "type": "attendance_tracking_missing",
                "message": "attendance_tracking_missing",
                "days": attendance_summary["lookback_days"],
            }
        )
    if attendance_summary["unjustified_absent_records"] > 0:
        alerts.append(
            {
                "type": "attendance_absences",
                "message": "attendance_absences",
                "count": attendance_summary["unjustified_absent_records"],
            }
        )
    if attendance_summary["late_records"] > 0:
        alerts.append(
            {
                "type": "attendance_lateness",
                "message": "attendance_lateness",
                "count": attendance_summary["late_records"],
            }
        )

    return {
        "company": {
            "id": company.id,
            "legal_name": company.legal_name,
            "account_status": company.account_status,
            "subscription_status": company.subscription_status,
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": inactive_users,
            "by_job_title": dict(users_by_job),
            "by_department": users_by_department,
            "by_contract_type": users_by_contract_type,
            "by_user_type": users_by_user_type,
            "by_account_status": users_by_account_status,
        },
        "personnel": {
            "managers": managers_count,
            "recent_hires_30d": recent_hires_30d,
            "without_department": without_department,
            "without_job_title": without_job_title,
            "without_employee_number": without_employee_number,
            "incomplete_profiles": incomplete_profiles,
        },
        "projects": {
            "total": total_projects,
            "in_progress": active_projects,
            "delayed": delayed_projects,
            "spotlight": spotlight_projects,
        },
        "attendance": attendance_summary,
        "leave_requests": leave_requests_summary,
        "inventory": {
            "low_stock_items": low_stock_count,
        },
        "finance": {
            "revenues": float(revenue_total or 0),
            "expenses": float(expense_total or 0),
            "outstanding_invoices": float(outstanding_total or 0),
        },
        "subscription": {
            "status": latest_subscription.status if latest_subscription else company.subscription_status,
            "end_date": latest_subscription.end_date.isoformat() if latest_subscription and latest_subscription.end_date else None,
        },
        "alerts": alerts,
        "latest_activity": [serialize_audit_log(row) for row in latest_logs],
    }


def update_user_language(company_id: int, user_id: int, preferred_language: str) -> dict[str, Any]:
    language = preferred_language.strip().lower()
    if language not in ("fr", "en"):
        raise UserManagementError("preferred_language must be fr or en", status_code=400)

    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)

    user.preferred_language = language
    log_audit_event(
        module="users",
        action="language_updated",
        company_id=company_id,
        actor_user_id=user_id,
        target_type="user",
        target_id=user.id,
        description="User language updated",
        details={"preferred_language": language},
    )
    db.session.commit()

    return {
        "id": user.id,
        "preferred_language": user.preferred_language,
    }
