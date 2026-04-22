from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity

from app.core.rbac import require_role
from app.core.responses import error_response_from_exception
from app.core.validation import load_json, load_query
from app.modules.admin import service
from app.modules.admin.schemas import (
    AdminAuditLogQuerySchema,
    AdminCompanyCreateSchema,
    AdminCompanyReviewSchema,
    AdminCompanyStatusSchema,
    AdminCompanyUpdateSchema,
    AdminPrimaryAdminAssignSchema,
    AdminUsersListQuerySchema,
    CompanySubscriptionCreateSchema,
    CompanySubscriptionUpdateSchema,
    SubscriptionPlanSchema,
    SubscriptionPlanUpdateSchema,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.get("/stats")
@require_role("platform_super_admin")
def get_stats():
    return jsonify(service.get_platform_stats()), 200


@admin_bp.get("/companies")
@require_role("platform_super_admin")
def get_companies():
    return jsonify({"items": service.list_all_companies()}), 200


@admin_bp.post("/companies")
@require_role("platform_super_admin")
def create_company():
    body = load_json(AdminCompanyCreateSchema())

    try:
        result = service.create_company(body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Company created", "company": result}), 201


@admin_bp.get("/companies/<int:company_id>")
@require_role("platform_super_admin")
def get_company(company_id: int):
    try:
        result = service.get_company_detail(company_id)
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify(result), 200


@admin_bp.patch("/companies/<int:company_id>")
@require_role("platform_super_admin")
def update_company(company_id: int):
    body = load_json(AdminCompanyUpdateSchema())

    try:
        result = service.update_company(company_id, body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Company updated", "company": result}), 200


@admin_bp.delete("/companies/<int:company_id>")
@require_role("platform_super_admin")
def delete_company(company_id: int):
    try:
        result = service.delete_company(company_id, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Company deleted", "data": result}), 200


@admin_bp.patch("/companies/<int:company_id>/status")
@require_role("platform_super_admin")
def update_company_status(company_id: int):
    body = load_json(AdminCompanyStatusSchema())

    try:
        result = service.update_company_status(company_id, body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Company status updated", "company": result}), 200


@admin_bp.patch("/companies/<int:company_id>/review")
@require_role("platform_super_admin")
def review_company_route(company_id: int):
    body = load_json(AdminCompanyReviewSchema())
    decision_map = {
        "approve": "approved",
        "reject": "rejected",
        "pending": "pending",
        "under_review": "under_review",
        "info_requested": "info_requested",
        "suspend": "suspended",
    }

    try:
        result = service.review_company(
            company_id=company_id,
            decision=decision_map[body["action"]],
            note=body.get("note"),
            rejection_reason=body.get("rejection_reason"),
            requested_information=body.get("requested_information"),
            reviewed_by_user_id=int(get_jwt_identity()),
        )
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Company review updated", "company": result}), 200


@admin_bp.post("/companies/<int:company_id>/primary-admin")
@require_role("platform_super_admin")
def assign_primary_admin(company_id: int):
    body = load_json(AdminPrimaryAdminAssignSchema())

    try:
        result = service.assign_company_primary_admin(
            company_id=company_id,
            user_id=body["user_id"],
            actor_user_id=int(get_jwt_identity()),
        )
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Primary admin updated", "company": result}), 200


@admin_bp.get("/subscription-plans")
@require_role("platform_super_admin")
def list_subscription_plans():
    return jsonify({"items": service.list_subscription_plans()}), 200


@admin_bp.post("/subscription-plans")
@require_role("platform_super_admin")
def create_subscription_plan():
    body = load_json(SubscriptionPlanSchema())

    try:
        result = service.create_subscription_plan(body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Subscription plan created", "plan": result}), 201


@admin_bp.patch("/subscription-plans/<int:plan_id>")
@require_role("platform_super_admin")
def update_subscription_plan(plan_id: int):
    body = load_json(SubscriptionPlanUpdateSchema())

    try:
        result = service.update_subscription_plan(plan_id, body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Subscription plan updated", "plan": result}), 200


@admin_bp.get("/companies/<int:company_id>/subscriptions")
@require_role("platform_super_admin")
def get_company_subscriptions(company_id: int):
    try:
        items = service.list_company_subscriptions(company_id)
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"items": items}), 200


@admin_bp.post("/companies/<int:company_id>/subscriptions")
@require_role("platform_super_admin")
def create_company_subscription(company_id: int):
    body = load_json(CompanySubscriptionCreateSchema())

    try:
        result = service.create_company_subscription(company_id, body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Subscription created", "subscription": result}), 201


@admin_bp.patch("/subscriptions/<int:subscription_id>")
@require_role("platform_super_admin")
def update_company_subscription(subscription_id: int):
    body = load_json(CompanySubscriptionUpdateSchema())

    try:
        result = service.update_company_subscription(subscription_id, body, actor_user_id=int(get_jwt_identity()))
    except Exception as exc:
        return error_response_from_exception(exc)

    return jsonify({"message": "Subscription updated", "subscription": result}), 200


@admin_bp.get("/users")
@require_role("platform_super_admin")
def get_users():
    params = load_query(AdminUsersListQuerySchema())
    return jsonify(service.list_all_users(page=params["page"], per_page=params["per_page"])), 200


@admin_bp.get("/audit-logs")
@require_role("platform_super_admin")
def get_audit_logs():
    params = load_query(AdminAuditLogQuerySchema())
    return jsonify(
        service.list_platform_audit_logs(
            company_id=params.get("company_id"),
            user_id=params.get("user_id"),
            limit=params["limit"],
        )
    ), 200
