"""
Seed script: ensure the platform super admin account exists and is configured.

Usage (from backend/):
    python seed_super_admin.py

The script is idempotent:
- creates the account if it does not exist
- promotes an existing account with the same email to super_admin
- refreshes the password and global platform role assignment
"""

import sys
import os

from dotenv import load_dotenv
from sqlalchemy import func

# Allow running from backend/ directly
BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app import create_app
from app.core.default_profiles import ensure_permissions_exist
from app.extensions import db
from app.models.user import Permission, Role, RolePermission, User, UserRole
from app.modules.auth.service import DEFAULT_PERMISSION_CODES, hash_password

SUPER_ADMIN_EMAIL = os.getenv("SUPER_ADMIN_EMAIL", "").strip()
SUPER_ADMIN_PASSWORD = os.getenv("SUPER_ADMIN_PASSWORD", "").strip()
SUPER_ADMIN_FIRST_NAME = os.getenv("SUPER_ADMIN_FIRST_NAME", "Platform").strip() or "Platform"
SUPER_ADMIN_LAST_NAME = os.getenv("SUPER_ADMIN_LAST_NAME", "Admin").strip() or "Admin"
SUPER_ADMIN_LANG = os.getenv("SUPER_ADMIN_LANG", "fr").strip() or "fr"


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _ensure_permissions():
    ensure_permissions_exist(DEFAULT_PERMISSION_CODES)


def _require_seed_configuration() -> tuple[str, str]:
    missing = []

    if not SUPER_ADMIN_EMAIL:
        missing.append("SUPER_ADMIN_EMAIL")

    if not SUPER_ADMIN_PASSWORD:
        missing.append("SUPER_ADMIN_PASSWORD")

    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(
            f"Missing required super admin seed configuration: {joined}. "
            "Set these values in backend/.env or in your shell before running backend/seed_super_admin.py."
        )

    return SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD


def _ensure_super_role():
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
        if not RolePermission.query.filter_by(role_id=super_role.id, permission_id=permission.id).first():
            db.session.add(RolePermission(role_id=super_role.id, permission_id=permission.id))

    db.session.flush()
    return super_role


def _find_target_user(normalized_email: str) -> User | None:
    matches = User.query.filter(func.lower(User.email) == normalized_email).order_by(User.id.asc()).all()

    if not matches:
        return None

    global_match = next((user for user in matches if user.company_id is None), None)
    if global_match is not None:
        return global_match

    if len(matches) > 1:
        raise RuntimeError(
            f"Multiple tenant-scoped users share the email {normalized_email}. Promote the intended account manually."
        )

    return matches[0]


def seed():
    app = create_app()
    with app.app_context():
        email, password = _require_seed_configuration()
        normalized_email = _normalize_email(email)

        _ensure_permissions()
        super_role = _ensure_super_role()

        user = _find_target_user(normalized_email)
        action = "updated"

        if user is None:
            user = User(
                company_id=None,
                login_identifier=normalized_email,
                email=normalized_email,
                password_hash=hash_password(password),
                first_name=SUPER_ADMIN_FIRST_NAME.strip(),
                last_name=SUPER_ADMIN_LAST_NAME.strip(),
                preferred_language=SUPER_ADMIN_LANG,
                user_type="super_admin",
                account_status="active",
                is_active=True,
            )
            db.session.add(user)
            db.session.flush()
            action = "created"
        else:
            action = "promoted" if user.user_type != "super_admin" or user.company_id is not None else "updated"
            user.email = normalized_email
            user.login_identifier = normalized_email
            user.password_hash = hash_password(password)
            user.company_id = None
            user.user_type = "super_admin"
            user.account_status = "active"
            user.is_active = True

            if not user.first_name.strip():
                user.first_name = SUPER_ADMIN_FIRST_NAME.strip()

            if not user.last_name.strip():
                user.last_name = SUPER_ADMIN_LAST_NAME.strip()

            if not user.preferred_language:
                user.preferred_language = SUPER_ADMIN_LANG

        existing_assignment = UserRole.query.filter_by(
            user_id=user.id,
            role_id=super_role.id,
            company_id=None,
        ).first()
        if existing_assignment is None:
            db.session.add(UserRole(user_id=user.id, role_id=super_role.id, company_id=None))

        db.session.commit()

        print(f"[seed] Super admin {action} successfully.")
        print(f"       email    : {normalized_email}")
        print(f"       user_type: super_admin")
        print(f"       id       : {user.id}")


if __name__ == "__main__":
    seed()
