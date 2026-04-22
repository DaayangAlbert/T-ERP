"""add employee self service profile fields

Revision ID: a7d3e2c4f9b1
Revises: d6f8a1b2c3e4
Create Date: 2026-04-05 11:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a7d3e2c4f9b1"
down_revision = "d6f8a1b2c3e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("identity_document_type", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("identity_document_number", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("identity_issue_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("taxpayer_number", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("cv_url", sa.String(length=500), nullable=True))
        batch_op.add_column(
            sa.Column("chat_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(
            sa.Column("payslip_notifications_enabled", sa.Boolean(), nullable=False, server_default=sa.true())
        )
        batch_op.add_column(sa.Column("last_seen_payslip_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_check_constraint(
            "ck_users_identity_document_type",
            "identity_document_type IS NULL OR identity_document_type IN ('cni', 'passport', 'other')",
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_constraint("ck_users_identity_document_type", type_="check")
        batch_op.drop_column("last_seen_payslip_at")
        batch_op.drop_column("payslip_notifications_enabled")
        batch_op.drop_column("chat_notifications_enabled")
        batch_op.drop_column("cv_url")
        batch_op.drop_column("taxpayer_number")
        batch_op.drop_column("identity_issue_date")
        batch_op.drop_column("identity_document_number")
        batch_op.drop_column("identity_document_type")
