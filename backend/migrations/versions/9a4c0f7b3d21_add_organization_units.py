"""Add organization units and assignments

Revision ID: 9a4c0f7b3d21
Revises: 5c9d6f4a7b21
Create Date: 2026-03-30 13:45:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9a4c0f7b3d21"
down_revision = "5c9d6f4a7b21"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "organization_units",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("parent_unit_id", sa.Integer(), nullable=True),
        sa.Column("manager_user_id", sa.Integer(), nullable=True),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("unit_type", sa.String(length=30), nullable=False, server_default="service"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("hierarchy_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.CheckConstraint(
            "unit_type IN ('directorate', 'department', 'service', 'team')",
            name="ck_organization_units_unit_type",
        ),
        sa.CheckConstraint("hierarchy_level >= 1", name="ck_organization_units_hierarchy_level_positive"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["parent_unit_id"], ["organization_units.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_organization_units_company_code"),
        sa.UniqueConstraint("company_id", "parent_unit_id", "name", name="uq_organization_units_company_parent_name"),
    )
    op.create_index("ix_organization_units_company_id", "organization_units", ["company_id"], unique=False)
    op.create_index("ix_organization_units_parent_unit_id", "organization_units", ["parent_unit_id"], unique=False)
    op.create_index("ix_organization_units_manager_user_id", "organization_units", ["manager_user_id"], unique=False)

    op.create_table(
        "organization_unit_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("organization_unit_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("assignment_title", sa.String(length=120), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("starts_on", sa.Date(), nullable=True),
        sa.Column("ends_on", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["organization_unit_id"], ["organization_units.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "company_id",
            "organization_unit_id",
            "user_id",
            name="uq_organization_unit_assignments_company_unit_user",
        ),
    )
    op.create_index(
        "ix_organization_unit_assignments_company_id",
        "organization_unit_assignments",
        ["company_id"],
        unique=False,
    )
    op.create_index(
        "ix_organization_unit_assignments_organization_unit_id",
        "organization_unit_assignments",
        ["organization_unit_id"],
        unique=False,
    )
    op.create_index("ix_organization_unit_assignments_user_id", "organization_unit_assignments", ["user_id"], unique=False)


def downgrade():
    op.drop_index("ix_organization_unit_assignments_user_id", table_name="organization_unit_assignments")
    op.drop_index("ix_organization_unit_assignments_organization_unit_id", table_name="organization_unit_assignments")
    op.drop_index("ix_organization_unit_assignments_company_id", table_name="organization_unit_assignments")
    op.drop_table("organization_unit_assignments")

    op.drop_index("ix_organization_units_manager_user_id", table_name="organization_units")
    op.drop_index("ix_organization_units_parent_unit_id", table_name="organization_units")
    op.drop_index("ix_organization_units_company_id", table_name="organization_units")
    op.drop_table("organization_units")
