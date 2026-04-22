"""add payroll leave requests

Revision ID: b2d4f6a8c9e1
Revises: a1c3e5f7b9d2
Create Date: 2026-04-04 09:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2d4f6a8c9e1"
down_revision = "a1c3e5f7b9d2"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "payroll_leave_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("client_request_id", sa.String(length=120), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False, server_default="paid_leave"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("days_requested", sa.Numeric(precision=8, scale=2), nullable=False, server_default="0"),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("contact", sa.String(length=255), nullable=True),
        sa.Column("handover_note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="submitted"),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint(
            "type IN ('paid_leave', 'permission', 'sick_leave', 'exceptional_leave')",
            name="ck_payroll_leave_requests_type",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'submitted', 'received', 'in_review', 'processing', 'approved', 'rejected', 'resolved')",
            name="ck_payroll_leave_requests_status",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "user_id",
            "client_request_id",
            name="uq_payroll_leave_requests_company_user_client_request",
        ),
    )
    op.create_index("ix_payroll_leave_requests_company_id", "payroll_leave_requests", ["company_id"], unique=False)
    op.create_index("ix_payroll_leave_requests_reviewed_by_user_id", "payroll_leave_requests", ["reviewed_by_user_id"], unique=False)
    op.create_index("ix_payroll_leave_requests_user_id", "payroll_leave_requests", ["user_id"], unique=False)


def downgrade():
    op.drop_index("ix_payroll_leave_requests_user_id", table_name="payroll_leave_requests")
    op.drop_index("ix_payroll_leave_requests_reviewed_by_user_id", table_name="payroll_leave_requests")
    op.drop_index("ix_payroll_leave_requests_company_id", table_name="payroll_leave_requests")
    op.drop_table("payroll_leave_requests")
