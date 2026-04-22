"""Expand inventory warehouse management module

Revision ID: 9f83b3d1aa10
Revises: b7a2d6378f36
Create Date: 2026-03-30 16:10:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9f83b3d1aa10"
down_revision = "b7a2d6378f36"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE stock_locations SET location_type = 'main_warehouse' WHERE location_type = 'warehouse'")
    op.execute(
        "UPDATE inventory_items SET category = 'material' "
        "WHERE category IS NULL OR category NOT IN ('material', 'equipment', 'consumable')"
    )

    with op.batch_alter_table("stock_locations", schema=None) as batch_op:
        batch_op.drop_constraint("ck_stock_locations_type", type_="check")
        batch_op.add_column(sa.Column("address", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.create_check_constraint(
            "ck_stock_locations_type",
            "location_type IN ('main_warehouse', 'secondary_depot', 'site')",
        )

    with op.batch_alter_table("inventory_items", schema=None) as batch_op:
        batch_op.add_column(sa.Column("max_threshold", sa.Numeric(precision=12, scale=2), nullable=True))
        batch_op.add_column(
            sa.Column("average_unit_cost", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("preferred_supplier", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("barcode", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("qr_code", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))
        batch_op.create_check_constraint(
            "ck_inventory_items_category",
            "category IN ('material', 'equipment', 'consumable')",
        )
        batch_op.create_check_constraint(
            "ck_inventory_items_min_threshold_non_negative",
            "min_threshold >= 0",
        )
        batch_op.create_check_constraint(
            "ck_inventory_items_max_threshold_valid",
            "max_threshold IS NULL OR max_threshold >= min_threshold",
        )
        batch_op.create_check_constraint(
            "ck_inventory_items_average_unit_cost_non_negative",
            "average_unit_cost >= 0",
        )

    with op.batch_alter_table("stock_movements", schema=None) as batch_op:
        batch_op.add_column(sa.Column("operation_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("operation_line_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("project_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("task_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("stock_before", sa.Numeric(precision=12, scale=2), nullable=True))
        batch_op.add_column(sa.Column("stock_after", sa.Numeric(precision=12, scale=2), nullable=True))
        batch_op.add_column(sa.Column("unit_cost", sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.add_column(sa.Column("total_cost", sa.Numeric(precision=14, scale=2), nullable=True))
        batch_op.create_check_constraint(
            "ck_stock_movements_unit_cost_non_negative",
            "unit_cost IS NULL OR unit_cost >= 0",
        )
        batch_op.create_check_constraint(
            "ck_stock_movements_total_cost_non_negative",
            "total_cost IS NULL OR total_cost >= 0",
        )

    op.create_index("ix_stock_movements_operation_id", "stock_movements", ["operation_id"], unique=False)
    op.create_index("ix_stock_movements_operation_line_id", "stock_movements", ["operation_line_id"], unique=False)
    op.create_index("ix_stock_movements_project_id", "stock_movements", ["project_id"], unique=False)
    op.create_index("ix_stock_movements_task_id", "stock_movements", ["task_id"], unique=False)

    with op.batch_alter_table("project_stock_allocations", schema=None) as batch_op:
        batch_op.add_column(sa.Column("task_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("source_location_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("stock_movement_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("responsible_user_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key("fk_project_stock_allocations_task_id", "project_tasks", ["task_id"], ["id"])
        batch_op.create_foreign_key("fk_project_stock_allocations_source_location_id", "stock_locations", ["source_location_id"], ["id"])
        batch_op.create_foreign_key("fk_project_stock_allocations_stock_movement_id", "stock_movements", ["stock_movement_id"], ["id"])
        batch_op.create_foreign_key("fk_project_stock_allocations_responsible_user_id", "users", ["responsible_user_id"], ["id"])

    op.create_index("ix_project_stock_allocations_task_id", "project_stock_allocations", ["task_id"], unique=False)
    op.create_index("ix_project_stock_allocations_source_location_id", "project_stock_allocations", ["source_location_id"], unique=False)
    op.create_index("ix_project_stock_allocations_stock_movement_id", "project_stock_allocations", ["stock_movement_id"], unique=False)
    op.create_index("ix_project_stock_allocations_responsible_user_id", "project_stock_allocations", ["responsible_user_id"], unique=False)

    op.create_table(
        "stock_operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operation_kind", sa.String(length=20), nullable=False),
        sa.Column("entry_type", sa.String(length=30), nullable=True),
        sa.Column("exit_type", sa.String(length=30), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("operation_date", sa.Date(), nullable=False),
        sa.Column("source_location_id", sa.Integer(), nullable=True),
        sa.Column("destination_location_id", sa.Integer(), nullable=True),
        sa.Column("supplier_name", sa.String(length=255), nullable=True),
        sa.Column("delivery_note_number", sa.String(length=120), nullable=True),
        sa.Column("invoice_reference", sa.String(length=120), nullable=True),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("task_id", sa.Integer(), nullable=True),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=True),
        sa.Column("responsible_user_id", sa.Integer(), nullable=True),
        sa.Column("validated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("operation_kind IN ('entry', 'exit', 'transfer')", name="ck_stock_operations_kind"),
        sa.CheckConstraint(
            "entry_type IS NULL OR entry_type IN ('supplier_purchase', 'site_return', 'internal_transfer', 'stock_adjustment')",
            name="ck_stock_operations_entry_type",
        ),
        sa.CheckConstraint(
            "exit_type IS NULL OR exit_type IN ('project_assignment', 'internal_consumption', 'loss_breakage', 'theft_anomaly')",
            name="ck_stock_operations_exit_type",
        ),
        sa.CheckConstraint("status IN ('pending', 'validated', 'cancelled')", name="ck_stock_operations_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["source_location_id"], ["stock_locations.id"]),
        sa.ForeignKeyConstraint(["destination_location_id"], ["stock_locations.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["task_id"], ["project_tasks.id"]),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["responsible_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_operations_company_id", "stock_operations", ["company_id"], unique=False)
    op.create_index("ix_stock_operations_source_location_id", "stock_operations", ["source_location_id"], unique=False)
    op.create_index("ix_stock_operations_destination_location_id", "stock_operations", ["destination_location_id"], unique=False)
    op.create_index("ix_stock_operations_project_id", "stock_operations", ["project_id"], unique=False)
    op.create_index("ix_stock_operations_task_id", "stock_operations", ["task_id"], unique=False)
    op.create_index("ix_stock_operations_requested_by_user_id", "stock_operations", ["requested_by_user_id"], unique=False)
    op.create_index("ix_stock_operations_responsible_user_id", "stock_operations", ["responsible_user_id"], unique=False)
    op.create_index("ix_stock_operations_validated_by_user_id", "stock_operations", ["validated_by_user_id"], unique=False)

    op.create_table(
        "stock_operation_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("operation_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("total_amount", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_stock_operation_lines_quantity_positive"),
        sa.CheckConstraint("unit_price IS NULL OR unit_price >= 0", name="ck_stock_operation_lines_unit_price_non_negative"),
        sa.CheckConstraint("total_amount IS NULL OR total_amount >= 0", name="ck_stock_operation_lines_total_amount_non_negative"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["operation_id"], ["stock_operations.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_operation_lines_company_id", "stock_operation_lines", ["company_id"], unique=False)
    op.create_index("ix_stock_operation_lines_operation_id", "stock_operation_lines", ["operation_id"], unique=False)
    op.create_index("ix_stock_operation_lines_item_id", "stock_operation_lines", ["item_id"], unique=False)

    with op.batch_alter_table("stock_movements", schema=None) as batch_op:
        batch_op.create_foreign_key("fk_stock_movements_operation_id", "stock_operations", ["operation_id"], ["id"])
        batch_op.create_foreign_key("fk_stock_movements_operation_line_id", "stock_operation_lines", ["operation_line_id"], ["id"])
        batch_op.create_foreign_key("fk_stock_movements_project_id", "projects", ["project_id"], ["id"])
        batch_op.create_foreign_key("fk_stock_movements_task_id", "project_tasks", ["task_id"], ["id"])

    op.create_table(
        "stock_inventory_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("inventory_type", sa.String(length=20), nullable=False, server_default="periodic"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("inventory_date", sa.Date(), nullable=False),
        sa.Column("responsible_user_id", sa.Integer(), nullable=False),
        sa.Column("validated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("inventory_type IN ('periodic', 'permanent', 'cycle')", name="ck_stock_inventory_sessions_type"),
        sa.CheckConstraint("status IN ('draft', 'validated')", name="ck_stock_inventory_sessions_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["location_id"], ["stock_locations.id"]),
        sa.ForeignKeyConstraint(["responsible_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["validated_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_inventory_sessions_company_id", "stock_inventory_sessions", ["company_id"], unique=False)
    op.create_index("ix_stock_inventory_sessions_location_id", "stock_inventory_sessions", ["location_id"], unique=False)
    op.create_index("ix_stock_inventory_sessions_responsible_user_id", "stock_inventory_sessions", ["responsible_user_id"], unique=False)
    op.create_index("ix_stock_inventory_sessions_validated_by_user_id", "stock_inventory_sessions", ["validated_by_user_id"], unique=False)

    op.create_table(
        "stock_inventory_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("system_quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("counted_quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("difference_quantity", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["session_id"], ["stock_inventory_sessions.id"]),
        sa.ForeignKeyConstraint(["item_id"], ["inventory_items.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "item_id", name="uq_stock_inventory_lines_session_item"),
    )
    op.create_index("ix_stock_inventory_lines_company_id", "stock_inventory_lines", ["company_id"], unique=False)
    op.create_index("ix_stock_inventory_lines_session_id", "stock_inventory_lines", ["session_id"], unique=False)
    op.create_index("ix_stock_inventory_lines_item_id", "stock_inventory_lines", ["item_id"], unique=False)


def downgrade():
    op.drop_index("ix_stock_inventory_lines_item_id", table_name="stock_inventory_lines")
    op.drop_index("ix_stock_inventory_lines_session_id", table_name="stock_inventory_lines")
    op.drop_index("ix_stock_inventory_lines_company_id", table_name="stock_inventory_lines")
    op.drop_table("stock_inventory_lines")

    op.drop_index("ix_stock_inventory_sessions_validated_by_user_id", table_name="stock_inventory_sessions")
    op.drop_index("ix_stock_inventory_sessions_responsible_user_id", table_name="stock_inventory_sessions")
    op.drop_index("ix_stock_inventory_sessions_location_id", table_name="stock_inventory_sessions")
    op.drop_index("ix_stock_inventory_sessions_company_id", table_name="stock_inventory_sessions")
    op.drop_table("stock_inventory_sessions")

    op.drop_index("ix_stock_operation_lines_item_id", table_name="stock_operation_lines")
    op.drop_index("ix_stock_operation_lines_operation_id", table_name="stock_operation_lines")
    op.drop_index("ix_stock_operation_lines_company_id", table_name="stock_operation_lines")
    op.drop_table("stock_operation_lines")

    op.drop_index("ix_stock_operations_validated_by_user_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_responsible_user_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_requested_by_user_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_task_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_project_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_destination_location_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_source_location_id", table_name="stock_operations")
    op.drop_index("ix_stock_operations_company_id", table_name="stock_operations")
    op.drop_table("stock_operations")

    op.drop_index("ix_project_stock_allocations_responsible_user_id", table_name="project_stock_allocations")
    op.drop_index("ix_project_stock_allocations_stock_movement_id", table_name="project_stock_allocations")
    op.drop_index("ix_project_stock_allocations_source_location_id", table_name="project_stock_allocations")
    op.drop_index("ix_project_stock_allocations_task_id", table_name="project_stock_allocations")
    with op.batch_alter_table("project_stock_allocations", schema=None) as batch_op:
        batch_op.drop_constraint("fk_project_stock_allocations_responsible_user_id", type_="foreignkey")
        batch_op.drop_constraint("fk_project_stock_allocations_stock_movement_id", type_="foreignkey")
        batch_op.drop_constraint("fk_project_stock_allocations_source_location_id", type_="foreignkey")
        batch_op.drop_constraint("fk_project_stock_allocations_task_id", type_="foreignkey")
        batch_op.drop_column("responsible_user_id")
        batch_op.drop_column("stock_movement_id")
        batch_op.drop_column("source_location_id")
        batch_op.drop_column("task_id")

    op.drop_index("ix_stock_movements_task_id", table_name="stock_movements")
    op.drop_index("ix_stock_movements_project_id", table_name="stock_movements")
    op.drop_index("ix_stock_movements_operation_line_id", table_name="stock_movements")
    op.drop_index("ix_stock_movements_operation_id", table_name="stock_movements")
    with op.batch_alter_table("stock_movements", schema=None) as batch_op:
        batch_op.drop_constraint("fk_stock_movements_task_id", type_="foreignkey")
        batch_op.drop_constraint("fk_stock_movements_project_id", type_="foreignkey")
        batch_op.drop_constraint("fk_stock_movements_operation_line_id", type_="foreignkey")
        batch_op.drop_constraint("fk_stock_movements_operation_id", type_="foreignkey")
        batch_op.drop_constraint("ck_stock_movements_total_cost_non_negative", type_="check")
        batch_op.drop_constraint("ck_stock_movements_unit_cost_non_negative", type_="check")
        batch_op.drop_column("total_cost")
        batch_op.drop_column("unit_cost")
        batch_op.drop_column("stock_after")
        batch_op.drop_column("stock_before")
        batch_op.drop_column("task_id")
        batch_op.drop_column("project_id")
        batch_op.drop_column("operation_line_id")
        batch_op.drop_column("operation_id")

    with op.batch_alter_table("inventory_items", schema=None) as batch_op:
        batch_op.drop_constraint("ck_inventory_items_average_unit_cost_non_negative", type_="check")
        batch_op.drop_constraint("ck_inventory_items_max_threshold_valid", type_="check")
        batch_op.drop_constraint("ck_inventory_items_min_threshold_non_negative", type_="check")
        batch_op.drop_constraint("ck_inventory_items_category", type_="check")
        batch_op.drop_column("notes")
        batch_op.drop_column("qr_code")
        batch_op.drop_column("barcode")
        batch_op.drop_column("preferred_supplier")
        batch_op.drop_column("average_unit_cost")
        batch_op.drop_column("max_threshold")

    op.execute("UPDATE stock_locations SET location_type = 'warehouse' WHERE location_type IN ('main_warehouse', 'secondary_depot')")
    with op.batch_alter_table("stock_locations", schema=None) as batch_op:
        batch_op.drop_constraint("ck_stock_locations_type", type_="check")
        batch_op.create_check_constraint("ck_stock_locations_type", "location_type IN ('warehouse', 'site')")
        batch_op.drop_column("description")
        batch_op.drop_column("address")
