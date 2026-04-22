"""merge payroll api migration heads

Revision ID: d4f2b6c9e8a1
Revises: 9a4c0f7b3d21, 9f83b3d1aa10
Create Date: 2026-03-30 14:05:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "d4f2b6c9e8a1"
down_revision = ("9a4c0f7b3d21", "9f83b3d1aa10")
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
