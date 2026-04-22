"""add project decompte document category

Revision ID: e5a4c3b2d1f0
Revises: b8d1e2f3a4c5
Create Date: 2026-04-11 00:00:00.000000
"""

from alembic import op


revision = "e5a4c3b2d1f0"
down_revision = "b8d1e2f3a4c5"
branch_labels = None
depends_on = None


NEW_CATEGORIES = "'dao', 'contract', 'plan', 'invoice', 'report', 'pv', 'decompte', 'photo', 'other'"
OLD_CATEGORIES = "'dao', 'contract', 'plan', 'invoice', 'report', 'pv', 'photo', 'other'"


def upgrade():
    with op.batch_alter_table("project_documents") as batch_op:
        batch_op.drop_constraint("ck_project_documents_category", type_="check")
        batch_op.create_check_constraint("ck_project_documents_category", f"category IN ({NEW_CATEGORIES})")


def downgrade():
    op.execute("UPDATE project_documents SET category = 'other' WHERE category = 'decompte'")
    with op.batch_alter_table("project_documents") as batch_op:
        batch_op.drop_constraint("ck_project_documents_category", type_="check")
        batch_op.create_check_constraint("ck_project_documents_category", f"category IN ({OLD_CATEGORIES})")
