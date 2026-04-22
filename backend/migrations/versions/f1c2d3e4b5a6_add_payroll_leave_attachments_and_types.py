"""add payroll leave attachments and types

Revision ID: f1c2d3e4b5a6
Revises: e7b4c1d9a2f5
Create Date: 2026-04-05 16:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f1c2d3e4b5a6"
down_revision = "e7b4c1d9a2f5"
branch_labels = None
depends_on = None


LEAVE_TYPES_WITH_JUSTIFICATIONS = (
    "'paid_leave', 'permission', 'sick_leave', 'exceptional_leave', 'absence_justification', 'late_arrival'"
)
LEAVE_TYPES_LEGACY = "'paid_leave', 'permission', 'sick_leave', 'exceptional_leave'"


def upgrade() -> None:
    with op.batch_alter_table("payroll_leave_requests") as batch_op:
        batch_op.add_column(sa.Column("supporting_document_url", sa.String(length=500), nullable=True))
        batch_op.add_column(sa.Column("supporting_document_name", sa.String(length=255), nullable=True))
        batch_op.drop_constraint("ck_payroll_leave_requests_type", type_="check")
        batch_op.create_check_constraint(
            "ck_payroll_leave_requests_type",
            f"type IN ({LEAVE_TYPES_WITH_JUSTIFICATIONS})",
        )


def downgrade() -> None:
    with op.batch_alter_table("payroll_leave_requests") as batch_op:
        batch_op.drop_constraint("ck_payroll_leave_requests_type", type_="check")
        batch_op.create_check_constraint(
            "ck_payroll_leave_requests_type",
            f"type IN ({LEAVE_TYPES_LEGACY})",
        )
        batch_op.drop_column("supporting_document_name")
        batch_op.drop_column("supporting_document_url")
