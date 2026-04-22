from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TimestampMixin


class User(db.Model, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True, index=True)
    login_identifier = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(120), nullable=False)
    last_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    address_line = db.Column(db.String(255), nullable=True)
    job_title = db.Column(db.String(120), nullable=True)
    department = db.Column(db.String(120), nullable=True)
    employee_number = db.Column(db.String(120), nullable=True)
    hire_date = db.Column(db.Date, nullable=True)
    contract_type = db.Column(db.String(80), nullable=True)
    base_salary = db.Column(db.Numeric(14, 2), nullable=True)
    profile_photo_url = db.Column(db.String(500), nullable=True)
    identity_document_type = db.Column(db.String(20), nullable=True)
    identity_document_number = db.Column(db.String(120), nullable=True)
    identity_issue_date = db.Column(db.Date, nullable=True)
    identity_document_url = db.Column(db.String(500), nullable=True)
    taxpayer_number = db.Column(db.String(120), nullable=True)
    cv_url = db.Column(db.String(500), nullable=True)
    hierarchy_level = db.Column(db.Integer, nullable=True)
    preferred_language = db.Column(db.String(5), nullable=False, default="fr")
    user_type = db.Column(db.String(40), nullable=False, default="employee")
    account_status = db.Column(db.String(30), nullable=False, default="active")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    is_primary_admin = db.Column(db.Boolean, nullable=False, default=False)
    last_login_at = db.Column(db.DateTime(timezone=True), nullable=True)
    last_password_reset_at = db.Column(db.DateTime(timezone=True), nullable=True)
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    chat_notifications_enabled = db.Column(db.Boolean, nullable=False, default=True)
    payslip_notifications_enabled = db.Column(db.Boolean, nullable=False, default=True)
    last_seen_payslip_at = db.Column(db.DateTime(timezone=True), nullable=True)
    employment_end_date = db.Column(db.Date, nullable=True)
    exit_reason = db.Column(db.Text, nullable=True)
    auth_token_version = db.Column(db.Integer, nullable=False, default=1)

    __table_args__ = (
        UniqueConstraint("company_id", "email", name="uq_users_company_email"),
        UniqueConstraint("company_id", "login_identifier", name="uq_users_company_login_identifier"),
        UniqueConstraint("company_id", "employee_number", name="uq_users_company_employee_number"),
        CheckConstraint("preferred_language IN ('fr', 'en')", name="ck_users_preferred_language"),
        CheckConstraint(
            "identity_document_type IS NULL OR identity_document_type IN ('cni', 'passport', 'other')",
            name="ck_users_identity_document_type",
        ),
        CheckConstraint("gender IN ('male', 'female', 'other')", name="ck_users_gender"),
        CheckConstraint(
            "user_type IN ('super_admin', 'company_admin', 'employee', 'external_controller', 'job_seeker')",
            name="ck_users_user_type",
        ),
        CheckConstraint(
            "account_status IN ('active', 'inactive', 'suspended', 'archived', 'locked', 'exited')",
            name="ck_users_account_status",
        ),
    )


class Role(db.Model, TimestampMixin):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_system = db.Column(db.Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_roles_company_code"),
    )


class Permission(db.Model, TimestampMixin):
    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    module = db.Column(db.String(100), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(120), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)


class RolePermission(db.Model, TimestampMixin):
    __tablename__ = "role_permissions"

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = db.Column(db.Integer, db.ForeignKey("permissions.id"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permissions_role_permission"),
    )


class UserRole(db.Model, TimestampMixin):
    __tablename__ = "user_roles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False, index=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=True, index=True)

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", "company_id", name="uq_user_roles_user_role_company"),
    )
