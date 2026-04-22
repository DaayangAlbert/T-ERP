from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.core.file_storage import FileStorageError, store_uploaded_file
from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.responses import error_response_from_exception
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.core.validation import load_json, load_query

from .schemas import (
    PayrollEmployeesListQuerySchema,
    PayrollEmployeeProfileUpsertSchema,
    PayrollGenerateRequestSchema,
    PayrollLeaveRequestCreateSchema,
    PayrollLeaveRequestStatusUpdateSchema,
    PayrollPeriodDraftSchema,
    PayrollPeriodInputsBulkSchema,
    PayrollPeriodListQuerySchema,
    PayrollMonthlyGenerateRequestSchema,
    PayrollRunListQuerySchema,
)
from .service import (
    PayrollServiceError,
    create_payroll_period_draft,
    delete_payroll_period_input,
    download_generated_payslip,
    download_leave_request_attachment,
    delete_payroll_employee_profile,
    create_payroll_my_leave_request,
    generate_monthly_payslips_via_db,
    generate_payslips_via_api,
    payroll_employee_profile_payload,
    payroll_employees_payload,
    payroll_leave_requests_payload,
    payroll_my_leave_requests_payload,
    payroll_period_inputs_payload,
    payroll_periods_payload,
    payroll_my_payslips_payload,
    payroll_my_summary_payload,
    payroll_runs_payload,
    payroll_status_payload,
    update_payroll_leave_request_status,
    user_can_access_generated_payslip,
    update_payroll_period_draft,
    upsert_payroll_period_inputs,
    upsert_payroll_employee_profile,
)


payroll_bp = Blueprint("payroll", __name__, url_prefix="/payroll")

LEAVE_REQUEST_ATTACHMENT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".pdf", ".doc", ".docx"}


def _parse_iso_date(value: str | None, *, field_name: str) -> date | None:
    normalized = str(value or "").strip()
    if not normalized:
        return None
    try:
        return date.fromisoformat(normalized)
    except ValueError as exc:
        raise PayrollServiceError(f"{field_name} doit etre au format YYYY-MM-DD.", status_code=400) from exc


@payroll_bp.get("/status")
@jwt_required()
@require_permission("payroll.read")
def payroll_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify(payroll_status_payload(company_id=int(tenant_id) if tenant_id is not None else None)), 200


@payroll_bp.post("/payslips/generate")
@jwt_required()
@require_permission("payroll.manage")
@rate_limit(max_requests=20, window_seconds=60, scope="payroll-payslips-generate")
def payroll_generate_payslips():
    payload = load_json(PayrollGenerateRequestSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        actor_user_id = int(get_jwt_identity())
        response = generate_payslips_via_api(company_id=company_id, actor_user_id=actor_user_id, payload=payload)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/employees")
@jwt_required()
@require_permission("payroll.read")
def payroll_list_employees():
    params = load_query(PayrollEmployeesListQuerySchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, params)
        response = payroll_employees_payload(
            company_id=company_id,
            include_disabled=bool(params.get("include_disabled", False)),
            include_inactive=bool(params.get("include_inactive", False)),
            search=params.get("search"),
        )
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/employees/<int:user_id>/profile")
@jwt_required()
@require_permission("payroll.read")
def payroll_get_employee_profile(user_id: int):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        response = payroll_employee_profile_payload(company_id=company_id, user_id=user_id)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.patch("/employees/<int:user_id>/profile")
@jwt_required()
@require_permission("payroll.manage")
def payroll_update_employee_profile(user_id: int):
    payload = load_json(PayrollEmployeeProfileUpsertSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        response = upsert_payroll_employee_profile(
            company_id=company_id,
            user_id=user_id,
            payload=payload,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll employee profile saved", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.delete("/employees/<int:user_id>/profile")
@jwt_required()
@require_permission("payroll.manage")
def payroll_delete_employee_profile(user_id: int):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        response = delete_payroll_employee_profile(
            company_id=company_id,
            user_id=user_id,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll employee profile deleted", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/periods")
@jwt_required()
@require_permission("payroll.read")
def payroll_list_periods():
    params = load_query(PayrollPeriodListQuerySchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, params)
        response = payroll_periods_payload(
            company_id=company_id,
            limit=int(params["limit"]),
            status=params.get("status"),
        )
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.post("/periods")
@jwt_required()
@require_permission("payroll.manage")
def payroll_create_period():
    payload = load_json(PayrollPeriodDraftSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        response = create_payroll_period_draft(
            company_id=company_id,
            payload=payload,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll period saved", "data": response}), 201
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.patch("/periods/<int:period_id>")
@jwt_required()
@require_permission("payroll.manage")
def payroll_update_period(period_id: int):
    payload = load_json(PayrollPeriodDraftSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        response = update_payroll_period_draft(
            company_id=company_id,
            period_id=period_id,
            payload=payload,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll period updated", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/periods/<int:period_id>/inputs")
@jwt_required()
@require_permission("payroll.read")
def payroll_get_period_inputs(period_id: int):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        response = payroll_period_inputs_payload(company_id=company_id, period_id=period_id)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.put("/periods/<int:period_id>/inputs")
@jwt_required()
@require_permission("payroll.manage")
def payroll_save_period_inputs(period_id: int):
    payload = load_json(PayrollPeriodInputsBulkSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        response = upsert_payroll_period_inputs(
            company_id=company_id,
            period_id=period_id,
            payload=payload,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll period inputs saved", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.delete("/periods/<int:period_id>/inputs/<int:user_id>")
@jwt_required()
@require_permission("payroll.manage")
def payroll_delete_period_input(period_id: int, user_id: int):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        response = delete_payroll_period_input(
            company_id=company_id,
            period_id=period_id,
            user_id=user_id,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Payroll period input deleted", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/runs")
@jwt_required()
@require_permission("payroll.read")
def payroll_list_runs():
    params = load_query(PayrollRunListQuerySchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, params)
        response = payroll_runs_payload(company_id=company_id, limit=int(params["limit"]))
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/me/summary")
@jwt_required()
@require_permission("payroll.read")
def payroll_me_summary():
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        response = payroll_my_summary_payload(company_id=company_id, user_id=actor_user_id)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/me/payslips")
@jwt_required()
@require_permission("payroll.read")
def payroll_me_payslips():
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        limit = max(1, min(int(request.args.get("limit", 24)), 120))
        month = request.args.get("month")
        date_from = _parse_iso_date(request.args.get("date_from"), field_name="date_from")
        date_to = _parse_iso_date(request.args.get("date_to"), field_name="date_to")
        response = payroll_my_payslips_payload(
            company_id=company_id,
            user_id=actor_user_id,
            limit=limit,
            month=month,
            date_from=date_from,
            date_to=date_to,
        )
        return jsonify(response), 200
    except ValueError:
        return jsonify({"message": "limit must be an integer"}), 400
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/me/leave-requests")
@jwt_required()
@require_permission("payroll.read")
def payroll_me_leave_requests():
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        response = payroll_my_leave_requests_payload(company_id=company_id, user_id=actor_user_id)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.post("/me/leave-requests")
@jwt_required()
@require_permission("payroll.read")
@rate_limit(max_requests=20, window_seconds=60, scope="payroll-leave-request-submit")
def payroll_submit_leave_request():
    payload = load_json(PayrollLeaveRequestCreateSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        actor_user_id = int(get_jwt_identity())
        response = create_payroll_my_leave_request(company_id=company_id, user_id=actor_user_id, payload=payload)
        return jsonify({"message": "Leave request saved", "data": response}), 201
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.post("/me/leave-requests/upload-proof")
@jwt_required()
@require_permission("payroll.read")
@rate_limit(max_requests=20, window_seconds=60, scope="payroll-leave-request-upload")
def payroll_upload_leave_request_proof():
    actor_user_id = int(get_jwt_identity())
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        stored_file = store_uploaded_file(
            request.files.get("file"),
            storage_segments=[
                "companies",
                str(company_id),
                "users",
                str(actor_user_id),
                "payroll",
                "leave-proofs",
            ],
            allowed_extensions=LEAVE_REQUEST_ATTACHMENT_EXTENSIONS,
        )
        return (
            jsonify(
                {
                    "message": "Leave proof uploaded",
                    "data": {
                        "supporting_document_url": stored_file.stored_path,
                        "supporting_document_name": stored_file.filename,
                        "size_bytes": stored_file.size_bytes,
                    },
                }
            ),
            201,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/leave-requests")
@jwt_required()
@require_permission("payroll.read")
def payroll_list_leave_requests():
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        response = payroll_leave_requests_payload(company_id=company_id, actor_user_id=actor_user_id)
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/leave-requests/<int:leave_request_id>/attachment")
@jwt_required()
@require_permission("payroll.read")
def payroll_download_leave_request_proof(leave_request_id: int):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        claims = get_jwt() or {}
        permissions = set(claims.get("permissions", []))
        can_manage_payroll = "payroll.manage" in permissions or claims.get("user_type") == "super_admin"
        return download_leave_request_attachment(
            company_id=company_id,
            leave_request_id=leave_request_id,
            user_id=actor_user_id,
            can_manage=can_manage_payroll,
        )
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.patch("/leave-requests/<int:leave_request_id>")
@jwt_required()
@require_permission("payroll.read")
def payroll_update_leave_request_status(leave_request_id: int):
    payload = load_json(PayrollLeaveRequestStatusUpdateSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        actor_user_id = int(get_jwt_identity())
        response = update_payroll_leave_request_status(
            company_id=company_id,
            leave_request_id=leave_request_id,
            payload=payload,
            actor_user_id=actor_user_id,
        )
        return jsonify({"message": "Leave request updated", "data": response}), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.post("/periods/generate")
@jwt_required()
@require_permission("payroll.manage")
@rate_limit(max_requests=10, window_seconds=60, scope="payroll-period-generate")
def payroll_generate_monthly_period():
    payload = load_json(PayrollMonthlyGenerateRequestSchema())
    try:
        company_id = resolve_company_scope(PayrollServiceError, payload)
        actor_user_id = int(get_jwt_identity())
        response = generate_monthly_payslips_via_db(
            company_id=company_id,
            actor_user_id=actor_user_id,
            payload=payload,
        )
        return jsonify(response), 200
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)


@payroll_bp.get("/payslips/download/<period_key>/<filename>")
@jwt_required()
@require_permission("payroll.read")
def payroll_download_generated_payslip(period_key: str, filename: str):
    try:
        company_id = resolve_company_scope(PayrollServiceError)
        actor_user_id = int(get_jwt_identity())
        claims = get_jwt() or {}
        permissions = set(claims.get("permissions", []))
        can_manage_payroll = "payroll.manage" in permissions or claims.get("user_type") == "super_admin"
        if not can_manage_payroll and not user_can_access_generated_payslip(
            company_id=company_id,
            user_id=actor_user_id,
            period_key=period_key,
            filename=filename,
        ):
            raise PayrollServiceError("Acces interdit a ce bulletin.", status_code=403, code="forbidden")
        return download_generated_payslip(company_id=company_id, period_key=period_key, filename=filename)
    except PayrollServiceError as exc:
        return error_response_from_exception(exc)
