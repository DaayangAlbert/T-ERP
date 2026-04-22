from marshmallow import fields, validate

from app.core.validation import TenantBodySchema, TenantQuerySchema


MOVEMENT_TYPES = ["in", "out", "transfer", "adjustment", "allocation"]
LOCATION_TYPES = ["main_warehouse", "secondary_depot", "site", "warehouse"]
ITEM_CATEGORIES = ["material", "equipment", "consumable"]
OPERATION_KINDS = ["entry", "exit", "transfer"]
ENTRY_TYPES = ["supplier_purchase", "site_return", "internal_transfer", "stock_adjustment"]
EXIT_TYPES = ["project_assignment", "internal_consumption", "loss_breakage", "theft_anomaly"]
OPERATION_STATUSES = ["pending", "validated", "cancelled"]
INVENTORY_TYPES = ["periodic", "permanent", "cycle"]
INVENTORY_STATUSES = ["draft", "validated"]
SCAN_TARGETS = ["lookup", "item_form", "operation_line", "inventory_line"]
SCAN_MODES = ["manual", "camera"]


class LocationCreateSchema(TenantBodySchema):
    code = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    location_type = fields.String(load_default="main_warehouse", validate=validate.OneOf(LOCATION_TYPES))
    project_id = fields.Integer(required=False, allow_none=True)
    address = fields.String(required=False, allow_none=True)
    description = fields.String(required=False, allow_none=True)


class ItemCreateSchema(TenantBodySchema):
    sku = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    unit = fields.String(load_default="pcs", validate=validate.Length(min=1))
    category = fields.String(load_default="material", validate=validate.OneOf(ITEM_CATEGORIES))
    min_threshold = fields.Decimal(load_default=0, as_string=False)
    max_threshold = fields.Decimal(required=False, allow_none=True, as_string=False)
    average_unit_cost = fields.Decimal(load_default=0, as_string=False)
    preferred_supplier = fields.String(required=False, allow_none=True)
    barcode = fields.String(required=False, allow_none=True)
    qr_code = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class ItemUpdateSchema(TenantBodySchema):
    sku = fields.String(required=False, validate=validate.Length(min=1))
    name = fields.String(required=False, validate=validate.Length(min=1))
    unit = fields.String(required=False, validate=validate.Length(min=1))
    category = fields.String(required=False, validate=validate.OneOf(ITEM_CATEGORIES))
    min_threshold = fields.Decimal(required=False, as_string=False)
    max_threshold = fields.Decimal(required=False, allow_none=True, as_string=False)
    average_unit_cost = fields.Decimal(required=False, as_string=False)
    preferred_supplier = fields.String(required=False, allow_none=True)
    barcode = fields.String(required=False, allow_none=True)
    qr_code = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class ItemStockQuerySchema(TenantQuerySchema):
    location_id = fields.Integer(required=False, allow_none=True)


class MovementsListQuerySchema(TenantQuerySchema):
    item_id = fields.Integer(required=False, allow_none=True)
    location_id = fields.Integer(required=False, allow_none=True)
    project_id = fields.Integer(required=False, allow_none=True)


class MovementCreateSchema(TenantBodySchema):
    item_id = fields.Integer(required=True)
    from_location_id = fields.Integer(required=False, allow_none=True)
    to_location_id = fields.Integer(required=False, allow_none=True)
    project_id = fields.Integer(required=False, allow_none=True)
    task_id = fields.Integer(required=False, allow_none=True)
    responsible_user_id = fields.Integer(required=False, allow_none=True)
    movement_type = fields.String(required=True, validate=validate.OneOf(MOVEMENT_TYPES))
    quantity = fields.Decimal(required=True, as_string=False)
    unit_cost = fields.Decimal(required=False, allow_none=True, as_string=False)
    reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class AllocationsListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)


class AllocationCreateSchema(TenantBodySchema):
    item_id = fields.Integer(required=True)
    project_id = fields.Integer(required=True)
    from_location_id = fields.Integer(required=True)
    to_location_id = fields.Integer(required=False, allow_none=True)
    task_id = fields.Integer(required=False, allow_none=True)
    responsible_user_id = fields.Integer(required=False, allow_none=True)
    quantity_allocated = fields.Decimal(required=True, as_string=False)
    reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class OperationLineSchema(TenantBodySchema):
    item_id = fields.Integer(required=True)
    quantity = fields.Decimal(required=True, as_string=False)
    unit_price = fields.Decimal(required=False, allow_none=True, as_string=False)
    total_amount = fields.Decimal(required=False, allow_none=True, as_string=False)
    notes = fields.String(required=False, allow_none=True)


class OperationsListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(OPERATION_STATUSES))
    operation_kind = fields.String(required=False, allow_none=True, validate=validate.OneOf(OPERATION_KINDS))
    project_id = fields.Integer(required=False, allow_none=True)


class OperationCreateSchema(TenantBodySchema):
    operation_kind = fields.String(required=True, validate=validate.OneOf(OPERATION_KINDS))
    operation_date = fields.Date(required=True)
    entry_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(ENTRY_TYPES))
    exit_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(EXIT_TYPES))
    source_location_id = fields.Integer(required=False, allow_none=True)
    destination_location_id = fields.Integer(required=False, allow_none=True)
    supplier_name = fields.String(required=False, allow_none=True)
    delivery_note_number = fields.String(required=False, allow_none=True)
    invoice_reference = fields.String(required=False, allow_none=True)
    project_id = fields.Integer(required=False, allow_none=True)
    task_id = fields.Integer(required=False, allow_none=True)
    requested_by_user_id = fields.Integer(required=False, allow_none=True)
    responsible_user_id = fields.Integer(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    validate_now = fields.Boolean(load_default=False)
    lines = fields.List(fields.Nested(OperationLineSchema), required=True, validate=validate.Length(min=1))


class OperationCancelSchema(TenantBodySchema):
    notes = fields.String(required=False, allow_none=True)


class InventoryLineSchema(TenantBodySchema):
    item_id = fields.Integer(required=True)
    counted_quantity = fields.Decimal(required=True, as_string=False)
    observation = fields.String(required=False, allow_none=True)


class InventorySessionsListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(INVENTORY_STATUSES))


class InventorySessionCreateSchema(TenantBodySchema):
    location_id = fields.Integer(required=True)
    inventory_type = fields.String(load_default="periodic", validate=validate.OneOf(INVENTORY_TYPES))
    inventory_date = fields.Date(required=True)
    reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    validate_now = fields.Boolean(load_default=False)
    lines = fields.List(fields.Nested(InventoryLineSchema), required=True, validate=validate.Length(min=1))


class MobileScanCreateSchema(TenantBodySchema):
    scanned_value = fields.String(required=True, validate=validate.Length(min=1))
    matched_item_id = fields.Integer(required=False, allow_none=True)
    matched_item_name = fields.String(required=False, allow_none=True)
    scan_target = fields.String(load_default="lookup", validate=validate.OneOf(SCAN_TARGETS))
    scan_mode = fields.String(load_default="manual", validate=validate.OneOf(SCAN_MODES))
    captured_at = fields.String(required=False, allow_none=True)
    device_label = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    offline_action_id = fields.String(required=False, allow_none=True)
    synced_from_offline = fields.Boolean(load_default=False)


SUPPLY_REQUEST_URGENCIES = ["low", "normal", "high", "urgent"]
SUPPLY_REQUEST_STATUSES = ["pending", "approved", "rejected", "transmitted", "fulfilled"]


class SupplyRequestListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(SUPPLY_REQUEST_STATUSES))


class SupplyRequestCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=True)
    item_id = fields.Integer(required=True)
    requested_quantity = fields.Decimal(required=True, as_string=False)
    reason = fields.String(required=False, allow_none=True)
    urgency = fields.String(load_default="normal", validate=validate.OneOf(SUPPLY_REQUEST_URGENCIES))
    assignee_user_id = fields.Integer(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class SupplyRequestUpdateSchema(TenantBodySchema):
    status = fields.String(required=True, validate=validate.OneOf(SUPPLY_REQUEST_STATUSES))
    transmitted_to_user_id = fields.Integer(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
