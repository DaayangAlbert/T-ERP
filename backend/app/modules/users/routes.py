import mimetypes

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.file_storage import FileStorageError, get_stored_file_name, resolve_stored_file, store_uploaded_file
from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_query
from app.core.responses import error_response_from_exception
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.core.validation import load_json, load_query
from app.models.user import User
from app.modules.users.schemas import (
    AssignRolesSchema,
    NotificationMarkSeenSchema,
    OrganizationUnitCreateSchema,
    OrganizationUnitListQuerySchema,
    OrganizationUnitUpdateSchema,
    RoleCreateSchema,
    UpdateLanguageSchema,
    UserSelfServiceProfileUpdateSchema,
    UserActivityLogQuerySchema,
    UserCreateSchema,
    UserResetPasswordSchema,
    UserStatusUpdateSchema,
    UserUpdateSchema,
    UsersListQuerySchema,
)
from app.modules.users.service import (
    UserManagementError,
    assign_roles,
    build_users_query,
    create_role,
    create_organization_unit,
    create_user,
    force_logout_user,
    get_my_notifications,
    get_my_profile_settings,
    get_company_dashboard,
    list_activity_logs,
    list_organization_units,
    list_operational_profiles,
    list_roles,
    mark_my_notifications_seen,
    reset_user_password,
    serialize_user,
    update_my_profile_settings,
    update_organization_unit,
    update_user,
    update_user_language,
    update_user_status,
)

users_bp = Blueprint("users", __name__, url_prefix="/users")


PROFILE_ASSET_CONFIG = {
    "profile_photo": {
        "field": "profile_photo_url",
        "extensions": {".png", ".jpg", ".jpeg", ".webp", ".gif"},
        "as_attachment": False,
    },
    "identity_document": {
        "field": "identity_document_url",
        "extensions": {".png", ".jpg", ".jpeg", ".webp", ".pdf"},
        "as_attachment": True,
    },
    "cv": {
        "field": "cv_url",
        "extensions": {".pdf", ".doc", ".docx"},
        "as_attachment": True,
    },
}


def _get_profile_asset_config(asset_kind: str) -> dict:
    config = PROFILE_ASSET_CONFIG.get(str(asset_kind or "").strip().lower())
    if config is None:
        raise UserManagementError("Type de fichier profil non supporte.", status_code=400)
    return config


def _get_authenticated_user(user_id: int) -> User:
    user = User.query.filter_by(id=user_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found", status_code=404)
    return user


def _get_company_scoped_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise UserManagementError("User not found in company", status_code=404)
    return user


@users_bp.get("/status")
@jwt_required()
@require_permission("users.read")
def users_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "users", "status": "ready", "tenant_id": tenant_id}), 200


@users_bp.get("")
@jwt_required()
@require_permission("users.read")
@rate_limit(max_requests=80, window_seconds=60, scope="users-list")
def users_list():
    params = load_query(UsersListQuerySchema())
    try:
        company_id = resolve_company_scope(UserManagementError, params)
        query = build_users_query(
            company_id=company_id,
            include_inactive=params["include_inactive"],
            search=params.get("search"),
            department=params.get("department"),
            contract_type=params.get("contract_type"),
            account_status=params.get("account_status"),
            user_type=params.get("user_type"),
            hierarchy_level=params.get("hierarchy_level"),
            organization_unit_id=params.get("organization_unit_id"),
        )
        page, page_size = get_pagination_params()
        paginated = paginate_query(query, page, page_size, serialize_user)
        return jsonify(paginated), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("")
@jwt_required()
@require_permission("users.manage")
@rate_limit(max_requests=40, window_seconds=60, scope="users-create")
def users_create():
    payload = load_json(UserCreateSchema())
    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        user = create_user(company_id=company_id, payload=payload, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "User created", "user": user}), 201
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/operational-profiles")
@jwt_required()
@require_permission("users.read")
def users_operational_profiles():
    try:
        company_id = resolve_company_scope(UserManagementError)
        payload = list_operational_profiles(company_id=company_id)
        return jsonify(payload), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/organization-units")
@jwt_required()
@require_permission("users.read")
def users_organization_units():
    params = load_query(OrganizationUnitListQuerySchema())
    try:
        company_id = resolve_company_scope(UserManagementError, params)
        payload = list_organization_units(company_id=company_id, active_only=params["active_only"])
        return jsonify(payload), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/organization-units")
@jwt_required()
@require_permission("users.manage")
def users_organization_units_create():
    payload = load_json(OrganizationUnitCreateSchema())
    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        unit = create_organization_unit(company_id=company_id, payload=payload, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "Organization unit created", "organization_unit": unit}), 201
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/organization-units/<int:organization_unit_id>")
@jwt_required()
@require_permission("users.manage")
def users_organization_units_update(organization_unit_id):
    payload = load_json(OrganizationUnitUpdateSchema())
    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        unit = update_organization_unit(
            company_id=company_id,
            organization_unit_id=organization_unit_id,
            payload=payload,
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Organization unit updated", "organization_unit": unit}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/roles")
@jwt_required()
@require_permission("users.read")
def users_roles_list():
    try:
        company_id = resolve_company_scope(UserManagementError)
        rows = list_roles(company_id=company_id)
        return jsonify({"items": rows, "count": len(rows)}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/roles")
@jwt_required()
@require_permission("users.manage")
def users_role_create():
    payload = load_json(RoleCreateSchema())
    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        role = create_role(company_id=company_id, payload=payload)
        return jsonify({"message": "Role created", "role": role}), 201
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.put("/<int:user_id>/roles")
@jwt_required()
@require_permission("users.manage")
def users_assign_roles(user_id):
    payload = load_json(AssignRolesSchema())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = assign_roles(
            company_id=company_id,
            user_id=user_id,
            role_ids=payload["role_ids"],
            replace=payload["replace"],
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "User roles updated", "data": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/<int:user_id>")
@jwt_required()
@require_permission("users.manage")
def users_update(user_id):
    payload = load_json(UserUpdateSchema())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = update_user(company_id=company_id, user_id=user_id, payload=payload, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "User updated", "user": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/<int:user_id>/status")
@jwt_required()
@require_permission("users.manage")
def users_update_status(user_id):
    payload = load_json(UserStatusUpdateSchema())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = update_user_status(company_id=company_id, user_id=user_id, payload=payload, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "User status updated", "user": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/<int:user_id>/reset-password")
@jwt_required()
@require_permission("users.manage")
def users_reset_password(user_id):
    payload = load_json(UserResetPasswordSchema())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = reset_user_password(
            company_id=company_id,
            user_id=user_id,
            new_password=payload["new_password"],
            must_change_password=payload["must_change_password"],
            actor_user_id=int(get_jwt_identity()),
        )
        return jsonify({"message": "Password reset", "user": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/<int:user_id>/force-logout")
@jwt_required()
@require_permission("users.manage")
def users_force_logout(user_id):
    try:
        company_id = resolve_company_scope(UserManagementError)
        result = force_logout_user(company_id=company_id, user_id=user_id, actor_user_id=int(get_jwt_identity()))
        return jsonify({"message": "User sessions revoked", "user": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/me/language")
@jwt_required()
def users_update_my_language():
    payload = load_json(UpdateLanguageSchema())
    user_id = int(get_jwt_identity())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = update_user_language(
            company_id=company_id,
            user_id=user_id,
            preferred_language=payload["preferred_language"],
        )
        return jsonify({"message": "Language updated", "data": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/me/profile")
@jwt_required()
def users_get_my_profile():
    try:
        result = get_my_profile_settings(user_id=int(get_jwt_identity()))
        return jsonify(result), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/me/profile")
@jwt_required()
def users_update_my_profile():
    payload = load_json(UserSelfServiceProfileUpdateSchema())
    try:
        result = update_my_profile_settings(user_id=int(get_jwt_identity()), payload=payload)
        return jsonify({"message": "Profile updated", "data": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/me/profile/uploads/<string:asset_kind>")
@jwt_required()
@rate_limit(max_requests=20, window_seconds=60, scope="users-profile-upload")
def users_upload_my_profile_asset(asset_kind: str):
    user_id = int(get_jwt_identity())
    try:
        config = _get_profile_asset_config(asset_kind)
        user = _get_authenticated_user(user_id)
        stored_file = store_uploaded_file(
            request.files.get("file"),
            storage_segments=[
                "companies",
                str(user.company_id or "global"),
                "users",
                str(user.id),
                "profile",
                asset_kind,
            ],
            allowed_extensions=config["extensions"],
        )
        result = update_my_profile_settings(
            user_id=user.id,
            payload={config["field"]: stored_file.stored_path},
        )
        return (
            jsonify(
                {
                    "message": "Profile asset uploaded",
                    "data": result,
                    "upload": {
                        "asset_kind": asset_kind,
                        "filename": stored_file.filename,
                        "size_bytes": stored_file.size_bytes,
                        "download_url": f"/api/v1/users/me/profile/assets/{asset_kind}",
                    },
                }
            ),
            201,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/me/profile/assets/<string:asset_kind>")
@jwt_required()
def users_download_my_profile_asset(asset_kind: str):
    user_id = int(get_jwt_identity())
    try:
        config = _get_profile_asset_config(asset_kind)
        user = _get_authenticated_user(user_id)
        stored_path = getattr(user, config["field"])
        absolute_path = resolve_stored_file(stored_path)
        filename = get_stored_file_name(stored_path) or absolute_path.name
        mimetype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        return send_file(
            absolute_path,
            mimetype=mimetype,
            as_attachment=bool(config["as_attachment"]),
            download_name=filename,
            max_age=0,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/<int:user_id>/profile-assets/<string:asset_kind>")
@jwt_required()
@require_permission("users.manage")
@rate_limit(max_requests=20, window_seconds=60, scope="users-profile-upload-admin")
def users_upload_profile_asset(user_id: int, asset_kind: str):
    try:
        company_id = resolve_company_scope(UserManagementError)
        config = _get_profile_asset_config(asset_kind)
        target_user = _get_company_scoped_user(company_id, user_id)
        stored_file = store_uploaded_file(
            request.files.get("file"),
            storage_segments=[
                "companies",
                str(target_user.company_id or "global"),
                "users",
                str(target_user.id),
                "profile",
                asset_kind,
            ],
            allowed_extensions=config["extensions"],
        )
        updated_user = update_user(
            company_id=company_id,
            user_id=target_user.id,
            payload={config["field"]: stored_file.stored_path},
            actor_user_id=int(get_jwt_identity()),
        )
        return (
            jsonify(
                {
                    "message": "User profile asset uploaded",
                    "user": updated_user,
                    "upload": {
                        "asset_kind": asset_kind,
                        "filename": stored_file.filename,
                        "size_bytes": stored_file.size_bytes,
                        "download_url": f"/api/v1/users/{target_user.id}/profile-assets/{asset_kind}",
                    },
                }
            ),
            201,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/<int:user_id>/profile-assets/<string:asset_kind>")
@jwt_required()
@require_permission("users.manage")
def users_download_profile_asset(user_id: int, asset_kind: str):
    try:
        company_id = resolve_company_scope(UserManagementError)
        config = _get_profile_asset_config(asset_kind)
        user = _get_company_scoped_user(company_id, user_id)
        stored_path = getattr(user, config["field"])
        absolute_path = resolve_stored_file(stored_path)
        filename = get_stored_file_name(stored_path) or absolute_path.name
        mimetype = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        return send_file(
            absolute_path,
            mimetype=mimetype,
            as_attachment=bool(config["as_attachment"]),
            download_name=filename,
            max_age=0,
        )
    except FileStorageError as exc:
        return jsonify({"message": exc.message}), exc.status_code
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/me/notifications")
@jwt_required()
def users_get_my_notifications():
    try:
        result = get_my_notifications(user_id=int(get_jwt_identity()))
        return jsonify(result), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.post("/me/notifications/mark-seen")
@jwt_required()
def users_mark_my_notifications_seen():
    payload = load_json(NotificationMarkSeenSchema())
    try:
        result = mark_my_notifications_seen(
            user_id=int(get_jwt_identity()),
            categories=payload["categories"],
        )
        return jsonify({"message": "Notifications updated", "data": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.patch("/<int:user_id>/language")
@jwt_required()
@require_permission("users.manage")
def users_update_language(user_id):
    payload = load_json(UpdateLanguageSchema())

    try:
        company_id = resolve_company_scope(UserManagementError, payload)
        result = update_user_language(
            company_id=company_id,
            user_id=user_id,
            preferred_language=payload["preferred_language"],
        )
        return jsonify({"message": "Language updated", "data": result}), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/activity-logs")
@jwt_required()
@require_permission("users.read")
def users_activity_logs():
    params = load_query(UserActivityLogQuerySchema())

    try:
        company_id = resolve_company_scope(UserManagementError, params)
        result = list_activity_logs(company_id=company_id, user_id=params.get("user_id"), limit=params["limit"])
        return jsonify(result), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)


@users_bp.get("/dashboard")
@jwt_required()
@require_permission("users.read")
def users_dashboard():
    try:
        company_id = resolve_company_scope(UserManagementError)
        result = get_company_dashboard(company_id=company_id)
        return jsonify(result), 200
    except UserManagementError as exc:
        return error_response_from_exception(exc)
