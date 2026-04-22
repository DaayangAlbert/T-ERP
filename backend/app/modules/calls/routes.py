from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_items
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.modules.calls.service import (
    CallError,
    create_call_session,
    end_call,
    get_call,
    join_call,
    leave_call,
    list_calls,
    reject_call,
)

calls_bp = Blueprint("calls", __name__, url_prefix="/calls")


def _resolve_target_company_id(payload: dict | None = None) -> int:
    return resolve_company_scope(CallError, payload)


@calls_bp.get("/status")
@jwt_required()
@require_permission("calls.read")
def calls_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "calls", "status": "ready", "tenant_id": tenant_id}), 200


@calls_bp.get("")
@jwt_required()
@require_permission("calls.read")
@rate_limit(max_requests=90, window_seconds=60, scope="calls-list")
def calls_list():
    user_id = int(get_jwt_identity())
    status = request.args.get("status")
    try:
        company_id = _resolve_target_company_id()
        rows = list_calls(company_id=company_id, user_id=user_id, status=status)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.post("")
@jwt_required()
@require_permission("calls.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="calls-create")
def calls_create():
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        session = create_call_session(company_id=company_id, initiator_user_id=user_id, payload=payload)
        return jsonify({"message": "Call started", "call": session}), 201
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.get("/<int:call_session_id>")
@jwt_required()
@require_permission("calls.read")
def calls_get(call_session_id):
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id()
        session = get_call(company_id=company_id, call_session_id=call_session_id, user_id=user_id)
        return jsonify(session), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.post("/<int:call_session_id>/join")
@jwt_required()
@require_permission("calls.manage")
def calls_join(call_session_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        session = join_call(company_id=company_id, call_session_id=call_session_id, user_id=user_id)
        return jsonify({"message": "Joined call", "call": session}), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.post("/<int:call_session_id>/leave")
@jwt_required()
@require_permission("calls.manage")
def calls_leave(call_session_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        session = leave_call(company_id=company_id, call_session_id=call_session_id, user_id=user_id)
        return jsonify({"message": "Left call", "call": session}), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.post("/<int:call_session_id>/reject")
@jwt_required()
@require_permission("calls.manage")
def calls_reject(call_session_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        session = reject_call(company_id=company_id, call_session_id=call_session_id, user_id=user_id)
        return jsonify({"message": "Call rejected", "call": session}), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@calls_bp.post("/<int:call_session_id>/end")
@jwt_required()
@require_permission("calls.manage")
def calls_end(call_session_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        session = end_call(company_id=company_id, call_session_id=call_session_id, user_id=user_id)
        return jsonify({"message": "Call ended", "call": session}), 200
    except CallError as exc:
        return jsonify({"message": exc.message}), exc.status_code
