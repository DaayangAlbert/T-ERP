from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_tenant_context
from app.core.responses import error_response_from_exception
from app.core.validation import load_json, load_query
from app.modules.planning.schemas import (
    AgendaCreateSchema,
    AgendaListQuerySchema,
    AgendaUpdateSchema,
    PlanningOverviewQuerySchema,
    PlanningTaskStatusUpdateSchema,
)
from app.modules.planning.service import (
    PlanningError,
    build_planning_overview,
    create_agenda_entry,
    delete_agenda_entry,
    list_agenda_entries,
    update_agenda_entry,
    update_planning_task_status,
)


planning_bp = Blueprint("planning", __name__, url_prefix="/planning")


def _resolve_current_user_id() -> int:
    return int(get_jwt_identity())


@planning_bp.get("/status")
@jwt_required()
def planning_status():
    tenant_id = resolve_tenant_context(optional=True)
    return jsonify({"module": "planning", "status": "ready", "tenant_id": tenant_id}), 200


@planning_bp.get("/overview")
@jwt_required()
def planning_overview():
    params = load_query(PlanningOverviewQuerySchema())
    user_id = _resolve_current_user_id()
    company_id = resolve_tenant_context(optional=True)
    permissions = get_jwt().get("permissions", [])

    try:
        payload = build_planning_overview(
            user_id=user_id,
            company_id=company_id,
            permission_codes=permissions,
            lookahead_days=params["lookahead_days"],
        )
        return jsonify(payload), 200
    except PlanningError as exc:
        return error_response_from_exception(exc)


@planning_bp.get("/agenda")
@jwt_required()
def planning_agenda_list():
    params = load_query(AgendaListQuerySchema())
    user_id = _resolve_current_user_id()

    try:
        items = list_agenda_entries(
            user_id=user_id,
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
            include_completed=params["include_completed"],
        )
        return jsonify({"items": items, "count": len(items)}), 200
    except PlanningError as exc:
        return error_response_from_exception(exc)


@planning_bp.post("/agenda")
@jwt_required()
def planning_agenda_create():
    payload = load_json(AgendaCreateSchema())
    user_id = _resolve_current_user_id()
    company_id = resolve_tenant_context(optional=True)

    try:
        entry = create_agenda_entry(user_id=user_id, company_id=company_id, payload=payload)
        return jsonify({"message": "Agenda entry created", "entry": entry}), 201
    except PlanningError as exc:
        return error_response_from_exception(exc)


@planning_bp.patch("/agenda/<int:entry_id>")
@jwt_required()
def planning_agenda_update(entry_id):
    payload = load_json(AgendaUpdateSchema())
    user_id = _resolve_current_user_id()
    company_id = resolve_tenant_context(optional=True)

    try:
        entry = update_agenda_entry(user_id=user_id, company_id=company_id, entry_id=entry_id, payload=payload)
        return jsonify({"message": "Agenda entry updated", "entry": entry}), 200
    except PlanningError as exc:
        return error_response_from_exception(exc)


@planning_bp.delete("/agenda/<int:entry_id>")
@jwt_required()
def planning_agenda_delete(entry_id):
    user_id = _resolve_current_user_id()

    try:
        delete_agenda_entry(user_id=user_id, entry_id=entry_id)
        return jsonify({"message": "Agenda entry deleted"}), 200
    except PlanningError as exc:
        return error_response_from_exception(exc)


@planning_bp.patch("/tasks/<int:task_id>/status")
@jwt_required()
def planning_task_status_update(task_id):
    payload = load_json(PlanningTaskStatusUpdateSchema())
    user_id = _resolve_current_user_id()
    company_id = resolve_tenant_context(optional=True)
    permissions = get_jwt().get("permissions", [])

    if company_id is None:
        return error_response_from_exception(PlanningError("Company context is required", status_code=400))

    try:
        task = update_planning_task_status(
            company_id=company_id,
            task_id=task_id,
            user_id=user_id,
            permission_codes=permissions,
            payload=payload,
        )
        return jsonify({"message": "Task updated", "task": task}), 200
    except PlanningError as exc:
        return error_response_from_exception(exc)
