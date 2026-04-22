from marshmallow import fields, validate

from app.core.validation import TenantBodySchema, TenantQuerySchema


FINANCE_ENTRY_TYPES = ["expense", "revenue"]
INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]
PARTNER_TYPES = ["customer", "supplier", "both"]
ACCOUNT_CLASSES = ["asset", "liability", "expense", "revenue", "equity", "treasury", "tax"]
JOURNAL_TYPES = ["purchase", "sales", "cash", "bank", "misc"]
PERIOD_STATUSES = ["open", "closing", "closed"]
TREASURY_ACCOUNT_TYPES = ["cash", "bank", "mobile_money"]
BUDGET_STATUSES = ["draft", "approved", "archived"]
EXPENSE_APPROVAL_STATUSES = ["draft", "pending", "approved", "rejected"]
EXPENSE_PAYMENT_STATUSES = ["unpaid", "partial", "paid"]
REVENUE_COLLECTION_STATUSES = ["uncollected", "partial", "collected"]
PAYMENT_DIRECTIONS = ["incoming", "outgoing"]
PAYMENT_STATUSES = ["pending", "posted", "cancelled"]
EXPORT_FORMATS = ["pdf", "xlsx", "csv"]
EXPORT_REPORTS = ["dashboard", "cash_flow", "tax_summary", "notifications", "expenses", "revenues", "invoices", "accounting_journal"]


class FinanceSummaryQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)


class FinanceEntriesListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    entry_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(FINANCE_ENTRY_TYPES))
    include_archived = fields.Boolean(load_default=False)


class FinanceEntryCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    entry_type = fields.String(required=True, validate=validate.OneOf(FINANCE_ENTRY_TYPES))
    category = fields.String(required=True, validate=validate.Length(min=1))
    amount = fields.Decimal(required=True, as_string=False)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    entry_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    vendor_name = fields.String(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    description = fields.String(required=False, allow_none=True)


class AccountsListQuerySchema(TenantQuerySchema):
    account_class = fields.String(required=False, allow_none=True, validate=validate.OneOf(ACCOUNT_CLASSES))
    include_archived = fields.Boolean(load_default=False)


class AccountingAccountCreateSchema(TenantBodySchema):
    parent_id = fields.Integer(required=False, allow_none=True)
    code = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    account_class = fields.String(required=True, validate=validate.OneOf(ACCOUNT_CLASSES))
    account_type = fields.String(required=False, allow_none=True)
    dominant_side = fields.String(load_default="debit", validate=validate.OneOf(["debit", "credit"]))
    is_active = fields.Boolean(load_default=True)
    allow_manual_entry = fields.Boolean(load_default=True)


class AccountingAccountUpdateSchema(TenantBodySchema):
    parent_id = fields.Integer(required=False, allow_none=True)
    name = fields.String(required=False)
    account_class = fields.String(required=False, validate=validate.OneOf(ACCOUNT_CLASSES))
    account_type = fields.String(required=False, allow_none=True)
    dominant_side = fields.String(required=False, validate=validate.OneOf(["debit", "credit"]))
    is_active = fields.Boolean(required=False)
    allow_manual_entry = fields.Boolean(required=False)


class JournalsListQuerySchema(TenantQuerySchema):
    journal_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(JOURNAL_TYPES))


class AccountingJournalCreateSchema(TenantBodySchema):
    code = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    journal_type = fields.String(required=True, validate=validate.OneOf(JOURNAL_TYPES))
    is_active = fields.Boolean(load_default=True)


class PeriodsListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(PERIOD_STATUSES))


class AccountingPeriodCreateSchema(TenantBodySchema):
    label = fields.String(required=True, validate=validate.Length(min=1))
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    status = fields.String(load_default="open", validate=validate.OneOf(PERIOD_STATUSES))
    notes = fields.String(required=False, allow_none=True)


class PartnersListQuerySchema(TenantQuerySchema):
    partner_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(PARTNER_TYPES))
    include_archived = fields.Boolean(load_default=False)


class BusinessPartnerCreateSchema(TenantBodySchema):
    code = fields.String(required=False, allow_none=True)
    partner_type = fields.String(load_default="customer", validate=validate.OneOf(PARTNER_TYPES))
    legal_name = fields.String(required=True, validate=validate.Length(min=1))
    contact_name = fields.String(required=False, allow_none=True)
    tax_number = fields.String(required=False, allow_none=True)
    email = fields.String(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    is_active = fields.Boolean(load_default=True)


class BusinessPartnerUpdateSchema(TenantBodySchema):
    partner_type = fields.String(required=False, validate=validate.OneOf(PARTNER_TYPES))
    legal_name = fields.String(required=False)
    contact_name = fields.String(required=False, allow_none=True)
    tax_number = fields.String(required=False, allow_none=True)
    email = fields.String(required=False, allow_none=True)
    phone = fields.String(required=False, allow_none=True)
    address_line = fields.String(required=False, allow_none=True)
    currency = fields.String(required=False, validate=validate.Length(equal=3))
    is_active = fields.Boolean(required=False)


class TreasuryAccountsListQuerySchema(TenantQuerySchema):
    account_type = fields.String(required=False, allow_none=True, validate=validate.OneOf(TREASURY_ACCOUNT_TYPES))
    include_archived = fields.Boolean(load_default=False)


class TreasuryAccountCreateSchema(TenantBodySchema):
    code = fields.String(required=True, validate=validate.Length(min=1))
    name = fields.String(required=True, validate=validate.Length(min=1))
    account_type = fields.String(required=True, validate=validate.OneOf(TREASURY_ACCOUNT_TYPES))
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    opening_balance = fields.Decimal(load_default=0, as_string=False)
    alert_threshold = fields.Decimal(load_default=0, as_string=False)
    is_active = fields.Boolean(load_default=True)


class TreasuryMovementsListQuerySchema(TenantQuerySchema):
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    direction = fields.String(required=False, allow_none=True, validate=validate.OneOf(["incoming", "outgoing", "transfer"]))


class ProjectBudgetLineSchema(TenantBodySchema):
    account_id = fields.Integer(required=False, allow_none=True)
    category = fields.String(required=True, validate=validate.Length(min=1))
    label = fields.String(required=True, validate=validate.Length(min=1))
    planned_amount = fields.Decimal(required=True, as_string=False)
    committed_amount = fields.Decimal(load_default=0, as_string=False)
    actual_amount = fields.Decimal(load_default=0, as_string=False)


class BudgetsListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(BUDGET_STATUSES))


class ProjectBudgetCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=True)
    version_label = fields.String(required=False, allow_none=True)
    status = fields.String(load_default="draft", validate=validate.OneOf(BUDGET_STATUSES))
    total_budget = fields.Decimal(load_default=0, as_string=False)
    notes = fields.String(required=False, allow_none=True)
    lines = fields.List(fields.Nested(ProjectBudgetLineSchema()), load_default=list)


class ExpenseListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    approval_status = fields.String(required=False, allow_none=True, validate=validate.OneOf(EXPENSE_APPROVAL_STATUSES))
    payment_status = fields.String(required=False, allow_none=True, validate=validate.OneOf(EXPENSE_PAYMENT_STATUSES))


class ExpenseCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    partner_id = fields.Integer(required=False, allow_none=True)
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    expense_number = fields.String(required=False, allow_none=True)
    category = fields.String(required=True, validate=validate.Length(min=1))
    amount = fields.Decimal(required=True, as_string=False)
    tax_rate = fields.Decimal(load_default=0, as_string=False)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    expense_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    document_reference = fields.String(required=False, allow_none=True)
    attachment_urls = fields.List(fields.String(), load_default=list)
    description = fields.String(required=False, allow_none=True)
    approval_status = fields.String(load_default="draft", validate=validate.OneOf(EXPENSE_APPROVAL_STATUSES))


class ExpenseApproveSchema(TenantBodySchema):
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    payment_method = fields.String(required=False, allow_none=True)


class ExpenseRejectSchema(TenantBodySchema):
    decision_note = fields.String(required=False, allow_none=True)


class ExpensePaymentCreateSchema(TenantBodySchema):
    amount = fields.Decimal(required=True, as_string=False)
    payment_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    external_reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class RevenueListQuerySchema(TenantQuerySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    collection_status = fields.String(required=False, allow_none=True, validate=validate.OneOf(REVENUE_COLLECTION_STATUSES))


class RevenueCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    partner_id = fields.Integer(required=False, allow_none=True)
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    revenue_number = fields.String(required=False, allow_none=True)
    revenue_type = fields.String(required=True, validate=validate.Length(min=1))
    amount = fields.Decimal(required=True, as_string=False)
    tax_rate = fields.Decimal(load_default=0, as_string=False)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    revenue_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    description = fields.String(required=False, allow_none=True)


class RevenueCollectionCreateSchema(TenantBodySchema):
    amount = fields.Decimal(required=True, as_string=False)
    payment_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    external_reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class InvoiceLineCreateSchema(TenantBodySchema):
    revenue_account_id = fields.Integer(required=False, allow_none=True)
    description = fields.String(required=True, validate=validate.Length(min=1))
    quantity = fields.Decimal(load_default=1, as_string=False)
    unit_price = fields.Decimal(required=True, as_string=False)


class InvoicesListQuerySchema(TenantQuerySchema):
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(INVOICE_STATUSES))


class InvoiceCreateSchema(TenantBodySchema):
    project_id = fields.Integer(required=False, allow_none=True)
    customer_id = fields.Integer(required=False, allow_none=True)
    invoice_number = fields.String(required=False, allow_none=True)
    customer_name = fields.String(required=False, allow_none=True)
    amount_total = fields.Decimal(required=False, as_string=False)
    tax_rate = fields.Decimal(load_default=0, as_string=False)
    currency = fields.String(load_default="XAF", validate=validate.Length(equal=3))
    status = fields.String(load_default="draft", validate=validate.OneOf(INVOICE_STATUSES))
    issued_on = fields.Date(required=False, allow_none=True)
    issue_date = fields.Date(required=False, allow_none=True)
    due_on = fields.Date(required=False, allow_none=True)
    due_date = fields.Date(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)
    lines = fields.List(fields.Nested(InvoiceLineCreateSchema()), load_default=list)


class InvoicePaymentCreateSchema(TenantBodySchema):
    amount = fields.Decimal(required=True, as_string=False)
    payment_date = fields.Date(required=True)
    payment_method = fields.String(required=False, allow_none=True)
    treasury_account_id = fields.Integer(required=False, allow_none=True)
    reference = fields.String(required=False, allow_none=True)
    external_reference = fields.String(required=False, allow_none=True)
    notes = fields.String(required=False, allow_none=True)


class InvoiceTransitionSchema(TenantBodySchema):
    transition_note = fields.String(required=False, allow_none=True)


class PaymentsListQuerySchema(TenantQuerySchema):
    payment_direction = fields.String(required=False, allow_none=True, validate=validate.OneOf(PAYMENT_DIRECTIONS))
    status = fields.String(required=False, allow_none=True, validate=validate.OneOf(PAYMENT_STATUSES))


class FinanceExportQuerySchema(TenantQuerySchema):
    report = fields.String(required=True, validate=validate.OneOf(EXPORT_REPORTS))
    format = fields.String(required=True, validate=validate.OneOf(EXPORT_FORMATS))
    date_from = fields.Date(required=False, allow_none=True)
    date_to = fields.Date(required=False, allow_none=True)
