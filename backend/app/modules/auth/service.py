from typing import Any
from datetime import datetime, timezone

from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token
from sqlalchemy import func, or_
from werkzeug.security import check_password_hash, generate_password_hash

from app.core.audit import log_audit_event
from app.core.default_profiles import DEFAULT_PERMISSION_CODES, ensure_permissions_exist
from app.extensions import db
from app.models.company import Company
from app.models.user import Permission, Role, RolePermission, User, UserRole


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400, *, code: str | None = None, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def hash_password(raw_password: str) -> str:
    return generate_password_hash(raw_password)


def verify_password(raw_password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, raw_password)


def _get_user_roles(user_id: int, company_id: int | None) -> list[str]:
    query = (
        db.session.query(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id)
    )

    if company_id is not None:
        query = query.filter(or_(UserRole.company_id == company_id, UserRole.company_id.is_(None)))
    else:
        query = query.filter(UserRole.company_id.is_(None))

    return sorted({row.code for row in query.all()})


def _get_user_permissions(user_id: int, company_id: int | None) -> list[str]:
    query = (
        db.session.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id)
    )

    if company_id is not None:
        query = query.filter(or_(UserRole.company_id == company_id, UserRole.company_id.is_(None)))
        query = query.filter(or_(Role.company_id == company_id, Role.company_id.is_(None)))
    else:
        query = query.filter(UserRole.company_id.is_(None))

    return sorted({row.code for row in query.all()})


def serialize_authenticated_user(
    user: User,
    company_id: int | None,
    *,
    roles: list[str] | None = None,
    permissions: list[str] | None = None,
) -> dict[str, Any]:
    resolved_roles = roles if roles is not None else _get_user_roles(user.id, company_id)
    resolved_permissions = permissions if permissions is not None else _get_user_permissions(user.id, company_id)
    company_context = _serialize_company_context(company_id)

    # Local import avoids a module cycle because the users service already depends on auth helpers.
    from app.modules.users.service import serialize_user

    serialized_user = serialize_user(user)
    return {
        "id": serialized_user["id"],
        "email": serialized_user["email"],
        "first_name": serialized_user["first_name"],
        "last_name": serialized_user["last_name"],
        "full_name": serialized_user["full_name"],
        "user_type": serialized_user["user_type"],
        "company_id": company_id,
        "login_identifier": serialized_user["login_identifier"],
        "job_title": serialized_user["job_title"],
        "department": serialized_user["department"],
        "hierarchy_level": serialized_user["hierarchy_level"],
        "preferred_language": serialized_user["preferred_language"],
        "account_status": serialized_user["account_status"],
        "must_change_password": serialized_user["must_change_password"],
        "is_primary_admin": serialized_user["is_primary_admin"],
        "last_login_at": serialized_user["last_login_at"],
        "profile_photo_url": serialized_user["profile_photo_url"],
        "operational_profile_code": serialized_user["operational_profile_code"],
        "organization_assignment": serialized_user["organization_assignment"],
        "organization_unit_id": serialized_user["organization_unit_id"],
        "organization_unit": serialized_user["organization_unit"],
        "company_context": company_context,
        "company_onboarding_status": company_context["onboarding_status"] if company_context else None,
        "company_account_status": company_context["account_status"] if company_context else None,
        "company_subscription_status": company_context["subscription_status"] if company_context else None,
        "company_setup_status": company_context["setup_status"] if company_context else None,
        "company_setup_pending": bool(company_context and company_context["setup_status"] != "complete"),
        "company_setup_completion_percent": company_context["setup_completion_percent"] if company_context else None,
        "company_setup_pending_task_codes": company_context["setup_pending_task_codes"] if company_context else [],
        "roles": resolved_roles,
        "permissions": resolved_permissions,
    }


def _serialize_company_context(company_id: int | None) -> dict[str, Any] | None:
    if company_id is None:
        return None

    # Local import avoids tying auth to the full company module at import time.
    from app.modules.companies.service import get_company_with_settings

    company_payload = get_company_with_settings(company_id)
    setup = company_payload.get("setup") or {}
    return {
        "id": company_payload["id"],
        "legal_name": company_payload["legal_name"],
        "onboarding_status": company_payload["onboarding_status"],
        "account_status": company_payload["account_status"],
        "subscription_status": company_payload["subscription_status"],
        "is_active": company_payload["is_active"],
        "setup_status": setup.get("status"),
        "setup_completion_percent": setup.get("completion_percent"),
        "setup_pending_task_codes": setup.get("pending_task_codes") or [],
    }


def _resolve_company_login_block(company: Company | None) -> tuple[str, str]:
    if company is None:
        return "Company account could not be found", "company_not_found"

    if company.account_status == "suspended" or company.onboarding_status == "suspended":
        return "Company account is suspended. Contact platform support.", "company_suspended"

    if company.onboarding_status == "info_requested":
        return "Additional company information is required before approval.", "company_info_requested"

    if company.onboarding_status == "under_review":
        return "Company registration is under review.", "company_under_review"

    if company.onboarding_status == "pending":
        return "Company registration is pending approval.", "company_pending_approval"

    if company.onboarding_status == "rejected" or company.account_status == "rejected":
        return "Company registration was rejected.", "company_rejected"

    if company.account_status == "expired" or company.subscription_status == "expired":
        return "Company subscription has expired.", "company_subscription_expired"

    return "Company is not approved or inactive", "company_inactive"


def authenticate_user(email: str, password: str, company_id: int | None) -> tuple[User, int | None]:
    normalized_email = email.strip().lower()
    now = datetime.now(timezone.utc)
    base_query = User.query.filter(
        or_(func.lower(User.email) == normalized_email, func.lower(User.login_identifier) == normalized_email),
        User.deleted_at.is_(None),
    )

    if company_id is None:
        candidates = base_query.all()
        if len(candidates) == 1:
            user = candidates[0]
        elif len(candidates) == 0:
            user = None
        else:
            raise AuthError("company_id is required for this account", status_code=400)
    else:
        user = base_query.filter(User.company_id == company_id).first()

    if user is None or not verify_password(password, user.password_hash):
        log_audit_event(
            module="auth",
            action="login_failed",
            company_id=company_id,
            actor_email=normalized_email,
            description="Failed authentication attempt",
            details={"reason": "invalid_credentials"},
        )
        db.session.commit()
        raise AuthError("Invalid credentials", status_code=401, code="invalid_credentials")

    if user.locked_until is not None and user.locked_until > now:
        log_audit_event(
            module="security",
            action="login_blocked",
            company_id=user.company_id,
            actor_user_id=user.id,
            actor_email=user.email,
            target_type="user",
            target_id=user.id,
            description="Login blocked because account is temporarily locked",
            details={"locked_until": user.locked_until.isoformat()},
        )
        db.session.commit()
        raise AuthError("User account is temporarily locked", status_code=403, code="user_locked")

    if not user.is_active or user.account_status != "active":
        log_audit_event(
            module="security",
            action="login_blocked",
            company_id=user.company_id,
            actor_user_id=user.id,
            actor_email=user.email,
            target_type="user",
            target_id=user.id,
            description="Login blocked because account is not active",
            details={"account_status": user.account_status},
        )
        db.session.commit()
        raise AuthError("User account is not active", status_code=403, code="user_inactive")

    if user.user_type != "super_admin" and user.company_id is not None:
        company = Company.query.filter_by(id=user.company_id).first()
        if (
            company is None
            or not company.is_active
            or company.onboarding_status != "approved"
            or company.account_status != "active"
        ):
            message, code = _resolve_company_login_block(company)
            log_audit_event(
                module="security",
                action="login_blocked",
                company_id=user.company_id,
                actor_user_id=user.id,
                actor_email=user.email,
                target_type="company",
                target_id=user.company_id,
                description=message,
                details={
                    "company_onboarding_status": company.onboarding_status if company else None,
                    "company_account_status": company.account_status if company else None,
                    "company_subscription_status": company.subscription_status if company else None,
                },
            )
            db.session.commit()
            raise AuthError(
                message,
                status_code=403,
                code=code,
                details={
                    "company_onboarding_status": company.onboarding_status if company else None,
                    "company_account_status": company.account_status if company else None,
                    "company_subscription_status": company.subscription_status if company else None,
                },
            )

    effective_company_id = user.company_id if user.user_type != "super_admin" else company_id
    user.last_login_at = now
    log_audit_event(
        module="auth",
        action="login_success",
        company_id=effective_company_id or user.company_id,
        actor_user_id=user.id,
        actor_email=user.email,
        target_type="user",
        target_id=user.id,
        description="User authenticated successfully",
        details={
            "effective_company_id": effective_company_id,
            "must_change_password": user.must_change_password,
        },
    )
    db.session.commit()
    return user, effective_company_id


def issue_tokens_for_user(user: User, company_id: int | None) -> dict[str, Any]:
    roles = _get_user_roles(user.id, company_id)
    permissions = _get_user_permissions(user.id, company_id)

    claims = {
        "company_id": company_id,
        "user_type": user.user_type,
        "preferred_language": user.preferred_language,
        "roles": roles,
        "permissions": permissions,
        "token_version": int(user.auth_token_version or 1),
    }

    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "user": serialize_authenticated_user(user, company_id, roles=roles, permissions=permissions),
    }


def resolve_company_scope_for_user(user: User, company_id: int | None) -> int | None:
    if user.user_type != "super_admin":
        return user.company_id

    if company_id is None:
        return None

    try:
        return int(company_id)
    except (TypeError, ValueError):
        return None


def bootstrap_super_admin(payload: dict[str, Any]) -> dict[str, Any]:
    if not current_app.debug:
        raise AuthError("Bootstrap endpoint is only available in development", status_code=403)

    existing_admin = User.query.filter_by(user_type="super_admin").first()
    if existing_admin:
        raise AuthError("Super admin already exists", status_code=409)

    required_fields = ["email", "password", "first_name", "last_name"]
    for field in required_fields:
        if not payload.get(field):
            raise AuthError(f"Missing field: {field}", status_code=400)

    ensure_permissions_exist(DEFAULT_PERMISSION_CODES)

    super_role = Role.query.filter_by(company_id=None, code="platform_super_admin").first()
    if super_role is None:
        super_role = Role(
            company_id=None,
            name="Platform Super Admin",
            code="platform_super_admin",
            is_system=True,
            description="Full platform access",
        )
        db.session.add(super_role)
        db.session.flush()

    all_permissions = Permission.query.filter(Permission.code.in_(DEFAULT_PERMISSION_CODES)).all()
    for permission in all_permissions:
        exists = RolePermission.query.filter_by(role_id=super_role.id, permission_id=permission.id).first()
        if not exists:
            db.session.add(RolePermission(role_id=super_role.id, permission_id=permission.id))

    user = User(
        company_id=None,
        email=payload["email"].strip().lower(),
        login_identifier=payload["email"].strip().lower(),
        password_hash=hash_password(payload["password"]),
        first_name=payload["first_name"].strip(),
        last_name=payload["last_name"].strip(),
        preferred_language=payload.get("preferred_language", "fr"),
        user_type="super_admin",
        account_status="active",
        is_active=True,
    )
    db.session.add(user)
    db.session.flush()

    db.session.add(UserRole(user_id=user.id, role_id=super_role.id, company_id=None))
    db.session.commit()

    return issue_tokens_for_user(user, None)
