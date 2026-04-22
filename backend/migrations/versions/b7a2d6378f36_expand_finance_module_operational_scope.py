"""Expand finance module operational scope

Revision ID: b7a2d6378f36
Revises: 5c9d6f4a7b21
Create Date: 2026-03-30 13:45:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7a2d6378f36"
down_revision = "c8a7b1d2e3f4"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "business_partners",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("partner_type", sa.String(length=20), nullable=False, server_default="customer"),
        sa.Column("legal_name", sa.String(length=255), nullable=False),
        sa.Column("contact_name", sa.String(length=255), nullable=True),
        sa.Column("tax_number", sa.String(length=120), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address_line", sa.String(length=255), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("partner_type IN ('customer', 'supplier', 'both')", name="ck_business_partners_type"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_business_partners_company_code"),
    )
    op.create_index("ix_business_partners_company_id", "business_partners", ["company_id"], unique=False)

    op.create_table(
        "accounting_periods",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("closed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("status IN ('open', 'closing', 'closed')", name="ck_accounting_periods_status"),
        sa.ForeignKeyConstraint(["closed_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "label", name="uq_accounting_periods_company_label"),
    )
    op.create_index("ix_accounting_periods_closed_by_user_id", "accounting_periods", ["closed_by_user_id"], unique=False)
    op.create_index("ix_accounting_periods_company_id", "accounting_periods", ["company_id"], unique=False)

    op.create_table(
        "accounting_journals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("journal_type", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "journal_type IN ('purchase', 'sales', 'cash', 'bank', 'misc')",
            name="ck_accounting_journals_type",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_accounting_journals_company_code"),
    )
    op.create_index("ix_accounting_journals_company_id", "accounting_journals", ["company_id"], unique=False)

    op.create_table(
        "accounting_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("account_class", sa.String(length=20), nullable=False),
        sa.Column("account_type", sa.String(length=50), nullable=True),
        sa.Column("dominant_side", sa.String(length=10), nullable=False, server_default="debit"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("allow_manual_entry", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "account_class IN ('asset', 'liability', 'expense', 'revenue', 'equity', 'treasury', 'tax')",
            name="ck_accounting_accounts_class",
        ),
        sa.CheckConstraint("dominant_side IN ('debit', 'credit')", name="ck_accounting_accounts_side"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["accounting_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_accounting_accounts_company_code"),
    )
    op.create_index("ix_accounting_accounts_company_id", "accounting_accounts", ["company_id"], unique=False)
    op.create_index("ix_accounting_accounts_parent_id", "accounting_accounts", ["parent_id"], unique=False)

    op.create_table(
        "treasury_accounts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("account_type", sa.String(length=20), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("opening_balance", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("current_balance", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("alert_threshold", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("account_type IN ('cash', 'bank', 'mobile_money')", name="ck_treasury_accounts_type"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "code", name="uq_treasury_accounts_company_code"),
    )
    op.create_index("ix_treasury_accounts_company_id", "treasury_accounts", ["company_id"], unique=False)

    op.create_table(
        "project_budgets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=False),
        sa.Column("version_label", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("total_budget", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("approved_by_user_id", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('draft', 'approved', 'archived')", name="ck_project_budgets_status"),
        sa.CheckConstraint("total_budget >= 0", name="ck_project_budgets_total_non_negative"),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "project_id", "version_label", name="uq_project_budgets_company_project_version"),
    )
    op.create_index("ix_project_budgets_approved_by_user_id", "project_budgets", ["approved_by_user_id"], unique=False)
    op.create_index("ix_project_budgets_company_id", "project_budgets", ["company_id"], unique=False)
    op.create_index("ix_project_budgets_project_id", "project_budgets", ["project_id"], unique=False)

    op.create_table(
        "expense_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("partner_id", sa.Integer(), nullable=True),
        sa.Column("treasury_account_id", sa.Integer(), nullable=True),
        sa.Column("expense_number", sa.String(length=80), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("document_reference", sa.String(length=120), nullable=True),
        sa.Column("attachment_urls", sa.JSON(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("approval_status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="unpaid"),
        sa.Column("paid_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("approved_by_user_id", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_expense_records_amount_positive"),
        sa.CheckConstraint(
            "approval_status IN ('draft', 'pending', 'approved', 'rejected')",
            name="ck_expense_records_approval_status",
        ),
        sa.CheckConstraint("paid_amount >= 0", name="ck_expense_records_paid_amount_non_negative"),
        sa.CheckConstraint("payment_status IN ('unpaid', 'partial', 'paid')", name="ck_expense_records_payment_status"),
        sa.ForeignKeyConstraint(["approved_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["partner_id"], ["business_partners.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["treasury_account_id"], ["treasury_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "expense_number", name="uq_expense_records_company_number"),
    )
    op.create_index("ix_expense_records_approved_by_user_id", "expense_records", ["approved_by_user_id"], unique=False)
    op.create_index("ix_expense_records_company_id", "expense_records", ["company_id"], unique=False)
    op.create_index("ix_expense_records_created_by_user_id", "expense_records", ["created_by_user_id"], unique=False)
    op.create_index("ix_expense_records_partner_id", "expense_records", ["partner_id"], unique=False)
    op.create_index("ix_expense_records_project_id", "expense_records", ["project_id"], unique=False)
    op.create_index("ix_expense_records_treasury_account_id", "expense_records", ["treasury_account_id"], unique=False)

    op.create_table(
        "revenue_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("partner_id", sa.Integer(), nullable=True),
        sa.Column("treasury_account_id", sa.Integer(), nullable=True),
        sa.Column("revenue_number", sa.String(length=80), nullable=False),
        sa.Column("revenue_type", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("revenue_date", sa.Date(), nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("collection_status", sa.String(length=20), nullable=False, server_default="uncollected"),
        sa.Column("collected_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount > 0", name="ck_revenue_records_amount_positive"),
        sa.CheckConstraint(
            "collection_status IN ('uncollected', 'partial', 'collected')",
            name="ck_revenue_records_collection_status",
        ),
        sa.CheckConstraint("collected_amount >= 0", name="ck_revenue_records_collected_amount_non_negative"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["partner_id"], ["business_partners.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.ForeignKeyConstraint(["treasury_account_id"], ["treasury_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "revenue_number", name="uq_revenue_records_company_number"),
    )
    op.create_index("ix_revenue_records_company_id", "revenue_records", ["company_id"], unique=False)
    op.create_index("ix_revenue_records_created_by_user_id", "revenue_records", ["created_by_user_id"], unique=False)
    op.create_index("ix_revenue_records_partner_id", "revenue_records", ["partner_id"], unique=False)
    op.create_index("ix_revenue_records_project_id", "revenue_records", ["project_id"], unique=False)
    op.create_index("ix_revenue_records_treasury_account_id", "revenue_records", ["treasury_account_id"], unique=False)

    op.create_table(
        "invoice_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("revenue_account_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=12, scale=2), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("line_total >= 0", name="ck_invoice_lines_line_total_non_negative"),
        sa.CheckConstraint("quantity > 0", name="ck_invoice_lines_quantity_positive"),
        sa.CheckConstraint("unit_price >= 0", name="ck_invoice_lines_unit_price_non_negative"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["revenue_account_id"], ["accounting_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_lines_company_id", "invoice_lines", ["company_id"], unique=False)
    op.create_index("ix_invoice_lines_invoice_id", "invoice_lines", ["invoice_id"], unique=False)
    op.create_index("ix_invoice_lines_revenue_account_id", "invoice_lines", ["revenue_account_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("partner_id", sa.Integer(), nullable=True),
        sa.Column("treasury_account_id", sa.Integer(), nullable=True),
        sa.Column("invoice_id", sa.Integer(), nullable=True),
        sa.Column("expense_id", sa.Integer(), nullable=True),
        sa.Column("revenue_id", sa.Integer(), nullable=True),
        sa.Column("payment_direction", sa.String(length=20), nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="posted"),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("external_reference", sa.String(length=120), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
        sa.CheckConstraint("payment_direction IN ('incoming', 'outgoing')", name="ck_payments_direction"),
        sa.CheckConstraint("status IN ('pending', 'posted', 'cancelled')", name="ck_payments_status"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["expense_id"], ["expense_records.id"]),
        sa.ForeignKeyConstraint(["invoice_id"], ["invoices.id"]),
        sa.ForeignKeyConstraint(["partner_id"], ["business_partners.id"]),
        sa.ForeignKeyConstraint(["revenue_id"], ["revenue_records.id"]),
        sa.ForeignKeyConstraint(["treasury_account_id"], ["treasury_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_company_id", "payments", ["company_id"], unique=False)
    op.create_index("ix_payments_created_by_user_id", "payments", ["created_by_user_id"], unique=False)
    op.create_index("ix_payments_expense_id", "payments", ["expense_id"], unique=False)
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"], unique=False)
    op.create_index("ix_payments_partner_id", "payments", ["partner_id"], unique=False)
    op.create_index("ix_payments_revenue_id", "payments", ["revenue_id"], unique=False)
    op.create_index("ix_payments_treasury_account_id", "payments", ["treasury_account_id"], unique=False)

    op.create_table(
        "treasury_movements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("treasury_account_id", sa.Integer(), nullable=False),
        sa.Column("payment_id", sa.Integer(), nullable=True),
        sa.Column("direction", sa.String(length=20), nullable=False),
        sa.Column("movement_date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="XAF"),
        sa.Column("reference", sa.String(length=120), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=True),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("running_balance", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("amount > 0", name="ck_treasury_movements_amount_positive"),
        sa.CheckConstraint(
            "direction IN ('incoming', 'outgoing', 'transfer')",
            name="ck_treasury_movements_direction",
        ),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"]),
        sa.ForeignKeyConstraint(["treasury_account_id"], ["treasury_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_treasury_movements_company_id", "treasury_movements", ["company_id"], unique=False)
    op.create_index("ix_treasury_movements_payment_id", "treasury_movements", ["payment_id"], unique=False)
    op.create_index("ix_treasury_movements_treasury_account_id", "treasury_movements", ["treasury_account_id"], unique=False)

    op.create_table(
        "project_budget_lines",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("budget_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("planned_amount", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("committed_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("actual_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("actual_amount >= 0", name="ck_project_budget_lines_actual_non_negative"),
        sa.CheckConstraint("committed_amount >= 0", name="ck_project_budget_lines_committed_non_negative"),
        sa.CheckConstraint("planned_amount >= 0", name="ck_project_budget_lines_planned_non_negative"),
        sa.ForeignKeyConstraint(["account_id"], ["accounting_accounts.id"]),
        sa.ForeignKeyConstraint(["budget_id"], ["project_budgets.id"]),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_budget_lines_account_id", "project_budget_lines", ["account_id"], unique=False)
    op.create_index("ix_project_budget_lines_budget_id", "project_budget_lines", ["budget_id"], unique=False)
    op.create_index("ix_project_budget_lines_company_id", "project_budget_lines", ["company_id"], unique=False)


def downgrade():
    op.drop_index("ix_project_budget_lines_company_id", table_name="project_budget_lines")
    op.drop_index("ix_project_budget_lines_budget_id", table_name="project_budget_lines")
    op.drop_index("ix_project_budget_lines_account_id", table_name="project_budget_lines")
    op.drop_table("project_budget_lines")

    op.drop_index("ix_treasury_movements_treasury_account_id", table_name="treasury_movements")
    op.drop_index("ix_treasury_movements_payment_id", table_name="treasury_movements")
    op.drop_index("ix_treasury_movements_company_id", table_name="treasury_movements")
    op.drop_table("treasury_movements")

    op.drop_index("ix_payments_treasury_account_id", table_name="payments")
    op.drop_index("ix_payments_revenue_id", table_name="payments")
    op.drop_index("ix_payments_partner_id", table_name="payments")
    op.drop_index("ix_payments_invoice_id", table_name="payments")
    op.drop_index("ix_payments_expense_id", table_name="payments")
    op.drop_index("ix_payments_created_by_user_id", table_name="payments")
    op.drop_index("ix_payments_company_id", table_name="payments")
    op.drop_table("payments")

    op.drop_index("ix_invoice_lines_revenue_account_id", table_name="invoice_lines")
    op.drop_index("ix_invoice_lines_invoice_id", table_name="invoice_lines")
    op.drop_index("ix_invoice_lines_company_id", table_name="invoice_lines")
    op.drop_table("invoice_lines")

    op.drop_index("ix_revenue_records_treasury_account_id", table_name="revenue_records")
    op.drop_index("ix_revenue_records_project_id", table_name="revenue_records")
    op.drop_index("ix_revenue_records_partner_id", table_name="revenue_records")
    op.drop_index("ix_revenue_records_created_by_user_id", table_name="revenue_records")
    op.drop_index("ix_revenue_records_company_id", table_name="revenue_records")
    op.drop_table("revenue_records")

    op.drop_index("ix_expense_records_treasury_account_id", table_name="expense_records")
    op.drop_index("ix_expense_records_project_id", table_name="expense_records")
    op.drop_index("ix_expense_records_partner_id", table_name="expense_records")
    op.drop_index("ix_expense_records_created_by_user_id", table_name="expense_records")
    op.drop_index("ix_expense_records_company_id", table_name="expense_records")
    op.drop_index("ix_expense_records_approved_by_user_id", table_name="expense_records")
    op.drop_table("expense_records")

    op.drop_index("ix_project_budgets_project_id", table_name="project_budgets")
    op.drop_index("ix_project_budgets_company_id", table_name="project_budgets")
    op.drop_index("ix_project_budgets_approved_by_user_id", table_name="project_budgets")
    op.drop_table("project_budgets")

    op.drop_index("ix_treasury_accounts_company_id", table_name="treasury_accounts")
    op.drop_table("treasury_accounts")

    op.drop_index("ix_accounting_accounts_parent_id", table_name="accounting_accounts")
    op.drop_index("ix_accounting_accounts_company_id", table_name="accounting_accounts")
    op.drop_table("accounting_accounts")

    op.drop_index("ix_accounting_journals_company_id", table_name="accounting_journals")
    op.drop_table("accounting_journals")

    op.drop_index("ix_accounting_periods_company_id", table_name="accounting_periods")
    op.drop_index("ix_accounting_periods_closed_by_user_id", table_name="accounting_periods")
    op.drop_table("accounting_periods")

    op.drop_index("ix_business_partners_company_id", table_name="business_partners")
    op.drop_table("business_partners")
