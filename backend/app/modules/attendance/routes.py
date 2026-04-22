from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.rbac import require_permission
from app.core.responses import error_response_from_exception
from app.core.validation import load_json, load_query
from app.modules.attendance.schemas import (
    AttendanceCreateSchema,
    AttendanceListQuerySchema,
    AttendancePolicyUpdateSchema,
    AttendanceUpdateSchema,
)
from app.modules.attendance.service import (
    AttendanceError,
    create_attendance_record,
    get_attendance_policy,
    get_attendance_summary,
    get_attendance_support_data,
    list_attendance_records,
    update_attendance_policy,
    update_attendance_record,
)


attendance_bp = Blueprint("attendance", __name__, url_prefix="/attendance")


@attendance_bp.get("/status")
@jwt_required()
@require_permission("attendance.read")
def attendance_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "attendance", "status": "ready", "tenant_id": tenant_id}), 200


@attendance_bp.get("/support-data")
@jwt_required()
@require_permission("attendance.read")
def attendance_support_data():
    try:
        company_id = resolve_company_scope(AttendanceError)
        return jsonify(get_attendance_support_data(company_id=company_id)), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.get("/summary")
@jwt_required()
@require_permission("attendance.read")
def attendance_summary():
    params = load_query(AttendanceListQuerySchema())
    try:
        company_id = resolve_company_scope(AttendanceError, params)
        payload = get_attendance_summary(
            company_id=company_id,
            user_id=params.get("user_id"),
            project_id=params.get("project_id"),
            status=params.get("status"),
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
        )
        return jsonify(payload), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.get("")
@jwt_required()
@require_permission("attendance.read")
def attendance_list():
    params = load_query(AttendanceListQuerySchema())
    try:
        company_id = resolve_company_scope(AttendanceError, params)
        items = list_attendance_records(
            company_id=company_id,
            user_id=params.get("user_id"),
            project_id=params.get("project_id"),
            status=params.get("status"),
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
        )
        return jsonify({"items": items, "count": len(items)}), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.post("")
@jwt_required()
@require_permission("attendance.manage")
def attendance_create():
    payload = load_json(AttendanceCreateSchema())
    try:
        company_id = resolve_company_scope(AttendanceError, payload)
        actor_user_id = int(get_jwt_identity())
        record = create_attendance_record(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
        return jsonify({"message": "Attendance record created", "record": record}), 201
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.patch("/<int:record_id>")
@jwt_required()
@require_permission("attendance.manage")
def attendance_update(record_id: int):
    payload = load_json(AttendanceUpdateSchema())
    try:
        company_id = resolve_company_scope(AttendanceError, payload)
        actor_user_id = int(get_jwt_identity())
        record = update_attendance_record(
            company_id=company_id,
            actor_user_id=actor_user_id,
            record_id=record_id,
            payload=payload,
        )
        return jsonify({"message": "Attendance record updated", "record": record}), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.get("/policy")
@jwt_required()
@require_permission("attendance.read")
def attendance_policy_get():
    try:
        company_id = resolve_company_scope(AttendanceError)
        return jsonify({"policy": get_attendance_policy(company_id=company_id)}), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)


@attendance_bp.patch("/policy")
@jwt_required()
@require_permission("attendance.manage")
def attendance_policy_patch():
    payload = load_json(AttendancePolicyUpdateSchema())
    try:
        company_id = resolve_company_scope(AttendanceError, payload)
        actor_user_id = int(get_jwt_identity())
        policy = update_attendance_policy(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
        return jsonify({"message": "Attendance policy updated", "policy": policy}), 200
    except AttendanceError as exc:
        return error_response_from_exception(exc)
