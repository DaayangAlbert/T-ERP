from flask import g, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request


_MISSING = object()


class TenantContextError(Exception):
    def __init__(self, message: str, *, status_code: int = 400, code: str = "tenant_context_error"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def _coerce_company_id(value):
    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def resolve_authenticated_company_id(*, claims: dict | None = None, identity=None):
    cached_company_id = getattr(g, "_authenticated_company_id", _MISSING)
    if cached_company_id is not _MISSING:
        return cached_company_id

    claims = claims if claims is not None else get_jwt()
    identity = identity if identity is not None else get_jwt_identity()
    resolved_company_id = _coerce_company_id(claims.get("company_id"))

    if resolved_company_id is None and claims.get("user_type") != "super_admin" and identity is not None:
        from app.models.user import User

        try:
            user_id = int(identity)
        except (TypeError, ValueError):
            user_id = None

        user = User.query.filter_by(id=user_id).first() if user_id is not None else None
        if user is not None and user.user_type != "super_admin":
            resolved_company_id = _coerce_company_id(user.company_id)

    g._authenticated_company_id = resolved_company_id
    return resolved_company_id


def resolve_tenant_context(optional=False):
    try:
        verify_jwt_in_request(optional=optional)
    except Exception as exc:
        if optional:
            return None
        raise TenantContextError("Authentication required for tenant context", status_code=401, code="authentication_required") from exc

    identity = get_jwt_identity() if not optional else get_jwt_identity()
    claims = get_jwt() if identity is not None else {}
    token_company_id = resolve_authenticated_company_id(claims=claims, identity=identity) if identity is not None else None
    tenant_id_header = request.headers.get("X-Tenant-ID")

    if token_company_id is not None:
        tenant_id = token_company_id
        if tenant_id_header is not None and str(tenant_id_header) != str(token_company_id):
            raise TenantContextError("Tenant mismatch between token and header", status_code=403, code="tenant_mismatch")
    else:
        tenant_id = tenant_id_header

    g.tenant_id = tenant_id
    g.user_identity = identity
    return tenant_id


def resolve_target_company_id(error_cls, payload: dict | None = None, query_param_name: str = "company_id") -> int:
    payload = payload or {}
    claims = get_jwt()
    token_company_id = resolve_authenticated_company_id(claims=claims)
    user_type = claims.get("user_type")

    tenant_id = resolve_tenant_context(optional=True)
    if tenant_id is not None:
        return int(tenant_id)

    if token_company_id is not None:
        return int(token_company_id)

    if user_type == "super_admin":
        candidate = payload.get(query_param_name) or request.args.get(query_param_name)
        if candidate is None:
            raise error_cls(f"{query_param_name} is required for super admin context", status_code=400)
        try:
            return int(candidate)
        except (TypeError, ValueError) as exc:
            raise error_cls(f"{query_param_name} must be an integer", status_code=400) from exc

    raise error_cls("Unable to resolve tenant company", status_code=400)
