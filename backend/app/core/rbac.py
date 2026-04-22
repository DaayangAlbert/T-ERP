from functools import wraps

from flask import request
from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.core.multitenancy import resolve_authenticated_company_id
from app.core.responses import error_response


def require_permission(permission_key):
    # Backward-compatible helper for single permission checks.
    return require_permissions(all_of=[permission_key])


def require_permissions(*, all_of=None, any_of=None, allow_super_admin=True, enforce_tenant=True):
    all_of = all_of or []
    any_of = any_of or []

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            permissions = set(claims.get("permissions", []))
            user_type = claims.get("user_type")
            claim_company_id = resolve_authenticated_company_id(claims=claims)
            header_company_id = request.headers.get("X-Tenant-ID")

            if enforce_tenant and claim_company_id is not None and header_company_id is not None:
                if str(claim_company_id) != str(header_company_id):
                    return error_response("Tenant mismatch", status_code=403, code="tenant_mismatch")

            if allow_super_admin and user_type == "super_admin":
                return fn(*args, **kwargs)

            if all_of and not all(permission in permissions for permission in all_of):
                return error_response(
                    "Forbidden",
                    status_code=403,
                    code="missing_permissions",
                    details={"missing_permissions": all_of},
                )

            if any_of and not any(permission in permissions for permission in any_of):
                return error_response(
                    "Forbidden",
                    status_code=403,
                    code="missing_permissions",
                    details={"missing_any_of_permissions": any_of},
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_role(role_code, allow_super_admin=True):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_type = claims.get("user_type")
            roles = set(claims.get("roles", []))

            if allow_super_admin and user_type == "super_admin":
                return fn(*args, **kwargs)

            if role_code not in roles:
                return error_response(
                    "Forbidden",
                    status_code=403,
                    code="missing_role",
                    details={"missing_role": role_code},
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator
