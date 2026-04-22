"""Expand projects and public works module

Revision ID: c8a7b1d2e3f4
Revises: 5c9d6f4a7b21
Create Date: 2026-03-30 14:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "c8a7b1d2e3f4"
down_revision = "5c9d6f4a7b21"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_constraint("ck_projects_status", type_="check")
        batch_op.add_column(sa.Column("market_reference", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("project_type", sa.String(length=30), nullable=False, server_default="internal_project"))
        batch_op.add_column(sa.Column("estimated_duration_days", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("contract_amount", sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.add_column(sa.Column("physical_progress_percent", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("financial_progress_percent", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("dao_number", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("contracting_authority", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("publication_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("submission_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("award_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("contract_duration_days", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("funding_source", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("site_latitude", sa.Numeric(precision=10, scale=6), nullable=True))
        batch_op.add_column(sa.Column("site_longitude", sa.Numeric(precision=10, scale=6), nullable=True))
        batch_op.add_column(sa.Column("final_cost_amount", sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.add_column(sa.Column("actual_duration_days", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("closing_observations", sa.Text(), nullable=True))
        batch_op.create_check_constraint(
            "ck_projects_status",
            "status IN ('draft', 'preparation', 'submitted', 'awarded', 'in_progress', 'suspended', "
            "'completed', 'provisional_acceptance', 'final_acceptance', 'archived', 'planned', 'on_hold', 'cancelled')",
        )
        batch_op.create_check_constraint(
            "ck_projects_project_type",
            "project_type IN ('public_market', 'private_market', 'internal_project', 'project_preparation')",
        )
        batch_op.create_check_constraint(
            "ck_projects_physical_progress_percent",
            "physical_progress_percent >= 0 AND physical_progress_percent <= 100",
        )
        batch_op.create_check_constraint(
            "ck_projects_financial_progress_percent",
            "financial_progress_percent >= 0 AND financial_progress_percent <= 100",
        )

    with op.batch_alter_table("project_tasks", schema=None) as batch_op:
        batch_op.drop_constraint("ck_project_tasks_status", type_="check")
        batch_op.add_column(sa.Column("parent_task_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("task_type", sa.String(length=20), nullable=False, server_default="task"))
        batch_op.add_column(sa.Column("responsible_user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("start_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("end_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("progress_percent", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("responsibility", sa.String(length=255), nullable=True))
        batch_op.create_index("ix_project_tasks_parent_task_id", ["parent_task_id"], unique=False)
        batch_op.create_index("ix_project_tasks_responsible_user_id", ["responsible_user_id"], unique=False)
        batch_op.create_foreign_key("fk_project_tasks_parent_task_id", "project_tasks", ["parent_task_id"], ["id"])
        batch_op.create_foreign_key("fk_project_tasks_responsible_user_id", "users", ["responsible_user_id"], ["id"])
        batch_op.create_check_constraint(
            "ck_project_tasks_status",
            "status IN ('todo', 'not_started', 'in_progress', 'blocked', 'done', 'completed')",
        )
        batch_op.create_check_constraint(
            "ck_project_tasks_task_type",
            "task_type IN ('phase', 'task', 'subtask')",
        )
        batch_op.create_check_constraint(
            "ck_project_tasks_progress_percent",
            "progress_percent >= 0 AND progress_percent <= 100",
        )

    with op.batch_alter_table("project_reports", schema=None) as batch_op:
        batch_op.add_column(sa.Column("report_type", sa.String(length=20), nullable=False, server_default="daily"))
        batch_op.add_column(sa.Column("activities_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("personnel_present", sa.Integer(), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("incidents", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("observations", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("photo_urls", sa.JSON(), nullable=True))
        batch_op.create_check_constraint(
            "ck_project_reports_type",
            "report_type IN ('daily', 'weekly', 'monthly', 'final')",
        )
        batch_op.create_check_constraint(
            "ck_project_reports_personnel_present_non_negative",
            "personnel_present >= 0",
        )

    op.create_table(
        "project_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_role", sa.String(length=120), nullable=False),
        sa.Column("assignment_mode", sa.String(length=20), nullable=False, server_default="immediate"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("responsibility", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("assignment_mode IN ('immediate', 'deferred')", name="ck_project_assignments_mode"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_assignments_company_id", "project_assignments", ["company_id"], unique=False)
    op.create_index("ix_project_assignments_project_id", "project_assignments", ["project_id"], unique=False)
    op.create_index("ix_project_assignments_user_id", "project_assignments", ["user_id"], unique=False)

    op.create_table(
        "project_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False, server_default="other"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("document_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "category IN ('dao', 'contract', 'plan', 'invoice', 'report', 'pv', 'photo', 'other')",
            name="ck_project_documents_category",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_documents_company_id", "project_documents", ["company_id"], unique=False)
    op.create_index("ix_project_documents_project_id", "project_documents", ["project_id"], unique=False)
    op.create_index("ix_project_documents_uploaded_by_user_id", "project_documents", ["uploaded_by_user_id"], unique=False)

    op.create_table(
        "project_risks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("mitigation_plan", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("severity IN ('low', 'medium', 'high', 'critical')", name="ck_project_risks_severity"),
        sa.CheckConstraint("status IN ('open', 'monitoring', 'mitigated', 'closed')", name="ck_project_risks_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_risks_company_id", "project_risks", ["company_id"], unique=False)
    op.create_index("ix_project_risks_project_id", "project_risks", ["project_id"], unique=False)
    op.create_index("ix_project_risks_owner_user_id", "project_risks", ["owner_user_id"], unique=False)

    op.create_table(
        "project_change_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("reference", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount_delta", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("delay_delta_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'submitted', 'approved', 'rejected', 'implemented')",
            name="ck_project_change_orders_status",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "project_id", "reference", name="uq_project_change_orders_project_reference"),
    )
    op.create_index("ix_project_change_orders_company_id", "project_change_orders", ["company_id"], unique=False)
    op.create_index("ix_project_change_orders_project_id", "project_change_orders", ["project_id"], unique=False)
    op.create_index("ix_project_change_orders_requested_by_user_id", "project_change_orders", ["requested_by_user_id"], unique=False)


def downgrade():
    op.drop_index("ix_project_change_orders_requested_by_user_id", table_name="project_change_orders")
    op.drop_index("ix_project_change_orders_project_id", table_name="project_change_orders")
    op.drop_index("ix_project_change_orders_company_id", table_name="project_change_orders")
    op.drop_table("project_change_orders")

    op.drop_index("ix_project_risks_owner_user_id", table_name="project_risks")
    op.drop_index("ix_project_risks_project_id", table_name="project_risks")
    op.drop_index("ix_project_risks_company_id", table_name="project_risks")
    op.drop_table("project_risks")

    op.drop_index("ix_project_documents_uploaded_by_user_id", table_name="project_documents")
    op.drop_index("ix_project_documents_project_id", table_name="project_documents")
    op.drop_index("ix_project_documents_company_id", table_name="project_documents")
    op.drop_table("project_documents")

    op.drop_index("ix_project_assignments_user_id", table_name="project_assignments")
    op.drop_index("ix_project_assignments_project_id", table_name="project_assignments")
    op.drop_index("ix_project_assignments_company_id", table_name="project_assignments")
    op.drop_table("project_assignments")

    with op.batch_alter_table("project_reports", schema=None) as batch_op:
        batch_op.drop_constraint("ck_project_reports_personnel_present_non_negative", type_="check")
        batch_op.drop_constraint("ck_project_reports_type", type_="check")
        batch_op.drop_column("photo_urls")
        batch_op.drop_column("observations")
        batch_op.drop_column("incidents")
        batch_op.drop_column("personnel_present")
        batch_op.drop_column("activities_summary")
        batch_op.drop_column("report_type")

    with op.batch_alter_table("project_tasks", schema=None) as batch_op:
        batch_op.drop_constraint("ck_project_tasks_progress_percent", type_="check")
        batch_op.drop_constraint("ck_project_tasks_task_type", type_="check")
        batch_op.drop_constraint("ck_project_tasks_status", type_="check")
        batch_op.drop_constraint("fk_project_tasks_responsible_user_id", type_="foreignkey")
        batch_op.drop_constraint("fk_project_tasks_parent_task_id", type_="foreignkey")
        batch_op.drop_index("ix_project_tasks_responsible_user_id")
        batch_op.drop_index("ix_project_tasks_parent_task_id")
        batch_op.drop_column("responsibility")
        batch_op.drop_column("progress_percent")
        batch_op.drop_column("end_date")
        batch_op.drop_column("start_date")
        batch_op.drop_column("responsible_user_id")
        batch_op.drop_column("task_type")
        batch_op.drop_column("parent_task_id")
        batch_op.create_check_constraint(
            "ck_project_tasks_status",
            "status IN ('todo', 'in_progress', 'blocked', 'done')",
        )

    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_constraint("ck_projects_financial_progress_percent", type_="check")
        batch_op.drop_constraint("ck_projects_physical_progress_percent", type_="check")
        batch_op.drop_constraint("ck_projects_project_type", type_="check")
        batch_op.drop_constraint("ck_projects_status", type_="check")
        batch_op.drop_column("closing_observations")
        batch_op.drop_column("actual_duration_days")
        batch_op.drop_column("final_cost_amount")
        batch_op.drop_column("site_longitude")
        batch_op.drop_column("site_latitude")
        batch_op.drop_column("funding_source")
        batch_op.drop_column("contract_duration_days")
        batch_op.drop_column("award_date")
        batch_op.drop_column("submission_date")
        batch_op.drop_column("publication_date")
        batch_op.drop_column("contracting_authority")
        batch_op.drop_column("dao_number")
        batch_op.drop_column("financial_progress_percent")
        batch_op.drop_column("physical_progress_percent")
        batch_op.drop_column("contract_amount")
        batch_op.drop_column("estimated_duration_days")
        batch_op.drop_column("project_type")
        batch_op.drop_column("market_reference")
        batch_op.create_check_constraint(
            "ck_projects_status",
            "status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')",
        )
