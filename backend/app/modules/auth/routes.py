from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.core.responses import error_response, error_response_from_exception
from app.core.security import rate_limit
from app.core.validation import load_json
from app.models.user import User
from app.modules.auth.schemas import BootstrapSuperAdminSchema, LoginSchema
from app.modules.auth.service import (
    AuthError,
    authenticate_user,
    bootstrap_super_admin,
    issue_tokens_for_user,
    resolve_company_scope_for_user,
    serialize_authenticated_user,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/status")
def auth_status():
    return jsonify({"module": "auth", "status": "ready"}), 200


@auth_bp.post("/login")
@rate_limit(max_requests=12, window_seconds=60, scope="auth-login")
def login():
    payload = load_json(LoginSchema())

    try:
        user, effective_company_id = authenticate_user(
            email=payload["email"],
            password=payload["password"],
            company_id=payload.get("company_id"),
        )
        token_payload = issue_tokens_for_user(user, effective_company_id)
        return jsonify(token_payload), 200
    except AuthError as exc:
        return error_response_from_exception(exc)


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
@rate_limit(max_requests=30, window_seconds=60, scope="auth-refresh")
def refresh_access_token():
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if user is None:
        return error_response("User not found", status_code=404, code="user_not_found")

    company_id = resolve_company_scope_for_user(user, claims.get("company_id"))
    token_payload = issue_tokens_for_user(user, company_id)
    return jsonify({"access_token": token_payload["access_token"], "token_type": "Bearer"}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    claims = get_jwt()
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if user is None:
        return error_response("User not found", status_code=404, code="user_not_found")

    company_id = resolve_company_scope_for_user(user, claims.get("company_id"))
    payload = serialize_authenticated_user(
        user,
        company_id,
        roles=claims.get("roles", []),
        permissions=claims.get("permissions", []),
    )
    return jsonify(payload), 200


@auth_bp.post("/bootstrap-super-admin")
@rate_limit(max_requests=3, window_seconds=300, scope="auth-bootstrap")
def bootstrap_admin():
    payload = load_json(BootstrapSuperAdminSchema())

    try:
        result = bootstrap_super_admin(payload)
        return jsonify(result), 201
    except AuthError as exc:
        return error_response_from_exception(exc)
