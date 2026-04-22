from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_query
from app.core.responses import error_response_from_exception
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.core.validation import load_json, load_query
from app.modules.inventory.schemas import (
    AllocationCreateSchema,
    AllocationsListQuerySchema,
    InventorySessionCreateSchema,
    InventorySessionsListQuerySchema,
    ItemCreateSchema,
    ItemUpdateSchema,
    ItemStockQuerySchema,
    LocationCreateSchema,
    MovementCreateSchema,
    MovementsListQuerySchema,
    MobileScanCreateSchema,
    OperationCancelSchema,
    OperationCreateSchema,
    OperationsListQuerySchema,
    SupplyRequestCreateSchema,
    SupplyRequestListQuerySchema,
    SupplyRequestUpdateSchema,
)
from app.modules.inventory.service import (
    InventoryError,
    allocate_stock_to_project,
    build_activity_query,
    build_allocations_query,
    build_inventory_sessions_query,
    build_items_query,
    build_movements_query,
    build_operations_query,
    build_supply_requests_query,
    cancel_operation,
    create_inventory_session,
    create_item,
    create_location,
    create_movement,
    create_operation,
    create_supply_request,
    get_dashboard,
    get_item_stock,
    get_reports_summary,
    get_support_data,
    list_alerts,
    list_locations,
    register_mobile_scan,
    serialize_allocation,
    serialize_inventory_session,
    serialize_item,
    serialize_movement,
    serialize_operation,
    serialize_supply_request,
    soft_delete_item,
    update_item,
    update_supply_request,
    validate_inventory_session,
    validate_operation,
)

inventory_bp = Blueprint("inventory", __name__, url_prefix="/inventory")


@inventory_bp.get("/status")
@jwt_required()
@require_permission("inventory.read")
def inventory_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "inventory", "status": "ready", "tenant_id": tenant_id}), 200


@inventory_bp.get("/support-data")
@jwt_required()
@require_permission("inventory.read")
def inventory_support_data():
    try:
        company_id = resolve_company_scope(InventoryError)
        return jsonify(get_support_data(company_id=company_id)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/supply-requests")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_supply_requests():
    params = load_query(SupplyRequestListQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        query = build_supply_requests_query(
            company_id=company_id,
            project_id=params.get("project_id"),
            status=params.get("status"),
        )
        page, page_size = get_pagination_params(default_page_size=50)
        return jsonify(paginate_query(query, page, page_size, serialize_supply_request)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/supply-requests")
@jwt_required()
@require_permission("inventory.read")
def inventory_create_supply_request():
    payload = load_json(SupplyRequestCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        requester_user_id = int(get_jwt_identity())
        request = create_supply_request(
            company_id=company_id,
            requester_user_id=requester_user_id,
            payload=payload,
        )
        return jsonify({"message": "Supply request created", "supply_request": request}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.patch("/supply-requests/<int:request_id>")
@jwt_required()
@require_permission("inventory.read")
def inventory_update_supply_request(request_id):
    payload = load_json(SupplyRequestUpdateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        actor_user_id = int(get_jwt_identity())
        result = update_supply_request(
            company_id=company_id,
            request_id=request_id,
            actor_user_id=actor_user_id,
            payload=payload,
        )
        return jsonify({"message": "Supply request updated", "supply_request": result}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/dashboard")
@jwt_required()
@require_permission("inventory.read")
def inventory_dashboard():
    try:
        company_id = resolve_company_scope(InventoryError)
        return jsonify(get_dashboard(company_id=company_id)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/alerts")
@jwt_required()
@require_permission("inventory.read")
def inventory_alerts():
    try:
        company_id = resolve_company_scope(InventoryError)
        alerts = list_alerts(company_id=company_id)
        return jsonify({"items": alerts, "count": len(alerts)}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/reports/summary")
@jwt_required()
@require_permission("inventory.read")
def inventory_reports_summary():
    try:
        company_id = resolve_company_scope(InventoryError)
        return jsonify(get_reports_summary(company_id=company_id)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/activity")
@jwt_required()
@require_permission("inventory.read")
def inventory_activity():
    try:
        company_id = resolve_company_scope(InventoryError)
        query = build_activity_query(company_id=company_id)
        page, page_size = get_pagination_params(default_page_size=30)
        from app.core.audit import serialize_audit_log

        return jsonify(paginate_query(query, page, page_size, serialize_audit_log)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/mobile-scans")
@jwt_required()
@require_permission("inventory.read")
def inventory_register_mobile_scan():
    payload = load_json(MobileScanCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        actor_user_id = int(get_jwt_identity())
        audit_entry = register_mobile_scan(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
        return jsonify({"message": "Mobile scan registered", "scan": audit_entry}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/locations")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_locations():
    try:
        company_id = resolve_company_scope(InventoryError)
        rows = list_locations(company_id=company_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/locations")
@jwt_required()
@require_permission("inventory.manage")
def inventory_create_location():
    payload = load_json(LocationCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        location = create_location(company_id=company_id, payload=payload)
        return jsonify({"message": "Location created", "location": location}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/items")
@jwt_required()
@require_permission("inventory.read")
@rate_limit(max_requests=100, window_seconds=60, scope="inventory-items-list")
def inventory_list_items():
    try:
        company_id = resolve_company_scope(InventoryError)
        query = build_items_query(company_id=company_id)
        page, page_size = get_pagination_params()
        return jsonify(paginate_query(query, page, page_size, serialize_item)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/items")
@jwt_required()
@require_permission("inventory.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="inventory-items-create")
def inventory_create_item():
    payload = load_json(ItemCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        item = create_item(company_id=company_id, payload=payload)
        return jsonify({"message": "Item created", "item": item}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.patch("/items/<int:item_id>")
@jwt_required()
@require_permission("inventory.manage")
@rate_limit(max_requests=60, window_seconds=60, scope="inventory-items-update")
def inventory_update_item(item_id):
    payload = load_json(ItemUpdateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        item = update_item(company_id=company_id, item_id=item_id, payload=payload)
        return jsonify({"message": "Item updated", "item": item}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.delete("/items/<int:item_id>")
@jwt_required()
@require_permission("inventory.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="inventory-items-delete")
def inventory_delete_item(item_id):
    try:
        company_id = resolve_company_scope(InventoryError)
        soft_delete_item(company_id=company_id, item_id=item_id)
        return jsonify({"message": "Item deleted"}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/items/<int:item_id>/stock")
@jwt_required()
@require_permission("inventory.read")
def inventory_get_item_stock(item_id):
    params = load_query(ItemStockQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        stock = get_item_stock(company_id=company_id, item_id=item_id, location_id=params.get("location_id"))
        return jsonify(stock), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/movements")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_movements():
    params = load_query(MovementsListQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        query = build_movements_query(
            company_id=company_id,
            item_id=params.get("item_id"),
            location_id=params.get("location_id"),
                    project_id=params.get("project_id"),
        )
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_movement)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/movements")
@jwt_required()
@require_permission("inventory.manage")
def inventory_create_movement():
    payload = load_json(MovementCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        performed_by_user_id = int(get_jwt_identity())
        movement = create_movement(company_id=company_id, performed_by_user_id=performed_by_user_id, payload=payload)
        return jsonify({"message": "Movement recorded", "movement": movement}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/allocations")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_allocations():
    params = load_query(AllocationsListQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        query = build_allocations_query(company_id=company_id, project_id=params.get("project_id"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_allocation)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/allocations")
@jwt_required()
@require_permission("inventory.manage")
def inventory_allocate_stock():
    payload = load_json(AllocationCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        allocated_by_user_id = int(get_jwt_identity())
        allocation = allocate_stock_to_project(
            company_id=company_id,
            allocated_by_user_id=allocated_by_user_id,
            payload=payload,
        )
        return jsonify({"message": "Stock allocated", "allocation": allocation}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/operations")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_operations():
    params = load_query(OperationsListQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        query = build_operations_query(
            company_id=company_id,
            status=params.get("status"),
            operation_kind=params.get("operation_kind"),
            project_id=params.get("project_id"),
        )
        page, page_size = get_pagination_params(default_page_size=20)
        return jsonify(paginate_query(query, page, page_size, serialize_operation)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/operations")
@jwt_required()
@require_permission("inventory.manage")
def inventory_create_operation():
    payload = load_json(OperationCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        created_by_user_id = int(get_jwt_identity())
        operation = create_operation(company_id=company_id, created_by_user_id=created_by_user_id, payload=payload)
        return jsonify({"message": "Operation created", "operation": operation}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/operations/<int:operation_id>/validate")
@jwt_required()
@require_permission("inventory.manage")
def inventory_validate_operation(operation_id):
    payload = load_json(OperationCancelSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        validated_by_user_id = int(get_jwt_identity())
        operation = validate_operation(
            company_id=company_id,
            operation_id=operation_id,
            validated_by_user_id=validated_by_user_id,
        )
        return jsonify({"message": "Operation validated", "operation": operation}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/operations/<int:operation_id>/cancel")
@jwt_required()
@require_permission("inventory.manage")
def inventory_cancel_operation(operation_id):
    payload = load_json(OperationCancelSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        cancelled_by_user_id = int(get_jwt_identity())
        operation = cancel_operation(
            company_id=company_id,
            operation_id=operation_id,
            cancelled_by_user_id=cancelled_by_user_id,
            payload=payload,
        )
        return jsonify({"message": "Operation cancelled", "operation": operation}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.get("/inventories")
@jwt_required()
@require_permission("inventory.read")
def inventory_list_inventory_sessions():
    params = load_query(InventorySessionsListQuerySchema())
    try:
        company_id = resolve_company_scope(InventoryError, params)
        query = build_inventory_sessions_query(company_id=company_id, status=params.get("status"))
        page, page_size = get_pagination_params(default_page_size=20)
        return jsonify(paginate_query(query, page, page_size, serialize_inventory_session)), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/inventories")
@jwt_required()
@require_permission("inventory.manage")
def inventory_create_inventory_session():
    payload = load_json(InventorySessionCreateSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        responsible_user_id = int(get_jwt_identity())
        session = create_inventory_session(
            company_id=company_id,
            responsible_user_id=responsible_user_id,
            payload=payload,
        )
        return jsonify({"message": "Inventory session created", "inventory": session}), 201
    except InventoryError as exc:
        return error_response_from_exception(exc)


@inventory_bp.post("/inventories/<int:session_id>/validate")
@jwt_required()
@require_permission("inventory.manage")
def inventory_validate_inventory_session(session_id):
    payload = load_json(OperationCancelSchema())
    try:
        company_id = resolve_company_scope(InventoryError, payload)
        validated_by_user_id = int(get_jwt_identity())
        session = validate_inventory_session(
            company_id=company_id,
            session_id=session_id,
            validated_by_user_id=validated_by_user_id,
        )
        return jsonify({"message": "Inventory session validated", "inventory": session}), 200
    except InventoryError as exc:
        return error_response_from_exception(exc)
