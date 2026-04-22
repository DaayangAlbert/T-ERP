"""add late hours to payroll period inputs

Revision ID: a1c3e5f7b9d2
Revises: f4b9c2d7a1e6
Create Date: 2026-04-02 10:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1c3e5f7b9d2"
down_revision = "f4b9c2d7a1e6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("payroll_period_inputs") as batch_op:
        batch_op.add_column(sa.Column("late_hours", sa.Numeric(precision=8, scale=2), nullable=True))


def downgrade():
    with op.batch_alter_table("payroll_period_inputs") as batch_op:
        batch_op.drop_column("late_hours")
