from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_items
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.models.recruitment import JobOffer
from app.modules.recruitment.service import (
    RecruitmentError,
    apply_to_job_offer,
    create_candidate_profile,
    create_job_offer,
    generate_matches,
    get_my_candidate_profile,
    list_applications,
    list_candidate_profiles,
    list_job_offers,
    list_my_applications,
    list_matches,
    update_application_status,
    update_job_offer,
    upsert_my_candidate_profile,
)

recruitment_bp = Blueprint("recruitment", __name__, url_prefix="/recruitment")


def _resolve_target_company_id(payload: dict | None = None) -> int:
    return resolve_company_scope(RecruitmentError, payload)


@recruitment_bp.get("/status")
@jwt_required()
@require_permission("recruitment.read")
def recruitment_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "recruitment", "status": "ready", "tenant_id": tenant_id}), 200


@recruitment_bp.get("/job-offers")
@jwt_required()
@require_permission("recruitment.read")
@rate_limit(max_requests=90, window_seconds=60, scope="recruitment-offers-list")
def recruitment_list_job_offers():
    status = request.args.get("status")
    include_archived = str(request.args.get("include_archived", "false")).lower() == "true"

    try:
        company_id = _resolve_target_company_id()
        rows = list_job_offers(company_id=company_id, status=status, include_archived=include_archived)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.post("/job-offers")
@jwt_required()
@require_permission("recruitment.manage")
def recruitment_create_job_offer():
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())

    try:
        company_id = _resolve_target_company_id(payload)
        row = create_job_offer(company_id=company_id, publisher_user_id=user_id, payload=payload)
        return jsonify({"message": "Job offer created", "job_offer": row}), 201
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.patch("/job-offers/<int:offer_id>")
@jwt_required()
@require_permission("recruitment.manage")
def recruitment_update_job_offer(offer_id):
    payload = request.get_json(silent=True) or {}

    try:
        company_id = _resolve_target_company_id(payload)
        row = update_job_offer(company_id=company_id, offer_id=offer_id, payload=payload)
        return jsonify({"message": "Job offer updated", "job_offer": row}), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.get("/candidate-profiles")
@jwt_required()
@require_permission("recruitment.read")
def recruitment_list_candidates():
    search = request.args.get("search")
    try:
        rows = list_candidate_profiles(search=search)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.post("/candidate-profiles")
@jwt_required()
@require_permission("recruitment.manage")
def recruitment_create_candidate_profile():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("user_id")
    try:
        parsed_user_id = int(user_id) if user_id is not None else None
        row = create_candidate_profile(payload=payload, user_id=parsed_user_id)
        return jsonify({"message": "Candidate profile created", "candidate": row}), 201
    except ValueError:
        return jsonify({"message": "user_id must be an integer"}), 400
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.get("/candidate-profiles/me")
@jwt_required()
def recruitment_get_my_profile():
    user_id = int(get_jwt_identity())
    try:
        row = get_my_candidate_profile(user_id=user_id)
        return jsonify({"candidate": row}), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.put("/candidate-profiles/me")
@jwt_required()
def recruitment_upsert_my_profile():
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())
    try:
        row = upsert_my_candidate_profile(user_id=user_id, payload=payload)
        return jsonify({"message": "Candidate profile saved", "candidate": row}), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.get("/applications/me")
@jwt_required()
def recruitment_list_my_applications():
    user_id = int(get_jwt_identity())
    company_id = resolve_tenant_context(optional=True)

    try:
        rows = list_my_applications(user_id=user_id, company_id=company_id)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.post("/job-offers/<int:offer_id>/apply")
@jwt_required()
def recruitment_apply(offer_id):
    payload = request.get_json(silent=True) or {}
    user_id = int(get_jwt_identity())

    offer = JobOffer.query.filter_by(id=offer_id).first()
    if offer is None or offer.deleted_at is not None:
        return jsonify({"message": "Job offer not found"}), 404

    try:
        row = apply_to_job_offer(
            company_id=offer.company_id,
            offer_id=offer_id,
            applicant_user_id=user_id,
            payload=payload,
        )
        return jsonify({"message": "Application submitted", "application": row}), 201
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.get("/applications")
@jwt_required()
@require_permission("recruitment.read")
@rate_limit(max_requests=90, window_seconds=60, scope="recruitment-applications-list")
def recruitment_list_applications():
    job_offer_id = request.args.get("job_offer_id")
    status = request.args.get("status")

    try:
        company_id = _resolve_target_company_id()
        parsed_offer_id = int(job_offer_id) if job_offer_id is not None else None
        rows = list_applications(company_id=company_id, job_offer_id=parsed_offer_id, status=status)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except ValueError:
        return jsonify({"message": "job_offer_id must be an integer"}), 400
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.patch("/applications/<int:application_id>")
@jwt_required()
@require_permission("recruitment.manage")
def recruitment_update_application(application_id):
    payload = request.get_json(silent=True) or {}
    try:
        company_id = _resolve_target_company_id(payload)
        row = update_application_status(company_id=company_id, application_id=application_id, payload=payload)
        return jsonify({"message": "Application updated", "application": row}), 200
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.post("/job-offers/<int:offer_id>/matches/generate")
@jwt_required()
@require_permission("recruitment.manage")
def recruitment_generate_matches(offer_id):
    payload = request.get_json(silent=True) or {}
    limit = payload.get("limit", request.args.get("limit", 20))

    try:
        company_id = _resolve_target_company_id(payload)
        rows = generate_matches(company_id=company_id, offer_id=offer_id, limit=int(limit))
        return jsonify({"items": rows, "count": len(rows)}), 200
    except ValueError:
        return jsonify({"message": "limit must be an integer"}), 400
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code


@recruitment_bp.get("/matches")
@jwt_required()
@require_permission("recruitment.read")
@rate_limit(max_requests=90, window_seconds=60, scope="recruitment-matches-list")
def recruitment_list_matches():
    offer_id = request.args.get("offer_id")
    try:
        company_id = _resolve_target_company_id()
        parsed_offer_id = int(offer_id) if offer_id is not None else None
        rows = list_matches(company_id=company_id, offer_id=parsed_offer_id)
        page, page_size = get_pagination_params(default_page_size=30)
        paginated = paginate_items(rows, page, page_size)
        return jsonify(paginated), 200
    except ValueError:
        return jsonify({"message": "offer_id must be an integer"}), 400
    except RecruitmentError as exc:
        return jsonify({"message": exc.message}), exc.status_code
