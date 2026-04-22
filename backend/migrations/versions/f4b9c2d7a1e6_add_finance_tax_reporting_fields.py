"""add finance tax reporting fields

Revision ID: f4b9c2d7a1e6
Revises: e3c1a9f7b2d4
Create Date: 2026-03-31 21:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f4b9c2d7a1e6"
down_revision = "e3c1a9f7b2d4"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("expense_records") as batch_op:
        batch_op.add_column(sa.Column("net_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_rate", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.create_check_constraint("ck_expense_records_net_amount_non_negative", "net_amount >= 0")
        batch_op.create_check_constraint("ck_expense_records_tax_rate_range", "tax_rate >= 0 AND tax_rate <= 100")
        batch_op.create_check_constraint("ck_expense_records_tax_amount_non_negative", "tax_amount >= 0")

    with op.batch_alter_table("revenue_records") as batch_op:
        batch_op.add_column(sa.Column("net_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_rate", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.create_check_constraint("ck_revenue_records_net_amount_non_negative", "net_amount >= 0")
        batch_op.create_check_constraint("ck_revenue_records_tax_rate_range", "tax_rate >= 0 AND tax_rate <= 100")
        batch_op.create_check_constraint("ck_revenue_records_tax_amount_non_negative", "tax_amount >= 0")

    with op.batch_alter_table("invoices") as batch_op:
        batch_op.add_column(sa.Column("subtotal_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_rate", sa.Numeric(precision=5, scale=2), nullable=False, server_default="0"))
        batch_op.add_column(sa.Column("tax_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"))
        batch_op.create_check_constraint("ck_invoices_subtotal_amount_non_negative", "subtotal_amount >= 0")
        batch_op.create_check_constraint("ck_invoices_tax_rate_range", "tax_rate >= 0 AND tax_rate <= 100")
        batch_op.create_check_constraint("ck_invoices_tax_amount_non_negative", "tax_amount >= 0")

    op.execute("UPDATE expense_records SET net_amount = amount, tax_rate = 0, tax_amount = 0")
    op.execute("UPDATE revenue_records SET net_amount = amount, tax_rate = 0, tax_amount = 0")
    op.execute("UPDATE invoices SET subtotal_amount = amount_total, tax_rate = 0, tax_amount = 0")


def downgrade():
    with op.batch_alter_table("invoices") as batch_op:
        batch_op.drop_constraint("ck_invoices_tax_amount_non_negative", type_="check")
        batch_op.drop_constraint("ck_invoices_tax_rate_range", type_="check")
        batch_op.drop_constraint("ck_invoices_subtotal_amount_non_negative", type_="check")
        batch_op.drop_column("tax_amount")
        batch_op.drop_column("tax_rate")
        batch_op.drop_column("subtotal_amount")

    with op.batch_alter_table("revenue_records") as batch_op:
        batch_op.drop_constraint("ck_revenue_records_tax_amount_non_negative", type_="check")
        batch_op.drop_constraint("ck_revenue_records_tax_rate_range", type_="check")
        batch_op.drop_constraint("ck_revenue_records_net_amount_non_negative", type_="check")
        batch_op.drop_column("tax_amount")
        batch_op.drop_column("tax_rate")
        batch_op.drop_column("net_amount")

    with op.batch_alter_table("expense_records") as batch_op:
        batch_op.drop_constraint("ck_expense_records_tax_amount_non_negative", type_="check")
        batch_op.drop_constraint("ck_expense_records_tax_rate_range", type_="check")
        batch_op.drop_constraint("ck_expense_records_net_amount_non_negative", type_="check")
        batch_op.drop_column("tax_amount")
        batch_op.drop_column("tax_rate")
        batch_op.drop_column("net_amount")
