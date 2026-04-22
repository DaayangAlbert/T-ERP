"""Expand company, admin, and user management features

Revision ID: 5c9d6f4a7b21
Revises: 68bdcda40e83
Create Date: 2026-03-30 12:40:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "5c9d6f4a7b21"
down_revision = "68bdcda40e83"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_constraint("ck_companies_onboarding_status", type_="check")
        batch_op.add_column(sa.Column("acronym", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("country_name", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("activity_domain", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("logo_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("administrative_documents", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("account_status", sa.String(length=30), nullable=False, server_default="pending"))
        batch_op.add_column(sa.Column("subscription_status", sa.String(length=30), nullable=False, server_default="pending"))
        batch_op.add_column(sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("review_notes", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("rejection_reason", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("requested_information", sa.Text(), nullable=True))
        batch_op.create_check_constraint(
            "ck_companies_onboarding_status",
            "onboarding_status IN ('pending', 'under_review', 'approved', 'rejected', 'info_requested', 'suspended')",
        )
        batch_op.create_check_constraint(
            "ck_companies_account_status",
            "account_status IN ('pending', 'active', 'suspended', 'expired', 'rejected')",
        )
        batch_op.create_check_constraint(
            "ck_companies_subscription_status",
            "subscription_status IN ('pending', 'in_validation', 'active', 'expired', 'suspended', 'rejected', 'cancelled', 'none')",
        )

    with op.batch_alter_table("company_settings", schema=None) as batch_op:
        batch_op.add_column(sa.Column("contact_person_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("contact_person_phone", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("website_url", sa.String(length=500), nullable=True))

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("login_identifier", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("gender", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("birth_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("address_line", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("job_title", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("department", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("employee_number", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("hire_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("contract_type", sa.String(length=80), nullable=True))
        batch_op.add_column(sa.Column("base_salary", sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.add_column(sa.Column("profile_photo_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("identity_document_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("hierarchy_level", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("account_status", sa.String(length=30), nullable=False, server_default="active"))
        batch_op.add_column(sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("is_primary_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch_op.add_column(sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("last_password_reset_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("employment_end_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("exit_reason", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("auth_token_version", sa.Integer(), nullable=False, server_default="1"))
        batch_op.create_unique_constraint("uq_users_company_login_identifier", ["company_id", "login_identifier"])
        batch_op.create_unique_constraint("uq_users_company_employee_number", ["company_id", "employee_number"])
        batch_op.create_check_constraint("ck_users_gender", "gender IN ('male', 'female', 'other')")
        batch_op.create_check_constraint(
            "ck_users_account_status",
            "account_status IN ('active', 'inactive', 'suspended', 'archived', 'locked', 'exited')",
        )

    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("price_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint("duration_days > 0", name="ck_subscription_plans_duration_days_positive"),
        sa.CheckConstraint("price_amount >= 0", name="ck_subscription_plans_price_amount_non_negative"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "company_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("plan_id", sa.Integer(), nullable=False),
        sa.Column("validated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("validation_status", sa.String(length=30), nullable=False, server_default="pending"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("amount_paid", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("transaction_reference", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'in_validation', 'active', 'expired', 'suspended', 'rejected', 'cancelled')",
            name="ck_company_subscriptions_status",
        ),
        sa.CheckConstraint(
            "validation_status IN ('pending', 'in_validation', 'validated', 'rejected', 'on_hold')",
            name="ck_company_subscriptions_validation_status",
        ),
        sa.CheckConstraint("amount_paid >= 0", name="ck_company_subscriptions_amount_paid_non_negative"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"]),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("actor_email", sa.String(length=255), nullable=True),
        sa.Column("module", sa.String(length=80), nullable=False),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("target_type", sa.String(length=80), nullable=True),
        sa.Column("target_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=100), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_company_subscriptions_company_id", "company_subscriptions", ["company_id"], unique=False)
    op.create_index("ix_company_subscriptions_plan_id", "company_subscriptions", ["plan_id"], unique=False)
    op.create_index(
        "ix_company_subscriptions_validated_by_user_id",
        "company_subscriptions",
        ["validated_by_user_id"],
        unique=False,
    )
    op.create_index("ix_audit_logs_company_id", "audit_logs", ["company_id"], unique=False)
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"], unique=False)


def downgrade():
    op.drop_index("ix_audit_logs_actor_user_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_company_id", table_name="audit_logs")
    op.drop_index("ix_company_subscriptions_validated_by_user_id", table_name="company_subscriptions")
    op.drop_index("ix_company_subscriptions_plan_id", table_name="company_subscriptions")
    op.drop_index("ix_company_subscriptions_company_id", table_name="company_subscriptions")
    op.drop_table("audit_logs")
    op.drop_table("company_subscriptions")
    op.drop_table("subscription_plans")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("ck_users_account_status", type_="check")
        batch_op.drop_constraint("ck_users_gender", type_="check")
        batch_op.drop_constraint("uq_users_company_employee_number", type_="unique")
        batch_op.drop_constraint("uq_users_company_login_identifier", type_="unique")
        batch_op.drop_column("auth_token_version")
        batch_op.drop_column("exit_reason")
        batch_op.drop_column("employment_end_date")
        batch_op.drop_column("locked_until")
        batch_op.drop_column("last_password_reset_at")
        batch_op.drop_column("last_login_at")
        batch_op.drop_column("is_primary_admin")
        batch_op.drop_column("must_change_password")
        batch_op.drop_column("account_status")
        batch_op.drop_column("hierarchy_level")
        batch_op.drop_column("identity_document_url")
        batch_op.drop_column("profile_photo_url")
        batch_op.drop_column("base_salary")
        batch_op.drop_column("contract_type")
        batch_op.drop_column("hire_date")
        batch_op.drop_column("employee_number")
        batch_op.drop_column("department")
        batch_op.drop_column("job_title")
        batch_op.drop_column("address_line")
        batch_op.drop_column("birth_date")
        batch_op.drop_column("gender")
        batch_op.drop_column("login_identifier")

    with op.batch_alter_table("company_settings", schema=None) as batch_op:
        batch_op.drop_column("website_url")
        batch_op.drop_column("contact_person_phone")
        batch_op.drop_column("contact_person_name")

    with op.batch_alter_table("companies", schema=None) as batch_op:
        batch_op.drop_constraint("ck_companies_subscription_status", type_="check")
        batch_op.drop_constraint("ck_companies_account_status", type_="check")
        batch_op.drop_constraint("ck_companies_onboarding_status", type_="check")
        batch_op.create_check_constraint(
            "ck_companies_onboarding_status",
            "onboarding_status IN ('pending', 'approved', 'rejected')",
        )
        batch_op.drop_column("requested_information")
        batch_op.drop_column("rejection_reason")
        batch_op.drop_column("review_notes")
        batch_op.drop_column("reviewed_at")
        batch_op.drop_column("activated_at")
        batch_op.drop_column("subscription_status")
        batch_op.drop_column("account_status")
        batch_op.drop_column("administrative_documents")
        batch_op.drop_column("logo_url")
        batch_op.drop_column("activity_domain")
        batch_op.drop_column("country_name")
        batch_op.drop_column("acronym")
