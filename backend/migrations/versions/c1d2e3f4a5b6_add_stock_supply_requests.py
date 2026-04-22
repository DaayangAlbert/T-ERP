"""Add stock supply requests table

Revision ID: c1d2e3f4a5b6
Revises: e5a4c3b2d1f0
Create Date: 2026-04-14 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "c1d2e3f4a5b6"
down_revision = "e5a4c3b2d1f0"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "stock_supply_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("requested_quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("urgency", sa.String(length=20), nullable=False, server_default="normal"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("requester_user_id", sa.Integer(), nullable=False),
        sa.Column("assignee_user_id", sa.Integer(), nullable=True),
        sa.Column("transmitted_to_user_id", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"]),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["assignee_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["transmitted_to_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("requested_quantity > 0", name="ck_stock_supply_requests_quantity_positive"),
        sa.CheckConstraint(
            "urgency IN ('low', 'normal', 'high', 'urgent')",
            name="ck_stock_supply_requests_urgency",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'transmitted', 'fulfilled')",
            name="ck_stock_supply_requests_status",
        ),
    )
    op.create_index("ix_stock_supply_requests_company_id", "stock_supply_requests", ["company_id"])
    op.create_index("ix_stock_supply_requests_project_id", "stock_supply_requests", ["project_id"])
    op.create_index("ix_stock_supply_requests_item_id", "stock_supply_requests", ["item_id"])
    op.create_index("ix_stock_supply_requests_requester_user_id", "stock_supply_requests", ["requester_user_id"])


def downgrade():
    op.drop_table("stock_supply_requests")
