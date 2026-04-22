from datetime import datetime, timezone

from app.core.responses import error_response
from app.models.company import Company
from app.models.user import User


# Centralized JWT error responses keep API behavior consistent.
def register_jwt_callbacks(jwt):
    @jwt.token_in_blocklist_loader
    def token_in_blocklist_callback(jwt_header, jwt_payload):
        identity = jwt_payload.get("sub")
        token_version = jwt_payload.get("token_version")

        if identity is None:
            return True

        user = User.query.filter_by(id=int(identity)).first()
        if user is None:
            return True

        if user.deleted_at is not None:
            return True

        if not user.is_active:
            return True

        if user.account_status not in ("active",):
            return True

        if user.locked_until is not None and user.locked_until > datetime.now(timezone.utc):
            return True

        if user.user_type != "super_admin" and user.company_id is not None:
            company = Company.query.filter_by(id=user.company_id).first()
            if company is None:
                return True
            if not company.is_active:
                return True
            if company.onboarding_status != "approved":
                return True
            if company.account_status != "active":
                return True

        if token_version is None:
            return False

        return int(user.auth_token_version or 1) != int(token_version)

    @jwt.invalid_token_loader
    def invalid_token_callback(message):
        return error_response("Invalid token", status_code=401, code="invalid_token", details={"detail": message})

    @jwt.unauthorized_loader
    def unauthorized_callback(message):
        return error_response(
            "Missing authorization",
            status_code=401,
            code="missing_authorization",
            details={"detail": message},
        )

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response("Token expired", status_code=401, code="token_expired")

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response("Token revoked", status_code=401, code="token_revoked")
