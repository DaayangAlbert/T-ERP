"""add planning agenda entries

Revision ID: a9b8c7d6e5f4
Revises: f1c2d3e4b5a6
Create Date: 2026-04-06 08:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a9b8c7d6e5f4"
down_revision = "f1c2d3e4b5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agenda_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("category", sa.String(length=30), nullable=False, server_default="personal"),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(
            "category IN ('meeting', 'task', 'deadline', 'leave', 'personal', 'follow_up', 'other')",
            name="ck_agenda_entries_category",
        ),
        sa.CheckConstraint(
            "source IN ('manual', 'project_sync')",
            name="ck_agenda_entries_source",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agenda_entries_company_id"), "agenda_entries", ["company_id"], unique=False)
    op.create_index(op.f("ix_agenda_entries_project_id"), "agenda_entries", ["project_id"], unique=False)
    op.create_index(op.f("ix_agenda_entries_user_id"), "agenda_entries", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_agenda_entries_user_id"), table_name="agenda_entries")
    op.drop_index(op.f("ix_agenda_entries_project_id"), table_name="agenda_entries")
    op.drop_index(op.f("ix_agenda_entries_company_id"), table_name="agenda_entries")
    op.drop_table("agenda_entries")
