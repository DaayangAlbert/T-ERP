"""add payroll persistence tables

Revision ID: e3c1a9f7b2d4
Revises: d4f2b6c9e8a1
Create Date: 2026-03-30 14:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e3c1a9f7b2d4"
down_revision = "d4f2b6c9e8a1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "employee_payroll_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("echelon", sa.String(length=80), nullable=True),
        sa.Column("cnps_number", sa.String(length=120), nullable=True),
        sa.Column("convention_collective", sa.String(length=255), nullable=True),
        sa.Column("employment_label", sa.String(length=120), nullable=True),
        sa.Column("hours_schedule", sa.String(length=120), nullable=True),
        sa.Column("family_status", sa.String(length=120), nullable=True),
        sa.Column("bank_account_number", sa.String(length=120), nullable=True),
        sa.Column("bank_domiciliation", sa.String(length=255), nullable=True),
        sa.Column("payment_method", sa.String(length=30), nullable=True, server_default="bank_transfer"),
        sa.Column("transport_allowance", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("other_fixed_gains", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("payroll_notes", sa.Text(), nullable=True),
        sa.Column("is_payroll_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'check', 'other')",
            name="ck_employee_payroll_profiles_payment_method",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "user_id", name="uq_employee_payroll_profiles_company_user"),
    )
    op.create_index("ix_employee_payroll_profiles_company_id", "employee_payroll_profiles", ["company_id"], unique=False)
    op.create_index("ix_employee_payroll_profiles_user_id", "employee_payroll_profiles", ["user_id"], unique=False)

    op.create_table(
        "payroll_periods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("period_key", sa.String(length=7), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'generated', 'archived')", name="ck_payroll_periods_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "period_key", name="uq_payroll_periods_company_period_key"),
    )
    op.create_index("ix_payroll_periods_company_id", "payroll_periods", ["company_id"], unique=False)
    op.create_index("ix_payroll_periods_created_by_user_id", "payroll_periods", ["created_by_user_id"], unique=False)

    op.create_table(
        "payroll_period_inputs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("payroll_period_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("days_paid", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("salary_base_override", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("transport_allowance", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("other_gains", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("brut_imposable", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("irpp", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("cac", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("tc", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("rav", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("cfs", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("payment_method", sa.String(length=30), nullable=True),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint(
            "payment_method IS NULL OR payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'check', 'other')",
            name="ck_payroll_period_inputs_payment_method",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["payroll_period_id"], ["payroll_periods.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "payroll_period_id",
            "user_id",
            name="uq_payroll_period_inputs_company_period_user",
        ),
    )
    op.create_index("ix_payroll_period_inputs_company_id", "payroll_period_inputs", ["company_id"], unique=False)
    op.create_index("ix_payroll_period_inputs_payroll_period_id", "payroll_period_inputs", ["payroll_period_id"], unique=False)
    op.create_index("ix_payroll_period_inputs_user_id", "payroll_period_inputs", ["user_id"], unique=False)

    op.create_table(
        "payroll_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("payroll_period_id", sa.Integer(), nullable=False),
        sa.Column("generated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("run_reference", sa.String(length=120), nullable=False),
        sa.Column("output_root", sa.String(length=500), nullable=True),
        sa.Column("employee_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_brut", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("total_net", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("total_patronal", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="generated"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint("status IN ('generated', 'failed')", name="ck_payroll_runs_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["generated_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["payroll_period_id"], ["payroll_periods.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "run_reference", name="uq_payroll_runs_company_reference"),
    )
    op.create_index("ix_payroll_runs_company_id", "payroll_runs", ["company_id"], unique=False)
    op.create_index("ix_payroll_runs_generated_by_user_id", "payroll_runs", ["generated_by_user_id"], unique=False)
    op.create_index("ix_payroll_runs_payroll_period_id", "payroll_runs", ["payroll_period_id"], unique=False)

    op.create_table(
        "payroll_run_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("payroll_run_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("employee_number", sa.String(length=120), nullable=True),
        sa.Column("employee_name", sa.String(length=255), nullable=False),
        sa.Column("period_key", sa.String(length=7), nullable=False),
        sa.Column("salaire_brut", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("total_retenues", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("total_patronal", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("net_a_payer", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("pdf_path", sa.String(length=500), nullable=True),
        sa.Column("payload_snapshot", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["payroll_run_id"], ["payroll_runs.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "payroll_run_id", "user_id", name="uq_payroll_run_items_company_run_user"),
    )
    op.create_index("ix_payroll_run_items_company_id", "payroll_run_items", ["company_id"], unique=False)
    op.create_index("ix_payroll_run_items_payroll_run_id", "payroll_run_items", ["payroll_run_id"], unique=False)
    op.create_index("ix_payroll_run_items_user_id", "payroll_run_items", ["user_id"], unique=False)


def downgrade():
    op.drop_index("ix_payroll_run_items_user_id", table_name="payroll_run_items")
    op.drop_index("ix_payroll_run_items_payroll_run_id", table_name="payroll_run_items")
    op.drop_index("ix_payroll_run_items_company_id", table_name="payroll_run_items")
    op.drop_table("payroll_run_items")

    op.drop_index("ix_payroll_runs_payroll_period_id", table_name="payroll_runs")
    op.drop_index("ix_payroll_runs_generated_by_user_id", table_name="payroll_runs")
    op.drop_index("ix_payroll_runs_company_id", table_name="payroll_runs")
    op.drop_table("payroll_runs")

    op.drop_index("ix_payroll_period_inputs_user_id", table_name="payroll_period_inputs")
    op.drop_index("ix_payroll_period_inputs_payroll_period_id", table_name="payroll_period_inputs")
    op.drop_index("ix_payroll_period_inputs_company_id", table_name="payroll_period_inputs")
    op.drop_table("payroll_period_inputs")

    op.drop_index("ix_payroll_periods_created_by_user_id", table_name="payroll_periods")
    op.drop_index("ix_payroll_periods_company_id", table_name="payroll_periods")
    op.drop_table("payroll_periods")

    op.drop_index("ix_employee_payroll_profiles_user_id", table_name="employee_payroll_profiles")
    op.drop_index("ix_employee_payroll_profiles_company_id", table_name="employee_payroll_profiles")
    op.drop_table("employee_payroll_profiles")
