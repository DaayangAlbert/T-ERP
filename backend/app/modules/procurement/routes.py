from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_items
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.modules.procurement.service import (
    ProcurementError,
    create_checklist_item,
    create_submission,
    create_tender,
    list_checklist_items,
    list_submissions,
    list_tenders,
    procurement_summary,
    update_submission,
    update_tender,
)

procurement_bp = Blueprint("procurement", __name__, url_prefix="/procurement")


def _resolve_target_company_id(payload: dict | None = None) -> int:
    return resolve_company_scope(ProcurementError, payload)


@procurement_bp.get("/status")
@jwt_required()
@require_permission("procurement.read")
def procurement_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "procurement", "status": "ready", "tenant_id": tenant_id}), 200


@procurement_bp.get("/summary")
@jwt_required()
@require_permission("procurement.read")
def procurement_get_summary():
    try:
        company_id = _resolve_target_company_id()
        return jsonify(procurement_summary(company_id=company_id)), 200
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.get("/tenders")
@jwt_required()
@require_permission("procurement.read")
@rate_limit(max_requests=100, window_seconds=60, scope="procurement-tenders-list")
def procurement_tenders_list():
    status = request.args.get("status")
    include_archived = str(request.args.get("include_archived", "false")).lower() == "true"
    try:
        company_id = _resolve_target_company_id()
        rows = list_tenders(company_id=company_id, status=status, include_archived=include_archived)
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_items(rows, page, page_size)), 200
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.post("/tenders")
@jwt_required()
@require_permission("procurement.manage")
def procurement_tenders_create():
    payload = request.get_json(silent=True) or {}
    try:
        company_id = _resolve_target_company_id(payload)
        row = create_tender(company_id=company_id, payload=payload)
        return jsonify({"message": "Tender created", "tender": row}), 201
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.patch("/tenders/<int:tender_id>")
@jwt_required()
@require_permission("procurement.manage")
def procurement_tenders_update(tender_id):
    payload = request.get_json(silent=True) or {}
    try:
        company_id = _resolve_target_company_id(payload)
        row = update_tender(company_id=company_id, tender_id=tender_id, payload=payload)
        return jsonify({"message": "Tender updated", "tender": row}), 200
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.get("/tenders/<int:tender_id>/checklist")
@jwt_required()
@require_permission("procurement.read")
def procurement_checklist_list(tender_id):
    try:
        company_id = _resolve_target_company_id()
        rows = list_checklist_items(company_id=company_id, tender_id=tender_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.post("/tenders/<int:tender_id>/checklist")
@jwt_required()
@require_permission("procurement.manage")
def procurement_checklist_create(tender_id):
    payload = request.get_json(silent=True) or {}
    try:
        company_id = _resolve_target_company_id(payload)
        row = create_checklist_item(company_id=company_id, tender_id=tender_id, payload=payload)
        return jsonify({"message": "Checklist item created", "item": row}), 201
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.get("/submissions")
@jwt_required()
@require_permission("procurement.read")
def procurement_submissions_list():
    tender_id = request.args.get("tender_id")
    status = request.args.get("status")
    try:
        company_id = _resolve_target_company_id()
        parsed_tender_id = int(tender_id) if tender_id is not None else None
        rows = list_submissions(company_id=company_id, tender_id=parsed_tender_id, status=status)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ValueError:
        return jsonify({"message": "tender_id must be an integer"}), 400
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.post("/tenders/<int:tender_id>/submissions")
@jwt_required()
@require_permission("procurement.manage")
def procurement_submissions_create(tender_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        company_id = _resolve_target_company_id(payload)
        row = create_submission(company_id=company_id, tender_id=tender_id, submitted_by_user_id=user_id, payload=payload)
        return jsonify({"message": "Tender submission created", "submission": row}), 201
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@procurement_bp.patch("/submissions/<int:submission_id>")
@jwt_required()
@require_permission("procurement.manage")
def procurement_submissions_update(submission_id):
    payload = request.get_json(silent=True) or {}
    try:
        company_id = _resolve_target_company_id(payload)
        row = update_submission(company_id=company_id, submission_id=submission_id, payload=payload)
        return jsonify({"message": "Submission updated", "submission": row}), 200
    except ProcurementError as exc:
        return jsonify({"message": exc.message}), exc.status_code
