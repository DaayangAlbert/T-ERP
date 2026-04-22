from sqlalchemy import CheckConstraint, UniqueConstraint

from app.extensions import db
from app.models.base import SoftDeleteMixin, TenantScopedMixin, TimestampMixin


class FinanceEntry(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "finance_entries"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    entry_type = db.Column(db.String(20), nullable=False)
    category = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    entry_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    vendor_name = db.Column(db.String(255), nullable=True)
    reference = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)
    recorded_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("entry_type IN ('expense', 'revenue')", name="ck_finance_entries_type"),
        CheckConstraint("amount > 0", name="ck_finance_entries_amount_positive"),
    )


class BusinessPartner(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "business_partners"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(80), nullable=False)
    partner_type = db.Column(db.String(20), nullable=False, default="customer")
    legal_name = db.Column(db.String(255), nullable=False)
    contact_name = db.Column(db.String(255), nullable=True)
    tax_number = db.Column(db.String(120), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    address_line = db.Column(db.String(255), nullable=True)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_business_partners_company_code"),
        CheckConstraint("partner_type IN ('customer', 'supplier', 'both')", name="ck_business_partners_type"),
    )


class AccountingPeriod(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "accounting_periods"

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(120), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="open")
    closed_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    closed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "label", name="uq_accounting_periods_company_label"),
        CheckConstraint("status IN ('open', 'closing', 'closed')", name="ck_accounting_periods_status"),
    )


class AccountingJournal(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "accounting_journals"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    journal_type = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_accounting_journals_company_code"),
        CheckConstraint(
            "journal_type IN ('purchase', 'sales', 'cash', 'bank', 'misc')",
            name="ck_accounting_journals_type",
        ),
    )


class AccountingAccount(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "accounting_accounts"

    id = db.Column(db.Integer, primary_key=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("accounting_accounts.id"), nullable=True, index=True)
    code = db.Column(db.String(40), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    account_class = db.Column(db.String(20), nullable=False)
    account_type = db.Column(db.String(50), nullable=True)
    dominant_side = db.Column(db.String(10), nullable=False, default="debit")
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    allow_manual_entry = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_accounting_accounts_company_code"),
        CheckConstraint(
            "account_class IN ('asset', 'liability', 'expense', 'revenue', 'equity', 'treasury', 'tax')",
            name="ck_accounting_accounts_class",
        ),
        CheckConstraint("dominant_side IN ('debit', 'credit')", name="ck_accounting_accounts_side"),
    )


class TreasuryAccount(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "treasury_accounts"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(40), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    account_type = db.Column(db.String(20), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    opening_balance = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    current_balance = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    alert_threshold = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_treasury_accounts_company_code"),
        CheckConstraint("account_type IN ('cash', 'bank', 'mobile_money')", name="ck_treasury_accounts_type"),
    )


class ProjectBudget(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "project_budgets"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False, index=True)
    version_label = db.Column(db.String(80), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="draft")
    total_budget = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "project_id", "version_label", name="uq_project_budgets_company_project_version"),
        CheckConstraint("status IN ('draft', 'approved', 'archived')", name="ck_project_budgets_status"),
        CheckConstraint("total_budget >= 0", name="ck_project_budgets_total_non_negative"),
    )


class ProjectBudgetLine(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "project_budget_lines"

    id = db.Column(db.Integer, primary_key=True)
    budget_id = db.Column(db.Integer, db.ForeignKey("project_budgets.id"), nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounting_accounts.id"), nullable=True, index=True)
    category = db.Column(db.String(120), nullable=False)
    label = db.Column(db.String(255), nullable=False)
    planned_amount = db.Column(db.Numeric(14, 2), nullable=False)
    committed_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    actual_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("planned_amount >= 0", name="ck_project_budget_lines_planned_non_negative"),
        CheckConstraint("committed_amount >= 0", name="ck_project_budget_lines_committed_non_negative"),
        CheckConstraint("actual_amount >= 0", name="ck_project_budget_lines_actual_non_negative"),
    )


class ExpenseRecord(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "expense_records"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    partner_id = db.Column(db.Integer, db.ForeignKey("business_partners.id"), nullable=True, index=True)
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=True, index=True)
    expense_number = db.Column(db.String(80), nullable=False)
    category = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    net_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    expense_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    document_reference = db.Column(db.String(120), nullable=True)
    attachment_urls = db.Column(db.JSON, nullable=True)
    description = db.Column(db.Text, nullable=True)
    approval_status = db.Column(db.String(20), nullable=False, default="draft")
    payment_status = db.Column(db.String(20), nullable=False, default="unpaid")
    paid_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    approved_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "expense_number", name="uq_expense_records_company_number"),
        CheckConstraint("amount > 0", name="ck_expense_records_amount_positive"),
        CheckConstraint("net_amount >= 0", name="ck_expense_records_net_amount_non_negative"),
        CheckConstraint("tax_rate >= 0 AND tax_rate <= 100", name="ck_expense_records_tax_rate_range"),
        CheckConstraint("tax_amount >= 0", name="ck_expense_records_tax_amount_non_negative"),
        CheckConstraint(
            "approval_status IN ('draft', 'pending', 'approved', 'rejected')",
            name="ck_expense_records_approval_status",
        ),
        CheckConstraint(
            "payment_status IN ('unpaid', 'partial', 'paid')",
            name="ck_expense_records_payment_status",
        ),
        CheckConstraint("paid_amount >= 0", name="ck_expense_records_paid_amount_non_negative"),
    )


class RevenueRecord(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "revenue_records"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    partner_id = db.Column(db.Integer, db.ForeignKey("business_partners.id"), nullable=True, index=True)
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=True, index=True)
    revenue_number = db.Column(db.String(80), nullable=False)
    revenue_type = db.Column(db.String(120), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    net_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    revenue_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    reference = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)
    collection_status = db.Column(db.String(20), nullable=False, default="uncollected")
    collected_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint("company_id", "revenue_number", name="uq_revenue_records_company_number"),
        CheckConstraint("amount > 0", name="ck_revenue_records_amount_positive"),
        CheckConstraint("net_amount >= 0", name="ck_revenue_records_net_amount_non_negative"),
        CheckConstraint("tax_rate >= 0 AND tax_rate <= 100", name="ck_revenue_records_tax_rate_range"),
        CheckConstraint("tax_amount >= 0", name="ck_revenue_records_tax_amount_non_negative"),
        CheckConstraint(
            "collection_status IN ('uncollected', 'partial', 'collected')",
            name="ck_revenue_records_collection_status",
        ),
        CheckConstraint("collected_amount >= 0", name="ck_revenue_records_collected_amount_non_negative"),
    )


class Invoice(db.Model, TimestampMixin, TenantScopedMixin, SoftDeleteMixin):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True, index=True)
    invoice_number = db.Column(db.String(80), nullable=False)
    customer_name = db.Column(db.String(255), nullable=False)
    subtotal_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    tax_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    tax_amount = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    amount_total = db.Column(db.Numeric(14, 2), nullable=False)
    amount_paid = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    status = db.Column(db.String(30), nullable=False, default="draft")
    issued_on = db.Column(db.Date, nullable=False)
    due_on = db.Column(db.Date, nullable=True)
    paid_on = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("company_id", "invoice_number", name="uq_invoices_company_invoice_number"),
        CheckConstraint("subtotal_amount >= 0", name="ck_invoices_subtotal_amount_non_negative"),
        CheckConstraint("tax_rate >= 0 AND tax_rate <= 100", name="ck_invoices_tax_rate_range"),
        CheckConstraint("tax_amount >= 0", name="ck_invoices_tax_amount_non_negative"),
        CheckConstraint("amount_total > 0", name="ck_invoices_amount_total_positive"),
        CheckConstraint("amount_paid >= 0", name="ck_invoices_amount_paid_non_negative"),
        CheckConstraint(
            "status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')",
            name="ck_invoices_status",
        ),
    )


class InvoiceLine(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "invoice_lines"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    revenue_account_id = db.Column(db.Integer, db.ForeignKey("accounting_accounts.id"), nullable=True, index=True)
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    unit_price = db.Column(db.Numeric(14, 2), nullable=False, default=0)
    line_total = db.Column(db.Numeric(14, 2), nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_invoice_lines_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_invoice_lines_unit_price_non_negative"),
        CheckConstraint("line_total >= 0", name="ck_invoice_lines_line_total_non_negative"),
    )


class Payment(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    partner_id = db.Column(db.Integer, db.ForeignKey("business_partners.id"), nullable=True, index=True)
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=True, index=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=True, index=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expense_records.id"), nullable=True, index=True)
    revenue_id = db.Column(db.Integer, db.ForeignKey("revenue_records.id"), nullable=True, index=True)
    payment_direction = db.Column(db.String(20), nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="posted")
    payment_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    external_reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("payment_direction IN ('incoming', 'outgoing')", name="ck_payments_direction"),
        CheckConstraint("status IN ('pending', 'posted', 'cancelled')", name="ck_payments_status"),
        CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
    )


class TreasuryMovement(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "treasury_movements"

    id = db.Column(db.Integer, primary_key=True)
    treasury_account_id = db.Column(db.Integer, db.ForeignKey("treasury_accounts.id"), nullable=False, index=True)
    payment_id = db.Column(db.Integer, db.ForeignKey("payments.id"), nullable=True, index=True)
    direction = db.Column(db.String(20), nullable=False)
    movement_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    currency = db.Column(db.String(3), nullable=False, default="XAF")
    reference = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)
    source_type = db.Column(db.String(80), nullable=True)
    source_id = db.Column(db.Integer, nullable=True)
    running_balance = db.Column(db.Numeric(14, 2), nullable=False, default=0)

    __table_args__ = (
        CheckConstraint("direction IN ('incoming', 'outgoing', 'transfer')", name="ck_treasury_movements_direction"),
        CheckConstraint("amount > 0", name="ck_treasury_movements_amount_positive"),
    )


class InvoicePayment(db.Model, TimestampMixin, TenantScopedMixin):
    __tablename__ = "invoice_payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    amount = db.Column(db.Numeric(14, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)
    reference = db.Column(db.String(120), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    received_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)

    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_invoice_payments_amount_positive"),
    )
