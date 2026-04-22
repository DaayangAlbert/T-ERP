from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


class StockLocation(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "stock_locations"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(60), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    location_type = db.Column(db.String(30), nullable=False, default="main_warehouse")
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    address = db.Column(db.String(255), nullable=True)
    description = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_stock_locations_company_code"),
        CheckConstraint(
            "location_type IN ('main_warehouse', 'secondary_depot', 'site')",
            name="ck_stock_locations_type",
        ),
    )


class InventoryItem(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "inventory_items"

    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    unit = db.Column(db.String(20), nullable=False, default="pcs")
    category = db.Column(db.String(30), nullable=False, default="material")
    min_threshold = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    max_threshold = db.Column(db.Numeric(12, 2), nullable=True)
    average_unit_cost = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    preferred_supplier = db.Column(db.String(255), nullable=True)
    barcode = db.Column(db.String(120), nullable=True)
    qr_code = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_inventory_items_company_sku"),
        CheckConstraint(
            "category IN ('material', 'equipment', 'consumable')",
            name="ck_inventory_items_category",
        ),
        CheckConstraint("min_threshold >= 0", name="ck_inventory_items_min_threshold_non_negative"),
        CheckConstraint(
            "max_threshold IS NULL OR max_threshold >= min_threshold",
            name="ck_inventory_items_max_threshold_valid",
        ),
        CheckConstraint("average_unit_cost >= 0", name="ck_inventory_items_average_unit_cost_non_negative"),
    )


class StockOperation(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_operations"

    id = db.Column(db.Integer, primary_key=True)
    operation_kind = db.Column(db.String(20), nullable=False)
    entry_type = db.Column(db.String(30), nullable=True)
    exit_type = db.Column(db.String(30), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")
    operation_date = db.Column(db.Date, nullable=False)
    source_location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=True, index=True)
    destination_location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=True, index=True)
    supplier_name = db.Column(db.String(255), nullable=True)
    delivery_note_number = db.Column(db.String(120), nullable=True)
    invoice_reference = db.Column(db.String(120), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey("project_tasks.id"), nullable=True, index=True)
    requested_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    responsible_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    validated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "operation_kind IN ('entry', 'exit', 'transfer')",
            name="ck_stock_operations_kind",
        ),
        CheckConstraint(
            "entry_type IS NULL OR entry_type IN ('supplier_purchase', 'site_return', 'internal_transfer', 'stock_adjustment')",
            name="ck_stock_operations_entry_type",
        ),
        CheckConstraint(
            "exit_type IS NULL OR exit_type IN ('project_assignment', 'internal_consumption', 'loss_breakage', 'theft_anomaly')",
            name="ck_stock_operations_exit_type",
        ),
        CheckConstraint("status IN ('pending', 'validated', 'cancelled')", name="ck_stock_operations_status"),
    )


class StockOperationLine(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_operation_lines"

    id = db.Column(db.Integer, primary_key=True)
    operation_id = db.Column(db.Integer, db.ForeignKey("stock_operations.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    quantity = db.Column(db.Numeric(12, 2), nullable=False)
    unit_price = db.Column(db.Numeric(14, 2), nullable=True)
    total_amount = db.Column(db.Numeric(14, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_stock_operation_lines_quantity_positive"),
        CheckConstraint("unit_price IS NULL OR unit_price >= 0", name="ck_stock_operation_lines_unit_price_non_negative"),
        CheckConstraint(
            "total_amount IS NULL OR total_amount >= 0",
            name="ck_stock_operation_lines_total_amount_non_negative",
        ),
    )


class StockMovement(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_movements"

    id = db.Column(db.Integer, primary_key=True)
    operation_id = db.Column(db.Integer, db.ForeignKey("stock_operations.id"), nullable=True, index=True)
    operation_line_id = db.Column(db.Integer, db.ForeignKey("stock_operation_lines.id"), nullable=True, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    from_location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=True, index=True)
    to_location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=True, index=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey("project_tasks.id"), nullable=True, index=True)
    movement_type = db.Column(db.String(20), nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False)
    stock_before = db.Column(db.Numeric(12, 2), nullable=True)
    stock_after = db.Column(db.Numeric(12, 2), nullable=True)
    unit_cost = db.Column(db.Numeric(14, 2), nullable=True)
    total_cost = db.Column(db.Numeric(14, 2), nullable=True)
    performed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('in', 'out', 'transfer', 'adjustment', 'allocation')",
            name="ck_stock_movements_type",
        ),
        CheckConstraint("quantity > 0", name="ck_stock_movements_quantity_positive"),
        CheckConstraint("unit_cost IS NULL OR unit_cost >= 0", name="ck_stock_movements_unit_cost_non_negative"),
        CheckConstraint("total_cost IS NULL OR total_cost >= 0", name="ck_stock_movements_total_cost_non_negative"),
    )


class ProjectStockAllocation(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_stock_allocations"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    task_id = db.Column(db.Integer, db.ForeignKey("project_tasks.id"), nullable=True, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    source_location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=True, index=True)
    stock_movement_id = db.Column(db.Integer, db.ForeignKey("stock_movements.id"), nullable=True, index=True)
    quantity_allocated = db.Column(db.Numeric(12, 2), nullable=False)
    allocated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    responsible_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)

    __table_args__ = (
        CheckConstraint("quantity_allocated > 0", name="ck_project_stock_allocations_quantity_positive"),
    )


class StockInventorySession(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_inventory_sessions"

    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey("stock_locations.id"), nullable=False, index=True)
    inventory_type = db.Column(db.String(20), nullable=False, default="periodic")
    status = db.Column(db.String(20), nullable=False, default="draft")
    inventory_date = db.Column(db.Date, nullable=False)
    responsible_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    validated_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "inventory_type IN ('periodic', 'permanent', 'cycle')",
            name="ck_stock_inventory_sessions_type",
        ),
        CheckConstraint(
            "status IN ('draft', 'validated')",
            name="ck_stock_inventory_sessions_status",
        ),
    )


class StockInventoryLine(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_inventory_lines"

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("stock_inventory_sessions.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    system_quantity = db.Column(db.Numeric(12, 2), nullable=False)
    counted_quantity = db.Column(db.Numeric(12, 2), nullable=False)
    difference_quantity = db.Column(db.Numeric(12, 2), nullable=False)
    observation = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "item_id", name="uq_stock_inventory_lines_session_item"),
    )


class StockSupplyRequest(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "stock_supply_requests"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, db.ForeignKey("inventory_items.id"), nullable=False, index=True)
    requested_quantity = db.Column(db.Numeric(12, 2), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    urgency = db.Column(db.String(20), nullable=False, default="normal")
    status = db.Column(db.String(20), nullable=False, default="pending")
    requester_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    assignee_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    transmitted_to_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        CheckConstraint("requested_quantity > 0", name="ck_stock_supply_requests_quantity_positive"),
        CheckConstraint(
            "urgency IN ('low', 'normal', 'high', 'urgent')",
            name="ck_stock_supply_requests_urgency",
        ),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'transmitted', 'fulfilled')",
            name="ck_stock_supply_requests_status",
        ),
    )
