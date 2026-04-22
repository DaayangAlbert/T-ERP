from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import or_

from app.core.audit import log_audit_event
from app.core.operational_profiles import infer_operational_profile_code
from app.extensions import db
from app.models.finance import (
    AccountingAccount,
    AccountingJournal,
    AccountingPeriod,
    BusinessPartner,
    ExpenseRecord,
    FinanceEntry,
    Invoice,
    InvoiceLine,
    InvoicePayment,
    Payment,
    ProjectBudget,
    ProjectBudgetLine,
    RevenueRecord,
    TreasuryAccount,
    TreasuryMovement,
)
from app.models.project import Project
from app.models.user import Role, User, UserRole


PARTNER_TYPES = {"customer", "supplier", "both"}
ACCOUNT_CLASSES = {"asset", "liability", "expense", "revenue", "equity", "treasury", "tax"}
JOURNAL_TYPES = {"purchase", "sales", "cash", "bank", "misc"}
PERIOD_STATUSES = {"open", "closing", "closed"}
TREASURY_ACCOUNT_TYPES = {"cash", "bank", "mobile_money"}
BUDGET_STATUSES = {"draft", "approved", "archived"}
EXPENSE_APPROVAL_STATUSES = {"draft", "pending", "approved", "rejected"}
EXPENSE_CREATABLE_APPROVAL_STATUSES = {"draft", "pending", "approved"}
EXPENSE_PAYMENT_STATUSES = {"unpaid", "partial", "paid"}
REVENUE_COLLECTION_STATUSES = {"uncollected", "partial", "collected"}
PAYMENT_DIRECTIONS = {"incoming", "outgoing"}
PAYMENT_STATUSES = {"pending", "posted", "cancelled"}
INVOICE_STATUSES = {"draft", "sent", "partially_paid", "paid", "overdue", "cancelled"}
INVOICE_CREATABLE_STATUSES = {"draft", "sent", "cancelled"}
TWO_PLACES = Decimal("0.01")
HUNDRED = Decimal("100.00")
MAJOR_EXPENSE_APPROVAL_THRESHOLD = Decimal("1000000.00")

DEFAULT_JOURNALS = [
    {"code": "ACH", "name": "Journal des achats", "journal_type": "purchase"},
    {"code": "VEN", "name": "Journal des ventes", "journal_type": "sales"},
    {"code": "CAI", "name": "Journal de caisse", "journal_type": "cash"},
    {"code": "BNQ", "name": "Journal de banque", "journal_type": "bank"},
    {"code": "ODV", "name": "Journal des operations diverses", "journal_type": "misc"},
]

DEFAULT_ACCOUNTS = [
    {"code": "1000", "name": "Actifs", "account_class": "asset", "account_type": "root", "dominant_side": "debit"},
    {"code": "1100", "name": "Tresorerie", "account_class": "treasury", "account_type": "cash_management", "dominant_side": "debit", "parent_code": "1000"},
    {"code": "1200", "name": "Clients", "account_class": "asset", "account_type": "receivable", "dominant_side": "debit", "parent_code": "1000"},
    {"code": "2000", "name": "Passifs", "account_class": "liability", "account_type": "root", "dominant_side": "credit"},
    {"code": "2100", "name": "Fournisseurs", "account_class": "liability", "account_type": "payable", "dominant_side": "credit", "parent_code": "2000"},
    {"code": "3000", "name": "Capitaux propres", "account_class": "equity", "account_type": "capital", "dominant_side": "credit"},
    {"code": "4000", "name": "Produits", "account_class": "revenue", "account_type": "operating_revenue", "dominant_side": "credit"},
    {"code": "4100", "name": "Chiffre d'affaires projets", "account_class": "revenue", "account_type": "project_revenue", "dominant_side": "credit", "parent_code": "4000"},
    {"code": "5000", "name": "Charges", "account_class": "expense", "account_type": "operating_expense", "dominant_side": "debit"},
    {"code": "5100", "name": "Achats et approvisionnements", "account_class": "expense", "account_type": "purchase_expense", "dominant_side": "debit", "parent_code": "5000"},
    {"code": "5200", "name": "Charges de personnel", "account_class": "expense", "account_type": "payroll_expense", "dominant_side": "debit", "parent_code": "5000"},
    {"code": "5300", "name": "Charges administratives", "account_class": "expense", "account_type": "admin_expense", "dominant_side": "debit", "parent_code": "5000"},
    {"code": "6000", "name": "Taxes", "account_class": "tax", "account_type": "tax", "dominant_side": "debit"},
    {"code": "6010", "name": "TVA deductible", "account_class": "tax", "account_type": "input_vat", "dominant_side": "debit", "parent_code": "6000"},
    {"code": "6020", "name": "TVA collectee", "account_class": "tax", "account_type": "output_vat", "dominant_side": "credit", "parent_code": "6000"},
]


class FinanceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _now_utc():
    return datetime.now(timezone.utc)


def _money(value: Any, field_name: str, *, allow_zero: bool = False, required: bool = True) -> Decimal | None:
    if value in (None, ""):
        if required:
            raise FinanceError(f"Missing field: {field_name}", status_code=400)
        return None
    try:
        amount = Decimal(str(value)).quantize(TWO_PLACES)
    except Exception as exc:
        raise FinanceError(f"{field_name} must be numeric", status_code=400) from exc
    if amount < 0 or (amount == 0 and not allow_zero):
        comparator = "greater than or equal to 0" if allow_zero else "greater than 0"
        raise FinanceError(f"{field_name} must be {comparator}", status_code=400)
    return amount


def _percentage(value: Any, field_name: str, *, required: bool = False) -> Decimal:
    if value in (None, ""):
        if required:
            raise FinanceError(f"Missing field: {field_name}", status_code=400)
        return Decimal("0.00")
    try:
        rate = Decimal(str(value)).quantize(TWO_PLACES)
    except Exception as exc:
        raise FinanceError(f"{field_name} must be numeric", status_code=400) from exc
    if rate < 0 or rate > HUNDRED:
        raise FinanceError(f"{field_name} must be between 0 and 100", status_code=400)
    return rate


def _split_inclusive_tax(total_amount: Decimal, tax_rate: Decimal) -> tuple[Decimal, Decimal]:
    gross = Decimal(total_amount or Decimal("0")).quantize(TWO_PLACES)
    rate = Decimal(tax_rate or Decimal("0")).quantize(TWO_PLACES)
    if rate <= 0:
        return gross, Decimal("0.00")
    divisor = Decimal("1.00") + (rate / HUNDRED)
    net_amount = (gross / divisor).quantize(TWO_PLACES)
    tax_amount = (gross - net_amount).quantize(TWO_PLACES)
    return net_amount, tax_amount


def _apply_tax_on_subtotal(subtotal_amount: Decimal, tax_rate: Decimal) -> tuple[Decimal, Decimal]:
    subtotal = Decimal(subtotal_amount or Decimal("0")).quantize(TWO_PLACES)
    rate = Decimal(tax_rate or Decimal("0")).quantize(TWO_PLACES)
    if rate <= 0:
        return subtotal, Decimal("0.00")
    tax_amount = (subtotal * rate / HUNDRED).quantize(TWO_PLACES)
    total_amount = (subtotal + tax_amount).quantize(TWO_PLACES)
    return total_amount, tax_amount


def _parse_date(raw_value: Any, field_name: str, *, required: bool = False) -> date | None:
    if raw_value in (None, ""):
        if required:
            raise FinanceError(f"Missing field: {field_name}", status_code=400)
        return None
    try:
        return date.fromisoformat(str(raw_value))
    except ValueError as exc:
        raise FinanceError(f"{field_name} must be in YYYY-MM-DD format", status_code=400) from exc


def _normalized_string(value: Any, field_name: str, *, required: bool = False, uppercase: bool = False) -> str | None:
    text = str(value or "").strip()
    if required and not text:
        raise FinanceError(f"Missing field: {field_name}", status_code=400)
    if uppercase:
        text = text.upper()
    return text or None


def _safe_list(value: Any) -> list[str]:
    if value in (None, ""):
        return []
    if not isinstance(value, list):
        raise FinanceError("attachment_urls must be a list", status_code=400)
    return [str(item).strip() for item in value if str(item).strip()]


def _require_project(company_id: int, project_id: int | None) -> Project | None:
    if project_id is None:
        return None
    project = Project.query.filter_by(id=project_id, company_id=company_id).first()
    if project is None or project.deleted_at is not None:
        raise FinanceError("Project not found", status_code=404)
    return project


def _require_company_user(company_id: int, user_id: int) -> User:
    user = User.query.filter_by(id=user_id, company_id=company_id).first()
    if user is None or user.deleted_at is not None or not user.is_active:
        raise FinanceError("User not found in company", status_code=404)
    return user


def _list_user_role_codes(company_id: int | None, user_id: int) -> list[str]:
    if company_id is None:
        return []

    rows = (
        db.session.query(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user_id, UserRole.company_id == company_id)
        .all()
    )
    return [str(row.code).strip().lower() for row in rows if row.code]


def _resolve_user_operational_profile_code(user: User) -> str | None:
    return infer_operational_profile_code(
        role_codes=_list_user_role_codes(user.company_id, user.id),
        job_title=user.job_title,
        department=user.department,
    )


def _require_partner(company_id: int, partner_id: int | None, *, allowed_types: set[str] | None = None) -> BusinessPartner | None:
    if partner_id is None:
        return None
    partner = BusinessPartner.query.filter_by(id=partner_id, company_id=company_id).first()
    if partner is None or partner.deleted_at is not None:
        raise FinanceError("Partner not found", status_code=404)
    if allowed_types and partner.partner_type not in allowed_types and partner.partner_type != "both":
        raise FinanceError("Partner type not allowed for this operation", status_code=400)
    return partner


def _partner_display_name(company_id: int, partner_id: int | None) -> str | None:
    if partner_id is None:
        return None
    partner = BusinessPartner.query.filter_by(id=partner_id, company_id=company_id).first()
    if partner is None or partner.deleted_at is not None:
        return None
    return partner.legal_name


def _require_treasury_account(company_id: int, treasury_account_id: int | None) -> TreasuryAccount | None:
    if treasury_account_id is None:
        return None
    account = TreasuryAccount.query.filter_by(id=treasury_account_id, company_id=company_id).first()
    if account is None or account.deleted_at is not None:
        raise FinanceError("Treasury account not found", status_code=404)
    if not account.is_active:
        raise FinanceError("Treasury account is inactive", status_code=400)
    return account


def _validate_treasury_operation(
    account: TreasuryAccount,
    *,
    direction: str,
    amount: Decimal,
    currency: str,
    movement_date: date | None = None,
) -> None:
    normalized_currency = _normalized_string(currency, "currency", required=True, uppercase=True)
    account_currency = _normalized_string(account.currency, "account.currency", required=True, uppercase=True)
    if normalized_currency != account_currency:
        raise FinanceError("Treasury account currency mismatch", status_code=400)

    if direction == "outgoing":
        if movement_date is None:
            projected_balance = Decimal(account.current_balance or Decimal("0")) - Decimal(amount or Decimal("0"))
            if projected_balance < Decimal("0"):
                raise FinanceError("Insufficient treasury balance", status_code=400)
            return
        if _treasury_timeline_would_overdraw(
            account,
            movement_date=movement_date,
            direction=direction,
            amount=Decimal(amount or Decimal("0")),
        ):
            raise FinanceError("Insufficient treasury balance", status_code=400)
        return

    if direction == "incoming":
        return

    raise FinanceError("Unsupported treasury movement direction", status_code=400)


def _treasury_sort_created_at(value: datetime | None) -> datetime:
    return value or datetime.min.replace(tzinfo=timezone.utc)


def _treasury_movement_sort_key(row: TreasuryMovement) -> tuple[date, datetime, int]:
    return (row.movement_date, _treasury_sort_created_at(row.created_at), int(row.id or 0))


def _apply_treasury_balance(balance: Decimal, direction: str, amount: Decimal) -> Decimal:
    if direction == "incoming":
        return balance + amount
    if direction == "outgoing":
        return balance - amount
    raise FinanceError("Unsupported treasury movement direction", status_code=400)


def _list_treasury_movements_chronologically(company_id: int, treasury_account_id: int) -> list[TreasuryMovement]:
    return (
        TreasuryMovement.query.filter(TreasuryMovement.company_id == company_id, TreasuryMovement.treasury_account_id == treasury_account_id)
        .order_by(TreasuryMovement.movement_date.asc(), TreasuryMovement.created_at.asc(), TreasuryMovement.id.asc())
        .all()
    )


def _treasury_timeline_would_overdraw(
    account: TreasuryAccount,
    *,
    movement_date: date,
    direction: str,
    amount: Decimal,
) -> bool:
    existing_movements = _list_treasury_movements_chronologically(account.company_id, account.id)
    candidate_created_at = _now_utc()
    balance = Decimal(account.opening_balance or Decimal("0"))
    timeline = [
        (row.movement_date, _treasury_sort_created_at(row.created_at), int(row.id or 0), row.direction, Decimal(row.amount or Decimal("0")))
        for row in existing_movements
    ]
    timeline.append((movement_date, candidate_created_at, 2**31 - 1, direction, Decimal(amount or Decimal("0"))))
    timeline.sort(key=lambda row: (row[0], row[1], row[2]))

    for _, _, _, timeline_direction, timeline_amount in timeline:
        balance = _apply_treasury_balance(balance, timeline_direction, timeline_amount)
        if balance < Decimal("0"):
            return True
    return False


def _recompute_treasury_account_balances(company_id: int, treasury_account_id: int) -> TreasuryAccount:
    account = _require_treasury_account(company_id, treasury_account_id)
    balance = Decimal(account.opening_balance or Decimal("0"))
    movements = _list_treasury_movements_chronologically(company_id, treasury_account_id)

    for row in movements:
        balance = _apply_treasury_balance(balance, row.direction, Decimal(row.amount or Decimal("0")))
        row.running_balance = balance

    account.current_balance = balance
    return account


def _validate_expense_creation_status(status: str) -> str:
    normalized = _normalized_string(status, "approval_status", required=True)
    if normalized not in EXPENSE_APPROVAL_STATUSES:
        raise FinanceError("Invalid approval_status", status_code=400)
    if normalized not in EXPENSE_CREATABLE_APPROVAL_STATUSES:
        raise FinanceError("Expenses can only be created as draft, pending or approved", status_code=400)
    return normalized


def _require_invoice(company_id: int, invoice_id: int) -> Invoice:
    invoice = Invoice.query.filter_by(id=invoice_id, company_id=company_id).first()
    if invoice is None or invoice.deleted_at is not None:
        raise FinanceError("Invoice not found", status_code=404)
    return invoice


def _require_expense(company_id: int, expense_id: int) -> ExpenseRecord:
    row = ExpenseRecord.query.filter_by(id=expense_id, company_id=company_id).first()
    if row is None or row.deleted_at is not None:
        raise FinanceError("Expense not found", status_code=404)
    return row


def _require_budget(company_id: int, budget_id: int) -> ProjectBudget:
    budget = ProjectBudget.query.filter_by(id=budget_id, company_id=company_id).first()
    if budget is None or budget.deleted_at is not None:
        raise FinanceError("Budget not found", status_code=404)
    return budget


def _require_account(company_id: int, account_id: int | None) -> AccountingAccount | None:
    if account_id is None:
        return None
    account = AccountingAccount.query.filter_by(id=account_id, company_id=company_id).first()
    if account is None or account.deleted_at is not None:
        raise FinanceError("Accounting account not found", status_code=404)
    return account


def _invoice_effective_status(row: Invoice, *, as_of: date | None = None) -> str:
    today = as_of or date.today()
    if row.status == "cancelled":
        return "cancelled"
    if row.amount_paid >= row.amount_total:
        return "paid"
    if row.amount_paid > 0:
        if row.due_on and row.due_on < today:
            return "overdue"
        return "partially_paid"
    if row.due_on and row.due_on < today and row.status not in {"draft", "cancelled"}:
        return "overdue"
    return row.status


def _validate_invoice_creation_status(status: str) -> str:
    normalized = _normalized_string(status, "status", required=True)
    if normalized not in INVOICE_STATUSES:
        raise FinanceError("Invalid invoice status", status_code=400)
    if normalized not in INVOICE_CREATABLE_STATUSES:
        raise FinanceError("Invoices can only be created as draft, sent or cancelled", status_code=400)
    return normalized


def _generate_reference(model, company_id: int, prefix: str, on_date: date | None = None) -> str:
    current_year = (on_date or date.today()).year
    next_number = model.query.filter_by(company_id=company_id).count() + 1
    return f"{prefix}-{current_year}-{next_number:04d}"


def _ensure_finance_reference_data(company_id: int) -> None:
    changed = False

    existing_journals = {
        row.code: row
        for row in AccountingJournal.query.filter_by(company_id=company_id).all()
    }
    for template in DEFAULT_JOURNALS:
        if template["code"] in existing_journals:
            continue
        db.session.add(AccountingJournal(company_id=company_id, **template))
        changed = True

    existing_accounts = {
        row.code: row
        for row in AccountingAccount.query.filter_by(company_id=company_id).all()
    }
    for template in DEFAULT_ACCOUNTS:
        if template["code"] in existing_accounts:
            continue
        payload = dict(template)
        payload.pop("parent_code", None)
        account = AccountingAccount(company_id=company_id, **payload)
        db.session.add(account)
        db.session.flush()
        existing_accounts[account.code] = account
        changed = True

    for template in DEFAULT_ACCOUNTS:
        parent_code = template.get("parent_code")
        if not parent_code:
            continue
        account = existing_accounts.get(template["code"])
        parent = existing_accounts.get(parent_code)
        if account is None or parent is None:
            continue
        if account.parent_id != parent.id:
            account.parent_id = parent.id
            changed = True

    if changed:
        db.session.commit()


def _serialize_finance_entry(row: FinanceEntry) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "entry_type": row.entry_type,
        "category": row.category,
        "amount": float(row.amount),
        "currency": row.currency,
        "entry_date": row.entry_date.isoformat(),
        "payment_method": row.payment_method,
        "vendor_name": row.vendor_name,
        "reference": row.reference,
        "description": row.description,
        "recorded_by_user_id": row.recorded_by_user_id,
    }


def serialize_finance_entry(row: FinanceEntry) -> dict[str, Any]:
    return _serialize_finance_entry(row)


def _serialize_partner(row: BusinessPartner) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "code": row.code,
        "partner_type": row.partner_type,
        "legal_name": row.legal_name,
        "contact_name": row.contact_name,
        "tax_number": row.tax_number,
        "email": row.email,
        "phone": row.phone,
        "address_line": row.address_line,
        "currency": row.currency,
        "is_active": row.is_active,
    }


def serialize_business_partner(row: BusinessPartner) -> dict[str, Any]:
    return _serialize_partner(row)


def _serialize_account(row: AccountingAccount) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "parent_id": row.parent_id,
        "code": row.code,
        "name": row.name,
        "account_class": row.account_class,
        "account_type": row.account_type,
        "dominant_side": row.dominant_side,
        "is_active": row.is_active,
        "allow_manual_entry": row.allow_manual_entry,
    }


def serialize_accounting_account(row: AccountingAccount) -> dict[str, Any]:
    return _serialize_account(row)


def _serialize_journal(row: AccountingJournal) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "code": row.code,
        "name": row.name,
        "journal_type": row.journal_type,
        "is_active": row.is_active,
    }


def serialize_accounting_journal(row: AccountingJournal) -> dict[str, Any]:
    return _serialize_journal(row)


def _serialize_period(row: AccountingPeriod) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "label": row.label,
        "start_date": row.start_date.isoformat(),
        "end_date": row.end_date.isoformat(),
        "status": row.status,
        "closed_by_user_id": row.closed_by_user_id,
        "closed_at": row.closed_at.isoformat() if row.closed_at else None,
        "notes": row.notes,
    }


def serialize_accounting_period(row: AccountingPeriod) -> dict[str, Any]:
    return _serialize_period(row)


def _serialize_treasury_account(row: TreasuryAccount) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "code": row.code,
        "name": row.name,
        "account_type": row.account_type,
        "currency": row.currency,
        "opening_balance": float(row.opening_balance),
        "current_balance": float(row.current_balance),
        "alert_threshold": float(row.alert_threshold),
        "is_active": row.is_active,
    }


def serialize_treasury_account(row: TreasuryAccount) -> dict[str, Any]:
    return _serialize_treasury_account(row)


def _serialize_treasury_movement(row: TreasuryMovement) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "treasury_account_id": row.treasury_account_id,
        "payment_id": row.payment_id,
        "direction": row.direction,
        "movement_date": row.movement_date.isoformat(),
        "amount": float(row.amount),
        "currency": row.currency,
        "reference": row.reference,
        "description": row.description,
        "source_type": row.source_type,
        "source_id": row.source_id,
        "running_balance": float(row.running_balance),
    }


def serialize_treasury_movement(row: TreasuryMovement) -> dict[str, Any]:
    return _serialize_treasury_movement(row)


def _project_actuals(company_id: int, project_id: int | None) -> tuple[Decimal, Decimal]:
    legacy_entries = FinanceEntry.query.filter(
        FinanceEntry.company_id == company_id,
        FinanceEntry.deleted_at.is_(None),
    )
    approved_expenses = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.approval_status == "approved",
    )
    revenues = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
    )

    if project_id is not None:
        legacy_entries = legacy_entries.filter(FinanceEntry.project_id == project_id)
        approved_expenses = approved_expenses.filter(ExpenseRecord.project_id == project_id)
        revenues = revenues.filter(RevenueRecord.project_id == project_id)

    legacy_rows = legacy_entries.all()
    expense_total = sum((row.amount for row in approved_expenses.all()), Decimal("0")) + sum(
        (row.amount for row in legacy_rows if row.entry_type == "expense"),
        Decimal("0"),
    )
    revenue_total = sum((row.amount for row in revenues.all()), Decimal("0")) + sum(
        (row.amount for row in legacy_rows if row.entry_type == "revenue"),
        Decimal("0"),
    )
    return expense_total, revenue_total


def _serialize_budget_line(row: ProjectBudgetLine) -> dict[str, Any]:
    return {
        "id": row.id,
        "budget_id": row.budget_id,
        "account_id": row.account_id,
        "category": row.category,
        "label": row.label,
        "planned_amount": float(row.planned_amount),
        "committed_amount": float(row.committed_amount),
        "actual_amount": float(row.actual_amount),
    }


def _serialize_budget(row: ProjectBudget) -> dict[str, Any]:
    expense_total, revenue_total = _project_actuals(row.company_id, row.project_id)
    lines = ProjectBudgetLine.query.filter_by(budget_id=row.id).order_by(ProjectBudgetLine.id.asc()).all()
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "version_label": row.version_label,
        "status": row.status,
        "total_budget": float(row.total_budget),
        "approved_by_user_id": row.approved_by_user_id,
        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
        "notes": row.notes,
        "actual_expenses": float(expense_total),
        "actual_revenues": float(revenue_total),
        "variance": float(Decimal(row.total_budget) - expense_total),
        "lines": [_serialize_budget_line(line) for line in lines],
    }


def serialize_project_budget(row: ProjectBudget) -> dict[str, Any]:
    return _serialize_budget(row)


def _serialize_expense(row: ExpenseRecord) -> dict[str, Any]:
    project = Project.query.filter_by(id=row.project_id).first() if row.project_id else None
    partner = BusinessPartner.query.filter_by(id=row.partner_id).first() if row.partner_id else None
    creator = User.query.filter_by(id=row.created_by_user_id).first() if row.created_by_user_id else None
    approver = User.query.filter_by(id=row.approved_by_user_id).first() if row.approved_by_user_id else None
    amount_due = max(Decimal(row.amount or Decimal("0")) - Decimal(row.paid_amount or Decimal("0")), Decimal("0"))

    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "project_code": project.code if project else None,
        "project_name": project.name if project else None,
        "partner_id": row.partner_id,
        "partner_name": partner.legal_name if partner else None,
        "treasury_account_id": row.treasury_account_id,
        "expense_number": row.expense_number,
        "category": row.category,
        "amount": float(row.amount),
        "net_amount": float(row.net_amount),
        "tax_rate": float(row.tax_rate),
        "tax_amount": float(row.tax_amount),
        "currency": row.currency,
        "expense_date": row.expense_date.isoformat(),
        "payment_method": row.payment_method,
        "document_reference": row.document_reference,
        "attachment_urls": row.attachment_urls or [],
        "description": row.description,
        "approval_status": row.approval_status,
        "payment_status": row.payment_status,
        "paid_amount": float(row.paid_amount),
        "amount_due": float(amount_due),
        "created_by_user_id": row.created_by_user_id,
        "created_by_user_email": creator.email if creator else None,
        "approved_by_user_id": row.approved_by_user_id,
        "approved_by_user_email": approver.email if approver else None,
        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
    }


def serialize_expense_record(row: ExpenseRecord) -> dict[str, Any]:
    return _serialize_expense(row)


def _serialize_revenue(row: RevenueRecord) -> dict[str, Any]:
    amount_due = max(Decimal(row.amount or Decimal("0")) - Decimal(row.collected_amount or Decimal("0")), Decimal("0"))
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "partner_id": row.partner_id,
        "treasury_account_id": row.treasury_account_id,
        "revenue_number": row.revenue_number,
        "revenue_type": row.revenue_type,
        "amount": float(row.amount),
        "net_amount": float(row.net_amount),
        "tax_rate": float(row.tax_rate),
        "tax_amount": float(row.tax_amount),
        "currency": row.currency,
        "revenue_date": row.revenue_date.isoformat(),
        "payment_method": row.payment_method,
        "reference": row.reference,
        "description": row.description,
        "collection_status": row.collection_status,
        "collected_amount": float(row.collected_amount),
        "amount_due": float(amount_due),
        "created_by_user_id": row.created_by_user_id,
    }


def serialize_revenue_record(row: RevenueRecord) -> dict[str, Any]:
    return _serialize_revenue(row)


def _serialize_invoice_line(row: InvoiceLine) -> dict[str, Any]:
    return {
        "id": row.id,
        "invoice_id": row.invoice_id,
        "revenue_account_id": row.revenue_account_id,
        "description": row.description,
        "quantity": float(row.quantity),
        "unit_price": float(row.unit_price),
        "line_total": float(row.line_total),
    }


def _serialize_invoice(row: Invoice) -> dict[str, Any]:
    lines = InvoiceLine.query.filter_by(invoice_id=row.id).order_by(InvoiceLine.id.asc()).all()
    effective_status = _invoice_effective_status(row)
    return {
        "id": row.id,
        "company_id": row.company_id,
        "project_id": row.project_id,
        "invoice_number": row.invoice_number,
        "customer_name": row.customer_name,
        "subtotal_amount": float(row.subtotal_amount),
        "tax_rate": float(row.tax_rate),
        "tax_amount": float(row.tax_amount),
        "amount_total": float(row.amount_total),
        "amount_paid": float(row.amount_paid),
        "amount_due": float((row.amount_total or Decimal("0")) - (row.amount_paid or Decimal("0"))),
        "currency": row.currency,
        "status": row.status,
        "effective_status": effective_status,
        "is_overdue": effective_status == "overdue",
        "issued_on": row.issued_on.isoformat() if row.issued_on else None,
        "due_on": row.due_on.isoformat() if row.due_on else None,
        "paid_on": row.paid_on.isoformat() if row.paid_on else None,
        "notes": row.notes,
        "lines": [_serialize_invoice_line(line) for line in lines],
    }


def serialize_invoice(row: Invoice) -> dict[str, Any]:
    return _serialize_invoice(row)


def _serialize_invoice_payment(row: InvoicePayment) -> dict[str, Any]:
    invoice = Invoice.query.filter_by(id=row.invoice_id).first() if row.invoice_id else None
    invoice_amount_total = Decimal(invoice.amount_total or Decimal("0")) if invoice is not None else Decimal("0")
    invoice_amount_paid = Decimal(invoice.amount_paid or Decimal("0")) if invoice is not None else Decimal("0")
    return {
        "id": row.id,
        "company_id": row.company_id,
        "invoice_id": row.invoice_id,
        "invoice_number": invoice.invoice_number if invoice is not None else None,
        "customer_name": invoice.customer_name if invoice is not None else None,
        "amount": float(row.amount),
        "payment_date": row.payment_date.isoformat(),
        "payment_method": row.payment_method,
        "reference": row.reference,
        "notes": row.notes,
        "currency": invoice.currency if invoice is not None else None,
        "invoice_amount_total": float(invoice_amount_total),
        "invoice_amount_paid": float(invoice_amount_paid),
        "invoice_amount_due": float(max(invoice_amount_total - invoice_amount_paid, Decimal("0"))),
        "received_by_user_id": row.received_by_user_id,
    }


def serialize_invoice_payment(row: InvoicePayment) -> dict[str, Any]:
    return _serialize_invoice_payment(row)


def _serialize_payment(row: Payment) -> dict[str, Any]:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "partner_id": row.partner_id,
        "treasury_account_id": row.treasury_account_id,
        "invoice_id": row.invoice_id,
        "expense_id": row.expense_id,
        "revenue_id": row.revenue_id,
        "payment_direction": row.payment_direction,
        "payment_method": row.payment_method,
        "status": row.status,
        "payment_date": row.payment_date.isoformat(),
        "amount": float(row.amount),
        "currency": row.currency,
        "external_reference": row.external_reference,
        "notes": row.notes,
        "created_by_user_id": row.created_by_user_id,
    }


def serialize_payment(row: Payment) -> dict[str, Any]:
    return _serialize_payment(row)


def build_finance_entries_query(
    company_id: int,
    project_id: int | None = None,
    entry_type: str | None = None,
    include_archived: bool = False,
):
    query = FinanceEntry.query.filter(FinanceEntry.company_id == company_id)
    if not include_archived:
        query = query.filter(FinanceEntry.deleted_at.is_(None))
    if project_id is not None:
        query = query.filter(FinanceEntry.project_id == project_id)
    if entry_type:
        query = query.filter(FinanceEntry.entry_type == entry_type)
    return query.order_by(FinanceEntry.entry_date.desc(), FinanceEntry.created_at.desc())


def list_finance_entries(
    company_id: int,
    project_id: int | None = None,
    entry_type: str | None = None,
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    return [
        serialize_finance_entry(row)
        for row in build_finance_entries_query(
            company_id=company_id,
            project_id=project_id,
            entry_type=entry_type,
            include_archived=include_archived,
        ).all()
    ]


def create_finance_entry(company_id: int, recorded_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    actor = _require_company_user(company_id=company_id, user_id=recorded_by_user_id)
    entry_type = _normalized_string(payload.get("entry_type"), "entry_type", required=True)
    if entry_type not in {"expense", "revenue"}:
        raise FinanceError("entry_type must be expense or revenue", status_code=400)

    project_id = payload.get("project_id")
    parsed_project_id = int(project_id) if project_id not in (None, "") else None
    _require_project(company_id=company_id, project_id=parsed_project_id)

    row = FinanceEntry(
        company_id=company_id,
        project_id=parsed_project_id,
        entry_type=entry_type,
        category=_normalized_string(payload.get("category"), "category", required=True),
        amount=_money(payload.get("amount"), "amount"),
        currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
        entry_date=_parse_date(payload.get("entry_date"), "entry_date", required=True),
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method"),
        vendor_name=_normalized_string(payload.get("vendor_name"), "vendor_name"),
        reference=_normalized_string(payload.get("reference"), "reference"),
        description=_normalized_string(payload.get("description"), "description"),
        recorded_by_user_id=recorded_by_user_id,
    )
    db.session.add(row)
    log_audit_event(
        module="finance",
        action="create_entry",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="finance_entry",
        description=f"Finance entry {entry_type} created",
        details={"category": row.category, "amount": float(row.amount)},
    )
    db.session.commit()
    return _serialize_finance_entry(row)


def build_accounts_query(company_id: int, account_class: str | None = None, include_archived: bool = False):
    _ensure_finance_reference_data(company_id)
    query = AccountingAccount.query.filter(AccountingAccount.company_id == company_id)
    if not include_archived:
        query = query.filter(AccountingAccount.deleted_at.is_(None))
    if account_class:
        query = query.filter(AccountingAccount.account_class == account_class)
    return query.order_by(AccountingAccount.code.asc())


def create_accounting_account(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _ensure_finance_reference_data(company_id)
    code = _normalized_string(payload.get("code"), "code", required=True, uppercase=True)
    if AccountingAccount.query.filter_by(company_id=company_id, code=code).first():
        raise FinanceError("Account code already exists", status_code=409)

    account_class = _normalized_string(payload.get("account_class"), "account_class", required=True)
    if account_class not in ACCOUNT_CLASSES:
        raise FinanceError("Invalid account_class", status_code=400)

    parent_id = payload.get("parent_id")
    parsed_parent_id = int(parent_id) if parent_id not in (None, "") else None
    _require_account(company_id, parsed_parent_id)

    row = AccountingAccount(
        company_id=company_id,
        parent_id=parsed_parent_id,
        code=code,
        name=_normalized_string(payload.get("name"), "name", required=True),
        account_class=account_class,
        account_type=_normalized_string(payload.get("account_type"), "account_type"),
        dominant_side=_normalized_string(payload.get("dominant_side") or "debit", "dominant_side", required=True),
        is_active=bool(payload.get("is_active", True)),
        allow_manual_entry=bool(payload.get("allow_manual_entry", True)),
    )
    if row.dominant_side not in {"debit", "credit"}:
        raise FinanceError("dominant_side must be debit or credit", status_code=400)
    db.session.add(row)
    db.session.commit()
    return _serialize_account(row)


def update_accounting_account(company_id: int, account_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _require_account(company_id, account_id)
    if "name" in payload:
        row.name = _normalized_string(payload.get("name"), "name", required=True)
    if "account_type" in payload:
        row.account_type = _normalized_string(payload.get("account_type"), "account_type")
    if "account_class" in payload:
        account_class = _normalized_string(payload.get("account_class"), "account_class", required=True)
        if account_class not in ACCOUNT_CLASSES:
            raise FinanceError("Invalid account_class", status_code=400)
        row.account_class = account_class
    if "dominant_side" in payload:
        dominant_side = _normalized_string(payload.get("dominant_side"), "dominant_side", required=True)
        if dominant_side not in {"debit", "credit"}:
            raise FinanceError("dominant_side must be debit or credit", status_code=400)
        row.dominant_side = dominant_side
    if "parent_id" in payload:
        parent_id = payload.get("parent_id")
        row.parent_id = int(parent_id) if parent_id not in (None, "") else None
        _require_account(company_id, row.parent_id)
    if "is_active" in payload:
        row.is_active = bool(payload["is_active"])
    if "allow_manual_entry" in payload:
        row.allow_manual_entry = bool(payload["allow_manual_entry"])
    db.session.commit()
    return _serialize_account(row)


def build_journals_query(company_id: int, journal_type: str | None = None):
    _ensure_finance_reference_data(company_id)
    query = AccountingJournal.query.filter(AccountingJournal.company_id == company_id)
    if journal_type:
        query = query.filter(AccountingJournal.journal_type == journal_type)
    return query.order_by(AccountingJournal.code.asc())


def create_accounting_journal(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _ensure_finance_reference_data(company_id)
    code = _normalized_string(payload.get("code"), "code", required=True, uppercase=True)
    if AccountingJournal.query.filter_by(company_id=company_id, code=code).first():
        raise FinanceError("Journal code already exists", status_code=409)
    journal_type = _normalized_string(payload.get("journal_type"), "journal_type", required=True)
    if journal_type not in JOURNAL_TYPES:
        raise FinanceError("Invalid journal_type", status_code=400)

    row = AccountingJournal(
        company_id=company_id,
        code=code,
        name=_normalized_string(payload.get("name"), "name", required=True),
        journal_type=journal_type,
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_journal(row)


def build_periods_query(company_id: int, status: str | None = None):
    query = AccountingPeriod.query.filter(AccountingPeriod.company_id == company_id)
    if status:
        query = query.filter(AccountingPeriod.status == status)
    return query.order_by(AccountingPeriod.start_date.desc())


def create_accounting_period(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    start_date = _parse_date(payload.get("start_date"), "start_date", required=True)
    end_date = _parse_date(payload.get("end_date"), "end_date", required=True)
    if end_date < start_date:
        raise FinanceError("end_date cannot be before start_date", status_code=400)

    label = _normalized_string(payload.get("label"), "label", required=True)
    if AccountingPeriod.query.filter_by(company_id=company_id, label=label).first():
        raise FinanceError("Period label already exists", status_code=409)

    status = _normalized_string(payload.get("status") or "open", "status", required=True)
    if status not in PERIOD_STATUSES:
        raise FinanceError("Invalid period status", status_code=400)

    row = AccountingPeriod(
        company_id=company_id,
        label=label,
        start_date=start_date,
        end_date=end_date,
        status=status,
        notes=_normalized_string(payload.get("notes"), "notes"),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_period(row)


def close_accounting_period(company_id: int, period_id: int, closed_by_user_id: int) -> dict[str, Any]:
    actor = _require_company_user(company_id, closed_by_user_id)
    row = AccountingPeriod.query.filter_by(id=period_id, company_id=company_id).first()
    if row is None:
        raise FinanceError("Accounting period not found", status_code=404)
    row.status = "closed"
    row.closed_by_user_id = actor.id
    row.closed_at = _now_utc()
    log_audit_event(
        module="finance",
        action="close_period",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="accounting_period",
        target_id=row.id,
        description=f"Accounting period {row.label} closed",
    )
    db.session.commit()
    return _serialize_period(row)


def build_partners_query(company_id: int, partner_type: str | None = None, include_archived: bool = False):
    query = BusinessPartner.query.filter(BusinessPartner.company_id == company_id)
    if not include_archived:
        query = query.filter(BusinessPartner.deleted_at.is_(None))
    if partner_type:
        query = query.filter(BusinessPartner.partner_type == partner_type)
    return query.order_by(BusinessPartner.legal_name.asc())


def create_business_partner(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    partner_type = _normalized_string(payload.get("partner_type") or "customer", "partner_type", required=True)
    if partner_type not in PARTNER_TYPES:
        raise FinanceError("Invalid partner_type", status_code=400)

    code = _normalized_string(payload.get("code"), "code", uppercase=True)
    if not code:
        prefix = {"customer": "CLI", "supplier": "FOU", "both": "TIE"}[partner_type]
        code = _generate_reference(BusinessPartner, company_id, prefix)
    if BusinessPartner.query.filter_by(company_id=company_id, code=code).first():
        raise FinanceError("Partner code already exists", status_code=409)

    row = BusinessPartner(
        company_id=company_id,
        code=code,
        partner_type=partner_type,
        legal_name=_normalized_string(payload.get("legal_name"), "legal_name", required=True),
        contact_name=_normalized_string(payload.get("contact_name"), "contact_name"),
        tax_number=_normalized_string(payload.get("tax_number"), "tax_number"),
        email=_normalized_string(payload.get("email"), "email"),
        phone=_normalized_string(payload.get("phone"), "phone"),
        address_line=_normalized_string(payload.get("address_line"), "address_line"),
        currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_partner(row)


def update_business_partner(company_id: int, partner_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    row = _require_partner(company_id, partner_id)
    if "partner_type" in payload:
        partner_type = _normalized_string(payload.get("partner_type"), "partner_type", required=True)
        if partner_type not in PARTNER_TYPES:
            raise FinanceError("Invalid partner_type", status_code=400)
        row.partner_type = partner_type
    if "legal_name" in payload:
        row.legal_name = _normalized_string(payload.get("legal_name"), "legal_name", required=True)
    if "contact_name" in payload:
        row.contact_name = _normalized_string(payload.get("contact_name"), "contact_name")
    if "tax_number" in payload:
        row.tax_number = _normalized_string(payload.get("tax_number"), "tax_number")
    if "email" in payload:
        row.email = _normalized_string(payload.get("email"), "email")
    if "phone" in payload:
        row.phone = _normalized_string(payload.get("phone"), "phone")
    if "address_line" in payload:
        row.address_line = _normalized_string(payload.get("address_line"), "address_line")
    if "currency" in payload:
        row.currency = _normalized_string(payload.get("currency"), "currency", required=True, uppercase=True)
    if "is_active" in payload:
        row.is_active = bool(payload["is_active"])
    db.session.commit()
    return _serialize_partner(row)


def build_treasury_accounts_query(company_id: int, account_type: str | None = None, include_archived: bool = False):
    query = TreasuryAccount.query.filter(TreasuryAccount.company_id == company_id)
    if not include_archived:
        query = query.filter(TreasuryAccount.deleted_at.is_(None))
    if account_type:
        query = query.filter(TreasuryAccount.account_type == account_type)
    return query.order_by(TreasuryAccount.code.asc())


def create_treasury_account(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    account_type = _normalized_string(payload.get("account_type"), "account_type", required=True)
    if account_type not in TREASURY_ACCOUNT_TYPES:
        raise FinanceError("Invalid treasury account type", status_code=400)
    code = _normalized_string(payload.get("code"), "code", required=True, uppercase=True)
    if TreasuryAccount.query.filter_by(company_id=company_id, code=code).first():
        raise FinanceError("Treasury account code already exists", status_code=409)

    opening_balance = _money(payload.get("opening_balance", 0), "opening_balance", allow_zero=True)
    row = TreasuryAccount(
        company_id=company_id,
        code=code,
        name=_normalized_string(payload.get("name"), "name", required=True),
        account_type=account_type,
        currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
        opening_balance=opening_balance,
        current_balance=opening_balance,
        alert_threshold=_money(payload.get("alert_threshold", 0), "alert_threshold", allow_zero=True),
        is_active=bool(payload.get("is_active", True)),
    )
    db.session.add(row)
    db.session.commit()
    return _serialize_treasury_account(row)


def build_treasury_movements_query(
    company_id: int,
    treasury_account_id: int | None = None,
    direction: str | None = None,
):
    query = TreasuryMovement.query.filter(TreasuryMovement.company_id == company_id)
    if treasury_account_id is not None:
        query = query.filter(TreasuryMovement.treasury_account_id == treasury_account_id)
    if direction:
        query = query.filter(TreasuryMovement.direction == direction)
    return query.order_by(TreasuryMovement.movement_date.desc(), TreasuryMovement.created_at.desc())


def _register_treasury_movement(
    *,
    company_id: int,
    treasury_account_id: int,
    direction: str,
    amount: Decimal,
    movement_date: date,
    currency: str,
    reference: str | None,
    description: str | None,
    source_type: str | None,
    source_id: int | None,
    payment_id: int | None,
) -> TreasuryMovement:
    account = _require_treasury_account(company_id, treasury_account_id)
    _validate_treasury_operation(
        account,
        direction=direction,
        amount=amount,
        currency=currency,
        movement_date=movement_date,
    )

    movement = TreasuryMovement(
        company_id=company_id,
        treasury_account_id=treasury_account_id,
        payment_id=payment_id,
        direction=direction,
        movement_date=movement_date,
        amount=amount,
        currency=currency,
        reference=reference,
        description=description,
        source_type=source_type,
        source_id=source_id,
        running_balance=Decimal("0"),
    )
    db.session.add(movement)
    db.session.flush()
    _recompute_treasury_account_balances(company_id, treasury_account_id)
    return movement


def build_budgets_query(company_id: int, project_id: int | None = None, status: str | None = None):
    query = ProjectBudget.query.filter(
        ProjectBudget.company_id == company_id,
        ProjectBudget.deleted_at.is_(None),
    )
    if project_id is not None:
        query = query.filter(ProjectBudget.project_id == project_id)
    if status:
        query = query.filter(ProjectBudget.status == status)
    return query.order_by(ProjectBudget.created_at.desc())


def create_project_budget(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    project_id = int(payload.get("project_id"))
    _require_project(company_id, project_id)
    version_label = _normalized_string(payload.get("version_label"), "version_label")
    if not version_label:
        version_label = _generate_reference(ProjectBudget, company_id, "BUD")
    if ProjectBudget.query.filter_by(company_id=company_id, project_id=project_id, version_label=version_label).first():
        raise FinanceError("Budget version already exists for this project", status_code=409)

    lines_payload = payload.get("lines") or []
    total_budget = _money(payload.get("total_budget", 0), "total_budget", allow_zero=True)
    if lines_payload:
        total_budget = sum((_money(line.get("planned_amount"), "planned_amount", allow_zero=True) for line in lines_payload), Decimal("0"))

    status = _normalized_string(payload.get("status") or "draft", "status", required=True)
    if status not in BUDGET_STATUSES:
        raise FinanceError("Invalid budget status", status_code=400)

    budget = ProjectBudget(
        company_id=company_id,
        project_id=project_id,
        version_label=version_label,
        status=status,
        total_budget=total_budget,
        notes=_normalized_string(payload.get("notes"), "notes"),
    )
    db.session.add(budget)
    db.session.flush()

    for line_payload in lines_payload:
        account_id = line_payload.get("account_id")
        parsed_account_id = int(account_id) if account_id not in (None, "") else None
        _require_account(company_id, parsed_account_id)
        db.session.add(
            ProjectBudgetLine(
                company_id=company_id,
                budget_id=budget.id,
                account_id=parsed_account_id,
                category=_normalized_string(line_payload.get("category"), "category", required=True),
                label=_normalized_string(line_payload.get("label"), "label", required=True),
                planned_amount=_money(line_payload.get("planned_amount"), "planned_amount", allow_zero=True),
                committed_amount=_money(line_payload.get("committed_amount", 0), "committed_amount", allow_zero=True),
                actual_amount=_money(line_payload.get("actual_amount", 0), "actual_amount", allow_zero=True),
            )
        )

    db.session.commit()
    return _serialize_budget(budget)


def approve_project_budget(company_id: int, budget_id: int, approved_by_user_id: int) -> dict[str, Any]:
    actor = _require_company_user(company_id, approved_by_user_id)
    budget = _require_budget(company_id, budget_id)
    budget.status = "approved"
    budget.approved_by_user_id = actor.id
    budget.approved_at = _now_utc()
    log_audit_event(
        module="finance",
        action="approve_budget",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="project_budget",
        target_id=budget.id,
        description=f"Budget {budget.version_label} approved",
    )
    db.session.commit()
    return _serialize_budget(budget)


def _create_payment(
    *,
    company_id: int,
    created_by_user_id: int,
    payment_date: date,
    amount: Decimal,
    currency: str,
    payment_direction: str,
    payment_method: str | None,
    external_reference: str | None,
    notes: str | None,
    treasury_account_id: int | None,
    partner_id: int | None = None,
    invoice_id: int | None = None,
    expense_id: int | None = None,
    revenue_id: int | None = None,
    description: str | None = None,
) -> Payment:
    if payment_direction not in PAYMENT_DIRECTIONS:
        raise FinanceError("Invalid payment direction", status_code=400)
    _require_company_user(company_id, created_by_user_id)
    _require_partner(company_id, partner_id)
    if treasury_account_id is not None:
        treasury_account = _require_treasury_account(company_id, treasury_account_id)
        _validate_treasury_operation(
            treasury_account,
            direction=payment_direction,
            amount=amount,
            currency=currency,
            movement_date=payment_date,
        )

    payment = Payment(
        company_id=company_id,
        partner_id=partner_id,
        treasury_account_id=treasury_account_id,
        invoice_id=invoice_id,
        expense_id=expense_id,
        revenue_id=revenue_id,
        payment_direction=payment_direction,
        payment_method=payment_method,
        status="posted",
        payment_date=payment_date,
        amount=amount,
        currency=currency,
        external_reference=external_reference,
        notes=notes,
        created_by_user_id=created_by_user_id,
    )
    db.session.add(payment)
    db.session.flush()

    if treasury_account_id is not None:
        _register_treasury_movement(
            company_id=company_id,
            treasury_account_id=treasury_account_id,
            direction=payment_direction,
            amount=amount,
            movement_date=payment_date,
            currency=currency,
            reference=external_reference,
            description=description,
            source_type="payment",
            source_id=payment.id,
            payment_id=payment.id,
        )

    return payment


def build_expenses_query(
    company_id: int,
    project_id: int | None = None,
    approval_status: str | None = None,
    payment_status: str | None = None,
):
    query = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
    )
    if project_id is not None:
        query = query.filter(ExpenseRecord.project_id == project_id)
    if approval_status:
        query = query.filter(ExpenseRecord.approval_status == approval_status)
    if payment_status:
        query = query.filter(ExpenseRecord.payment_status == payment_status)
    return query.order_by(ExpenseRecord.expense_date.desc(), ExpenseRecord.created_at.desc())


def create_expense_record(company_id: int, created_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    actor = _require_company_user(company_id, created_by_user_id)
    actor_operational_profile_code = _resolve_user_operational_profile_code(actor)
    project_id = payload.get("project_id")
    parsed_project_id = int(project_id) if project_id not in (None, "") else None
    partner_id = payload.get("partner_id")
    parsed_partner_id = int(partner_id) if partner_id not in (None, "") else None
    treasury_account_id = payload.get("treasury_account_id")
    parsed_treasury_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None

    _require_project(company_id, parsed_project_id)
    _require_partner(company_id, parsed_partner_id, allowed_types={"supplier"})
    treasury_account = _require_treasury_account(company_id, parsed_treasury_id)

    expense_date = _parse_date(payload.get("expense_date"), "expense_date", required=True)
    amount = _money(payload.get("amount"), "amount")
    tax_rate = _percentage(payload.get("tax_rate"), "tax_rate")
    net_amount, tax_amount = _split_inclusive_tax(amount, tax_rate)
    approval_status = _validate_expense_creation_status(payload.get("approval_status") or "draft")

    # Large expenses entered by comptables must be validated by finance leadership before execution.
    if actor_operational_profile_code == "comptable" and amount >= MAJOR_EXPENSE_APPROVAL_THRESHOLD:
        approval_status = "pending"

    if approval_status == "approved" and treasury_account is not None:
        _validate_treasury_operation(
            treasury_account,
            direction="outgoing",
            amount=amount,
            currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
            movement_date=expense_date,
        )

    row = ExpenseRecord(
        company_id=company_id,
        project_id=parsed_project_id,
        partner_id=parsed_partner_id,
        treasury_account_id=parsed_treasury_id,
        expense_number=_normalized_string(payload.get("expense_number"), "expense_number", uppercase=True) or _generate_reference(ExpenseRecord, company_id, "EXP", expense_date),
        category=_normalized_string(payload.get("category"), "category", required=True),
        amount=amount,
        net_amount=net_amount,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
        expense_date=expense_date,
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method"),
        document_reference=_normalized_string(payload.get("document_reference"), "document_reference"),
        attachment_urls=_safe_list(payload.get("attachment_urls")),
        description=_normalized_string(payload.get("description"), "description"),
        approval_status=approval_status,
        payment_status="unpaid",
        paid_amount=Decimal("0"),
        created_by_user_id=created_by_user_id,
    )
    if ExpenseRecord.query.filter_by(company_id=company_id, expense_number=row.expense_number).first():
        raise FinanceError("expense_number already exists", status_code=409)

    db.session.add(row)
    db.session.flush()

    if approval_status == "approved":
        row.approved_by_user_id = actor.id
        row.approved_at = _now_utc()
    if approval_status == "approved" and row.treasury_account_id is not None:
        row.payment_status = "paid"
        row.paid_amount = Decimal(row.amount)
        _create_payment(
            company_id=company_id,
            created_by_user_id=created_by_user_id,
            payment_date=row.expense_date,
            amount=Decimal(row.amount),
            currency=row.currency,
            payment_direction="outgoing",
            payment_method=row.payment_method,
            external_reference=row.document_reference,
            notes=row.description,
            treasury_account_id=row.treasury_account_id,
            partner_id=row.partner_id,
            expense_id=row.id,
            description=f"Paiement depense {row.expense_number}",
        )

    log_audit_event(
        module="finance",
        action="create_expense",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="expense_record",
        target_id=row.id,
        description=f"Expense {row.expense_number} created",
        details={"amount": float(row.amount), "category": row.category},
    )
    db.session.commit()
    return _serialize_expense(row)


def record_expense_payment(
    company_id: int,
    expense_id: int,
    paid_by_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    actor = _require_company_user(company_id, paid_by_user_id)
    row = _require_expense(company_id, expense_id)
    if row.approval_status != "approved":
        raise FinanceError("Only approved expenses can be paid", status_code=400)
    if Decimal(row.paid_amount or Decimal("0")) >= Decimal(row.amount or Decimal("0")):
        raise FinanceError("Expense is already fully paid", status_code=400)

    amount = _money(payload.get("amount"), "amount")
    payment_date = _parse_date(payload.get("payment_date"), "payment_date", required=True)
    if payment_date < row.expense_date:
        raise FinanceError("payment_date cannot be before expense_date", status_code=400)

    treasury_account_id = payload.get("treasury_account_id") if "treasury_account_id" in payload else row.treasury_account_id
    parsed_treasury_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None
    treasury_account = _require_treasury_account(company_id, parsed_treasury_id)

    next_paid = Decimal(row.paid_amount or Decimal("0")) + amount
    if next_paid > Decimal(row.amount or Decimal("0")):
        raise FinanceError("payment exceeds expense balance", status_code=400)
    if treasury_account is not None:
        _validate_treasury_operation(
            treasury_account,
            direction="outgoing",
            amount=amount,
            currency=row.currency,
            movement_date=payment_date,
        )

    if "treasury_account_id" in payload:
        row.treasury_account_id = parsed_treasury_id
    if "payment_method" in payload:
        row.payment_method = _normalized_string(payload.get("payment_method"), "payment_method")

    row.paid_amount = next_paid
    row.payment_status = "paid" if row.paid_amount == row.amount else "partial"

    _create_payment(
        company_id=company_id,
        created_by_user_id=paid_by_user_id,
        payment_date=payment_date,
        amount=amount,
        currency=row.currency,
        payment_direction="outgoing",
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method") or row.payment_method,
        external_reference=_normalized_string(payload.get("reference") or payload.get("external_reference"), "reference")
        or row.document_reference,
        notes=_normalized_string(payload.get("notes"), "notes") or row.description,
        treasury_account_id=row.treasury_account_id,
        partner_id=row.partner_id,
        expense_id=row.id,
        description=f"Reglement depense {row.expense_number}",
    )

    log_audit_event(
        module="finance",
        action="record_expense_payment",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="expense_record",
        target_id=row.id,
        description=f"Payment recorded for expense {row.expense_number}",
        details={"amount": float(amount), "payment_status": row.payment_status},
    )
    db.session.commit()
    return _serialize_expense(row)


def approve_expense_record(company_id: int, expense_id: int, approved_by_user_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    actor = _require_company_user(company_id, approved_by_user_id)
    row = _require_expense(company_id, expense_id)
    if row.approval_status == "approved":
        return _serialize_expense(row)
    if row.approval_status == "rejected":
        raise FinanceError("Rejected expenses cannot be approved", status_code=400)

    payload = payload or {}
    if "treasury_account_id" in payload:
        treasury_account_id = payload.get("treasury_account_id")
        row.treasury_account_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None
        _require_treasury_account(company_id, row.treasury_account_id)
    if "payment_method" in payload:
        row.payment_method = _normalized_string(payload.get("payment_method"), "payment_method")

    if row.treasury_account_id is not None and row.payment_status != "paid":
        treasury_account = _require_treasury_account(company_id, row.treasury_account_id)
        _validate_treasury_operation(
            treasury_account,
            direction="outgoing",
            amount=Decimal(row.amount),
            currency=row.currency,
            movement_date=row.expense_date,
        )

    row.approval_status = "approved"
    row.approved_by_user_id = actor.id
    row.approved_at = _now_utc()

    if row.treasury_account_id is not None and row.payment_status != "paid":
        row.payment_status = "paid"
        row.paid_amount = Decimal(row.amount)
        _create_payment(
            company_id=company_id,
            created_by_user_id=approved_by_user_id,
            payment_date=row.expense_date,
            amount=Decimal(row.amount),
            currency=row.currency,
            payment_direction="outgoing",
            payment_method=row.payment_method,
            external_reference=row.document_reference,
            notes=row.description,
            treasury_account_id=row.treasury_account_id,
            partner_id=row.partner_id,
            expense_id=row.id,
            description=f"Paiement depense {row.expense_number}",
        )

    log_audit_event(
        module="finance",
        action="approve_expense",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="expense_record",
        target_id=row.id,
        description=f"Expense {row.expense_number} approved",
    )
    db.session.commit()
    return _serialize_expense(row)


def reject_expense_record(company_id: int, expense_id: int, rejected_by_user_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    actor = _require_company_user(company_id, rejected_by_user_id)
    row = _require_expense(company_id, expense_id)
    if row.approval_status == "rejected":
        return _serialize_expense(row)
    if row.approval_status == "approved" or row.payment_status == "paid":
        raise FinanceError("Approved expenses cannot be rejected", status_code=400)

    payload = payload or {}
    decision_note = _normalized_string(payload.get("decision_note"), "decision_note")

    row.approval_status = "rejected"
    row.approved_by_user_id = None
    row.approved_at = None
    row.payment_status = "unpaid"
    row.paid_amount = Decimal("0")

    log_audit_event(
        module="finance",
        action="reject_expense",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="expense_record",
        target_id=row.id,
        description=f"Expense {row.expense_number} rejected",
        details={"decision_note": decision_note},
    )
    db.session.commit()
    return _serialize_expense(row)


def build_revenues_query(company_id: int, project_id: int | None = None, collection_status: str | None = None):
    query = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
    )
    if project_id is not None:
        query = query.filter(RevenueRecord.project_id == project_id)
    if collection_status:
        query = query.filter(RevenueRecord.collection_status == collection_status)
    return query.order_by(RevenueRecord.revenue_date.desc(), RevenueRecord.created_at.desc())


def create_revenue_record(company_id: int, created_by_user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    actor = _require_company_user(company_id, created_by_user_id)
    project_id = payload.get("project_id")
    parsed_project_id = int(project_id) if project_id not in (None, "") else None
    partner_id = payload.get("partner_id")
    parsed_partner_id = int(partner_id) if partner_id not in (None, "") else None
    treasury_account_id = payload.get("treasury_account_id")
    parsed_treasury_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None

    _require_project(company_id, parsed_project_id)
    _require_partner(company_id, parsed_partner_id, allowed_types={"customer"})
    treasury_account = _require_treasury_account(company_id, parsed_treasury_id)

    revenue_date = _parse_date(payload.get("revenue_date"), "revenue_date", required=True)
    amount = _money(payload.get("amount"), "amount")
    tax_rate = _percentage(payload.get("tax_rate"), "tax_rate")
    net_amount, tax_amount = _split_inclusive_tax(amount, tax_rate)
    currency = _normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True)
    if treasury_account is not None:
        _validate_treasury_operation(
            treasury_account,
            direction="incoming",
            amount=amount,
            currency=currency,
            movement_date=revenue_date,
        )
    row = RevenueRecord(
        company_id=company_id,
        project_id=parsed_project_id,
        partner_id=parsed_partner_id,
        treasury_account_id=parsed_treasury_id,
        revenue_number=_normalized_string(payload.get("revenue_number"), "revenue_number", uppercase=True) or _generate_reference(RevenueRecord, company_id, "REV", revenue_date),
        revenue_type=_normalized_string(payload.get("revenue_type"), "revenue_type", required=True),
        amount=amount,
        net_amount=net_amount,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        currency=currency,
        revenue_date=revenue_date,
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method"),
        reference=_normalized_string(payload.get("reference"), "reference"),
        description=_normalized_string(payload.get("description"), "description"),
        collection_status="uncollected",
        collected_amount=Decimal("0"),
        created_by_user_id=created_by_user_id,
    )
    if RevenueRecord.query.filter_by(company_id=company_id, revenue_number=row.revenue_number).first():
        raise FinanceError("revenue_number already exists", status_code=409)

    db.session.add(row)
    db.session.flush()

    if row.treasury_account_id is not None:
        row.collection_status = "collected"
        row.collected_amount = Decimal(row.amount)
        _create_payment(
            company_id=company_id,
            created_by_user_id=created_by_user_id,
            payment_date=row.revenue_date,
            amount=Decimal(row.amount),
            currency=row.currency,
            payment_direction="incoming",
            payment_method=row.payment_method,
            external_reference=row.reference,
            notes=row.description,
            treasury_account_id=row.treasury_account_id,
            partner_id=row.partner_id,
            revenue_id=row.id,
            description=f"Encaissement recette {row.revenue_number}",
        )

    log_audit_event(
        module="finance",
        action="create_revenue",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="revenue_record",
        target_id=row.id,
        description=f"Revenue {row.revenue_number} created",
        details={"amount": float(row.amount), "type": row.revenue_type},
    )
    db.session.commit()
    return _serialize_revenue(row)


def record_revenue_collection(
    company_id: int,
    revenue_id: int,
    collected_by_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    actor = _require_company_user(company_id, collected_by_user_id)
    row = RevenueRecord.query.filter_by(id=revenue_id, company_id=company_id).first()
    if row is None or row.deleted_at is not None:
        raise FinanceError("Revenue record not found", status_code=404)
    if Decimal(row.collected_amount or Decimal("0")) >= Decimal(row.amount or Decimal("0")):
        raise FinanceError("Revenue is already fully collected", status_code=400)

    amount = _money(payload.get("amount"), "amount")
    payment_date = _parse_date(payload.get("payment_date"), "payment_date", required=True)
    if payment_date < row.revenue_date:
        raise FinanceError("payment_date cannot be before revenue_date", status_code=400)

    treasury_account_id = payload.get("treasury_account_id") if "treasury_account_id" in payload else row.treasury_account_id
    parsed_treasury_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None
    treasury_account = _require_treasury_account(company_id, parsed_treasury_id)

    next_collected = Decimal(row.collected_amount or Decimal("0")) + amount
    if next_collected > Decimal(row.amount or Decimal("0")):
        raise FinanceError("collection exceeds revenue balance", status_code=400)
    if treasury_account is not None:
        _validate_treasury_operation(
            treasury_account,
            direction="incoming",
            amount=amount,
            currency=row.currency,
            movement_date=payment_date,
        )

    if "treasury_account_id" in payload:
        row.treasury_account_id = parsed_treasury_id
    if "payment_method" in payload:
        row.payment_method = _normalized_string(payload.get("payment_method"), "payment_method")

    row.collected_amount = next_collected
    row.collection_status = "collected" if row.collected_amount == row.amount else "partial"

    _create_payment(
        company_id=company_id,
        created_by_user_id=collected_by_user_id,
        payment_date=payment_date,
        amount=amount,
        currency=row.currency,
        payment_direction="incoming",
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method") or row.payment_method,
        external_reference=_normalized_string(payload.get("reference") or payload.get("external_reference"), "reference")
        or row.reference,
        notes=_normalized_string(payload.get("notes"), "notes") or row.description,
        treasury_account_id=row.treasury_account_id,
        partner_id=row.partner_id,
        revenue_id=row.id,
        description=f"Encaissement recette {row.revenue_number}",
    )

    log_audit_event(
        module="finance",
        action="record_revenue_collection",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="revenue_record",
        target_id=row.id,
        description=f"Collection recorded for revenue {row.revenue_number}",
        details={"amount": float(amount), "collection_status": row.collection_status},
    )
    db.session.commit()
    return _serialize_revenue(row)


def build_invoices_query(company_id: int, status: str | None = None):
    query = Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    if status:
        if status not in INVOICE_STATUSES:
            raise FinanceError("Invalid invoice status", status_code=400)
        today = date.today()
        if status == "paid":
            query = query.filter(Invoice.status != "cancelled", Invoice.amount_paid >= Invoice.amount_total)
        elif status == "partially_paid":
            query = query.filter(
                Invoice.status != "cancelled",
                Invoice.amount_paid > 0,
                Invoice.amount_paid < Invoice.amount_total,
                or_(Invoice.due_on.is_(None), Invoice.due_on >= today),
            )
        elif status == "overdue":
            query = query.filter(
                Invoice.status.notin_(("draft", "cancelled")),
                Invoice.due_on.isnot(None),
                Invoice.due_on < today,
                Invoice.amount_paid < Invoice.amount_total,
            )
        elif status == "sent":
            query = query.filter(
                Invoice.status == "sent",
                Invoice.amount_paid <= 0,
                or_(Invoice.due_on.is_(None), Invoice.due_on >= today),
            )
        else:
            query = query.filter(Invoice.status == status)
    return query.order_by(Invoice.issued_on.desc(), Invoice.created_at.desc())


def _build_invoice_lines(company_id: int, invoice_id: int, lines_payload: list[dict[str, Any]]) -> Decimal:
    subtotal = Decimal("0")
    for line_payload in lines_payload:
        account_id = line_payload.get("revenue_account_id")
        parsed_account_id = int(account_id) if account_id not in (None, "") else None
        _require_account(company_id, parsed_account_id)
        quantity = _money(line_payload.get("quantity", 1), "quantity")
        unit_price = _money(line_payload.get("unit_price"), "unit_price", allow_zero=True)
        line_total = (quantity * unit_price).quantize(TWO_PLACES)
        subtotal += line_total
        db.session.add(
            InvoiceLine(
                company_id=company_id,
                invoice_id=invoice_id,
                revenue_account_id=parsed_account_id,
                description=_normalized_string(line_payload.get("description"), "description", required=True),
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )
    return subtotal


def create_invoice(company_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    _ensure_finance_reference_data(company_id)
    project_id = payload.get("project_id")
    parsed_project_id = int(project_id) if project_id not in (None, "") else None
    customer_id = payload.get("customer_id")
    parsed_customer_id = int(customer_id) if customer_id not in (None, "") else None

    _require_project(company_id, parsed_project_id)
    partner = _require_partner(company_id, parsed_customer_id, allowed_types={"customer"})

    issued_on = _parse_date(payload.get("issued_on") or payload.get("issue_date"), "issued_on", required=True)
    due_on = _parse_date(payload.get("due_on") or payload.get("due_date"), "due_on")
    if due_on and due_on < issued_on:
        raise FinanceError("due_on cannot be before issued_on", status_code=400)

    invoice_number = _normalized_string(payload.get("invoice_number"), "invoice_number", uppercase=True) or _generate_reference(Invoice, company_id, "FAC", issued_on)
    if Invoice.query.filter_by(company_id=company_id, invoice_number=invoice_number).first():
        raise FinanceError("invoice_number already exists", status_code=409)

    customer_name = partner.legal_name if partner is not None else _normalized_string(payload.get("customer_name"), "customer_name", required=True)
    status = _validate_invoice_creation_status(payload.get("status") or "draft")
    tax_rate = _percentage(payload.get("tax_rate"), "tax_rate")

    invoice = Invoice(
        company_id=company_id,
        project_id=parsed_project_id,
        invoice_number=invoice_number,
        customer_name=customer_name,
        subtotal_amount=Decimal("0"),
        tax_rate=tax_rate,
        tax_amount=Decimal("0"),
        amount_total=Decimal("1.00"),
        amount_paid=Decimal("0"),
        currency=_normalized_string(payload.get("currency") or "XAF", "currency", required=True, uppercase=True),
        status=status,
        issued_on=issued_on,
        due_on=due_on,
        notes=_normalized_string(payload.get("notes"), "notes"),
    )
    db.session.add(invoice)
    db.session.flush()

    lines_payload = payload.get("lines") or []
    if lines_payload:
        invoice.subtotal_amount = _build_invoice_lines(company_id, invoice.id, lines_payload)
        invoice.amount_total, invoice.tax_amount = _apply_tax_on_subtotal(invoice.subtotal_amount, tax_rate)
    else:
        invoice.amount_total = _money(payload.get("amount_total"), "amount_total")
        invoice.subtotal_amount, invoice.tax_amount = _split_inclusive_tax(invoice.amount_total, tax_rate)

    db.session.commit()
    return _serialize_invoice(invoice)


def send_invoice(company_id: int, invoice_id: int, sent_by_user_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    actor = _require_company_user(company_id=company_id, user_id=sent_by_user_id)
    invoice = _require_invoice(company_id=company_id, invoice_id=invoice_id)
    if invoice.status == "sent":
        return _serialize_invoice(invoice)
    if invoice.status == "cancelled":
        raise FinanceError("Cancelled invoices cannot be sent", status_code=400)
    if invoice.status in {"paid", "partially_paid"} or Decimal(invoice.amount_paid or Decimal("0")) > Decimal("0"):
        raise FinanceError("Only unpaid draft invoices can be sent", status_code=400)
    if invoice.status != "draft":
        raise FinanceError("Only draft invoices can be sent", status_code=400)

    payload = payload or {}
    transition_note = _normalized_string(payload.get("transition_note"), "transition_note")

    invoice.status = "sent"
    log_audit_event(
        module="finance",
        action="send_invoice",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="invoice",
        target_id=invoice.id,
        description=f"Invoice {invoice.invoice_number} sent",
        details={"transition_note": transition_note},
    )
    db.session.commit()
    return _serialize_invoice(invoice)


def cancel_invoice(company_id: int, invoice_id: int, cancelled_by_user_id: int, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    actor = _require_company_user(company_id=company_id, user_id=cancelled_by_user_id)
    invoice = _require_invoice(company_id=company_id, invoice_id=invoice_id)
    if invoice.status == "cancelled":
        return _serialize_invoice(invoice)
    if invoice.status in {"paid", "partially_paid"} or Decimal(invoice.amount_paid or Decimal("0")) > Decimal("0"):
        raise FinanceError("Partially paid or paid invoices cannot be cancelled", status_code=400)
    if invoice.status not in {"draft", "sent", "overdue"}:
        raise FinanceError("Only draft or sent invoices can be cancelled", status_code=400)

    payload = payload or {}
    transition_note = _normalized_string(payload.get("transition_note"), "transition_note")

    invoice.status = "cancelled"
    log_audit_event(
        module="finance",
        action="cancel_invoice",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="invoice",
        target_id=invoice.id,
        description=f"Invoice {invoice.invoice_number} cancelled",
        details={"transition_note": transition_note},
    )
    db.session.commit()
    return _serialize_invoice(invoice)


def build_invoice_payments_query(company_id: int, invoice_id: int | None = None):
    query = InvoicePayment.query.filter(InvoicePayment.company_id == company_id)
    if invoice_id is not None:
        query = query.filter(InvoicePayment.invoice_id == invoice_id)
    return query.order_by(InvoicePayment.payment_date.desc(), InvoicePayment.created_at.desc())


def list_invoice_payments(company_id: int, invoice_id: int | None = None) -> list[dict[str, Any]]:
    if invoice_id is not None:
        _require_invoice(company_id=company_id, invoice_id=invoice_id)
    return [serialize_invoice_payment(row) for row in build_invoice_payments_query(company_id, invoice_id).all()]


def record_invoice_payment(
    company_id: int,
    invoice_id: int,
    received_by_user_id: int,
    payload: dict[str, Any],
) -> dict[str, Any]:
    actor = _require_company_user(company_id=company_id, user_id=received_by_user_id)
    invoice = _require_invoice(company_id=company_id, invoice_id=invoice_id)
    if invoice.status == "cancelled":
        raise FinanceError("Cannot record a payment on a cancelled invoice", status_code=400)
    if invoice.status == "draft":
        raise FinanceError("Cannot record a payment on a draft invoice", status_code=400)
    if Decimal(invoice.amount_paid or Decimal("0")) >= Decimal(invoice.amount_total or Decimal("0")):
        raise FinanceError("Invoice is already fully paid", status_code=400)
    amount = _money(payload.get("amount"), "amount")
    payment_date = _parse_date(payload.get("payment_date"), "payment_date", required=True)
    if payment_date < invoice.issued_on:
        raise FinanceError("payment_date cannot be before issued_on", status_code=400)
    treasury_account_id = payload.get("treasury_account_id")
    parsed_treasury_id = int(treasury_account_id) if treasury_account_id not in (None, "") else None
    treasury_account = _require_treasury_account(company_id, parsed_treasury_id)

    next_paid = Decimal(invoice.amount_paid or Decimal("0")) + amount
    if next_paid > invoice.amount_total:
        raise FinanceError("payment exceeds invoice balance", status_code=400)
    if treasury_account is not None:
        _validate_treasury_operation(
            treasury_account,
            direction="incoming",
            amount=amount,
            currency=invoice.currency,
            movement_date=payment_date,
        )

    payment = InvoicePayment(
        company_id=company_id,
        invoice_id=invoice.id,
        amount=amount,
        payment_date=payment_date,
        payment_method=_normalized_string(payload.get("payment_method"), "payment_method"),
        reference=_normalized_string(payload.get("reference") or payload.get("external_reference"), "reference"),
        notes=_normalized_string(payload.get("notes"), "notes"),
        received_by_user_id=received_by_user_id,
    )
    invoice.amount_paid = next_paid
    invoice.status = "paid" if invoice.amount_paid == invoice.amount_total else "partially_paid"
    if invoice.amount_paid == invoice.amount_total:
        invoice.paid_on = payment_date

    db.session.add(payment)
    db.session.flush()

    _create_payment(
        company_id=company_id,
        created_by_user_id=received_by_user_id,
        payment_date=payment_date,
        amount=amount,
        currency=invoice.currency,
        payment_direction="incoming",
        payment_method=payment.payment_method,
        external_reference=payment.reference,
        notes=payment.notes,
        treasury_account_id=parsed_treasury_id,
        invoice_id=invoice.id,
        description=f"Reglement facture {invoice.invoice_number}",
    )

    log_audit_event(
        module="finance",
        action="record_invoice_payment",
        company_id=company_id,
        actor_user_id=actor.id,
        actor_email=actor.email,
        target_type="invoice",
        target_id=invoice.id,
        description=f"Payment recorded for invoice {invoice.invoice_number}",
        details={"amount": float(amount)},
    )
    db.session.commit()
    return _serialize_invoice_payment(payment)


def build_payments_query(
    company_id: int,
    payment_direction: str | None = None,
    status: str | None = None,
):
    query = Payment.query.filter(Payment.company_id == company_id)
    if payment_direction:
        query = query.filter(Payment.payment_direction == payment_direction)
    if status:
        query = query.filter(Payment.status == status)
    return query.order_by(Payment.payment_date.desc(), Payment.created_at.desc())


def finance_summary(company_id: int, project_id: int | None = None) -> dict[str, Any]:
    expense_total, revenue_total = _project_actuals(company_id, project_id)
    invoices_query = Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None))
    treasury_query = TreasuryAccount.query.filter(TreasuryAccount.company_id == company_id, TreasuryAccount.deleted_at.is_(None))
    if project_id is not None:
        invoices_query = invoices_query.filter(Invoice.project_id == project_id)

    invoices = invoices_query.all()
    active_invoices = [row for row in invoices if row.status != "cancelled"]
    treasury_accounts = treasury_query.all()
    invoiced_amount = sum((row.amount_total for row in active_invoices), Decimal("0"))
    collected_amount = sum((row.amount_paid for row in active_invoices), Decimal("0"))
    cash_balance = sum((row.current_balance for row in treasury_accounts), Decimal("0"))

    return {
        "company_id": company_id,
        "project_id": project_id,
        "totals": {
            "expenses": float(expense_total),
            "revenues": float(revenue_total),
            "margin": float(revenue_total - expense_total),
            "invoiced": float(invoiced_amount),
            "collected": float(collected_amount),
            "outstanding": float(invoiced_amount - collected_amount),
            "cash_balance": float(cash_balance),
        },
        "counts": {
            "entries": build_finance_entries_query(company_id=company_id, project_id=project_id).count(),
            "expenses": build_expenses_query(company_id=company_id, project_id=project_id).count(),
            "revenues": build_revenues_query(company_id=company_id, project_id=project_id).count(),
            "invoices": len(active_invoices),
        },
    }


def finance_dashboard_report(company_id: int) -> dict[str, Any]:
    summary = finance_summary(company_id)
    today = date.today()
    expenses_today = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.expense_date == today,
        ExpenseRecord.approval_status == "approved",
    ).all()
    revenues_today = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
        RevenueRecord.revenue_date == today,
    ).all()
    payments_today = Payment.query.filter(
        Payment.company_id == company_id,
        Payment.status == "posted",
        Payment.payment_date == today,
    ).all()
    overdue_invoices = overdue_invoices_report(company_id)["items"]
    overdue_invoice_count = len(overdue_invoices)
    overdue_receivables = sum((Decimal(str(item.get("amount_due") or 0)) for item in overdue_invoices), Decimal("0"))
    pending_expense_rows = build_expenses_query(company_id=company_id, approval_status="pending").all()
    pending_expenses = len(pending_expense_rows)
    pending_expenses_amount = sum((Decimal(row.amount or Decimal("0")) for row in pending_expense_rows), Decimal("0"))
    open_invoices = build_invoices_query(company_id=company_id).all()
    pending_invoice_count = sum(1 for row in open_invoices if _invoice_effective_status(row) in {"sent", "partially_paid", "overdue"})
    payments_incoming_today = sum((Decimal(row.amount or Decimal("0")) for row in payments_today if row.payment_direction == "incoming"), Decimal("0"))
    payments_outgoing_today = sum((Decimal(row.amount or Decimal("0")) for row in payments_today if row.payment_direction == "outgoing"), Decimal("0"))

    alerts: list[dict[str, Any]] = []
    if overdue_invoice_count:
        alerts.append(
            {
                "level": "high",
                "code": "overdue_invoice",
                "message": f"{overdue_invoice_count} facture(s) en retard",
                "count": overdue_invoice_count,
                "amount": float(overdue_receivables),
            }
        )
    if pending_expenses:
        alerts.append(
            {
                "level": "medium",
                "code": "pending_expense",
                "message": f"{pending_expenses} depense(s) en attente de validation",
                "count": pending_expenses,
                "amount": float(pending_expenses_amount),
            }
        )

    approved_budgets = ProjectBudget.query.filter(
        ProjectBudget.company_id == company_id,
        ProjectBudget.deleted_at.is_(None),
        ProjectBudget.status == "approved",
    ).all()
    projects_by_id = {
        row.id: row
        for row in Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None)).all()
    }
    for budget in approved_budgets:
        expense_total, _ = _project_actuals(company_id, budget.project_id)
        if expense_total > budget.total_budget:
            project = projects_by_id.get(budget.project_id)
            alerts.append(
                {
                    "level": "high",
                    "code": "budget_overrun",
                    "message": f"Budget depasse sur le projet {project.name if project is not None else budget.project_id}",
                    "project_id": budget.project_id,
                    "project_name": project.name if project is not None else None,
                    "amount": float(expense_total - budget.total_budget),
                }
            )

    treasury_accounts = TreasuryAccount.query.filter(
        TreasuryAccount.company_id == company_id,
        TreasuryAccount.deleted_at.is_(None),
    ).all()
    treasury_accounts_in_alert = 0
    for account in treasury_accounts:
        if account.is_active and Decimal(account.current_balance) <= Decimal(account.alert_threshold):
            treasury_accounts_in_alert += 1
            alerts.append(
                {
                    "level": "medium",
                    "code": "cash_alert",
                    "message": f"Seuil critique atteint pour {account.name}",
                    "treasury_account_id": account.id,
                    "treasury_account_name": account.name,
                    "amount": float(Decimal(account.alert_threshold) - Decimal(account.current_balance)),
                }
            )

    tax_report = tax_summary_report(company_id)
    net_vat_payable = Decimal(str(tax_report["summary"]["net_vat_payable"]))
    if net_vat_payable > Decimal("0"):
        alerts.append(
            {
                "level": "medium",
                "code": "vat_due",
                "message": f"TVA nette a decaisser: {float(net_vat_payable):.2f} XAF",
                "amount": float(net_vat_payable),
            }
        )

    alert_priority = {"high": 2, "medium": 1, "low": 0}
    alerts.sort(
        key=lambda item: (
            -(alert_priority.get(str(item.get("level")), 0)),
            -float(item.get("amount") or 0),
            -int(item.get("count") or 0),
            str(item.get("code") or ""),
        )
    )

    return {
        "currency": "XAF",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "kpis": {
            "revenue": summary["totals"]["revenues"],
            "expenses": summary["totals"]["expenses"],
            "profit": summary["totals"]["margin"],
            "invoiced_amount": summary["totals"]["invoiced"],
            "collected_amount": summary["totals"]["collected"],
            "outstanding_amount": summary["totals"]["outstanding"],
            "cash_balance": summary["totals"]["cash_balance"],
            "payments_incoming_today": float(payments_incoming_today),
            "payments_outgoing_today": float(payments_outgoing_today),
            "net_cash_flow_today": float(payments_incoming_today - payments_outgoing_today),
            "overdue_receivables": float(overdue_receivables),
            "overdue_invoice_count": overdue_invoice_count,
            "revenues_today": float(sum((row.amount for row in revenues_today), Decimal("0"))),
            "expenses_today": float(sum((row.amount for row in expenses_today), Decimal("0"))),
            "pending_invoices": pending_invoice_count,
            "pending_expenses": pending_expenses,
            "pending_expenses_amount": float(pending_expenses_amount),
            "treasury_accounts_in_alert": treasury_accounts_in_alert,
            "treasury_accounts_count": len([row for row in treasury_accounts if row.is_active]),
        },
        "alerts": alerts,
        "treasury": [_serialize_treasury_account(row) for row in treasury_accounts],
    }


def project_profitability_report(company_id: int) -> dict[str, Any]:
    projects = Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None)).order_by(Project.name.asc()).all()
    items = []
    for project in projects:
        expense_total, revenue_total = _project_actuals(company_id, project.id)
        approved_budget = (
            ProjectBudget.query.filter(
                ProjectBudget.company_id == company_id,
                ProjectBudget.project_id == project.id,
                ProjectBudget.deleted_at.is_(None),
                ProjectBudget.status == "approved",
            )
            .order_by(ProjectBudget.created_at.desc())
            .first()
        )
        budget_amount = approved_budget.total_budget if approved_budget is not None else (project.budget_amount or Decimal("0"))
        margin = revenue_total - expense_total
        items.append(
            {
                "project_id": project.id,
                "project_code": project.code,
                "project_name": project.name,
                "budget": float(budget_amount or Decimal("0")),
                "expenses": float(expense_total),
                "revenues": float(revenue_total),
                "margin": float(margin),
                "budget_variance": float((budget_amount or Decimal("0")) - expense_total),
                "profitability_percent": float((margin / budget_amount * Decimal("100")) if budget_amount not in (None, Decimal("0")) else Decimal("0")),
            }
        )
    return {"items": items, "count": len(items)}


def cash_flow_report(company_id: int) -> dict[str, Any]:
    movements = build_treasury_movements_query(company_id=company_id).all()
    incoming = sum((row.amount for row in movements if row.direction == "incoming"), Decimal("0"))
    outgoing = sum((row.amount for row in movements if row.direction == "outgoing"), Decimal("0"))
    by_account = []
    for account in build_treasury_accounts_query(company_id=company_id).all():
        account_movements = [row for row in movements if row.treasury_account_id == account.id]
        by_account.append(
            {
                "treasury_account_id": account.id,
                "account_name": account.name,
                "incoming": float(sum((row.amount for row in account_movements if row.direction == "incoming"), Decimal("0"))),
                "outgoing": float(sum((row.amount for row in account_movements if row.direction == "outgoing"), Decimal("0"))),
                "balance": float(account.current_balance),
            }
        )
    return {
        "summary": {
            "incoming": float(incoming),
            "outgoing": float(outgoing),
            "net_cash_flow": float(incoming - outgoing),
        },
        "recent_movements": [_serialize_treasury_movement(row) for row in movements[:20]],
        "accounts": by_account,
    }


def tax_summary_report(company_id: int) -> dict[str, Any]:
    approved_expenses = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.approval_status == "approved",
    ).all()
    revenues = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
    ).all()
    invoices = Invoice.query.filter(
        Invoice.company_id == company_id,
        Invoice.deleted_at.is_(None),
        Invoice.status != "cancelled",
    ).all()

    input_vat_deductible = sum((Decimal(row.tax_amount or Decimal("0")) for row in approved_expenses), Decimal("0"))
    output_vat_invoiced = sum((Decimal(row.tax_amount or Decimal("0")) for row in invoices), Decimal("0"))
    output_vat_collected = sum((Decimal(row.tax_amount or Decimal("0")) for row in revenues), Decimal("0"))

    documents: list[dict[str, Any]] = []
    for row in invoices:
        if Decimal(row.tax_amount or Decimal("0")) <= Decimal("0"):
            continue
        documents.append(
            {
                "source_type": "invoice",
                "reference": row.invoice_number,
                "document_date": row.issued_on.isoformat(),
                "partner_name": row.customer_name,
                "base_amount": float(row.subtotal_amount),
                "tax_rate": float(row.tax_rate),
                "tax_amount": float(row.tax_amount),
                "total_amount": float(row.amount_total),
            }
        )
    for row in approved_expenses:
        if Decimal(row.tax_amount or Decimal("0")) <= Decimal("0"):
            continue
        documents.append(
            {
                "source_type": "expense",
                "reference": row.expense_number,
                "document_date": row.expense_date.isoformat(),
                "partner_name": _partner_display_name(company_id, row.partner_id),
                "base_amount": float(row.net_amount),
                "tax_rate": float(row.tax_rate),
                "tax_amount": float(row.tax_amount),
                "total_amount": float(row.amount),
            }
        )
    for row in revenues:
        if Decimal(row.tax_amount or Decimal("0")) <= Decimal("0"):
            continue
        documents.append(
            {
                "source_type": "revenue",
                "reference": row.revenue_number,
                "document_date": row.revenue_date.isoformat(),
                "partner_name": _partner_display_name(company_id, row.partner_id),
                "base_amount": float(row.net_amount),
                "tax_rate": float(row.tax_rate),
                "tax_amount": float(row.tax_amount),
                "total_amount": float(row.amount),
            }
        )

    documents.sort(key=lambda row: (row["document_date"], row["reference"]), reverse=True)

    return {
        "currency": "XAF",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "input_vat_deductible": float(input_vat_deductible),
            "output_vat_invoiced": float(output_vat_invoiced),
            "output_vat_collected": float(output_vat_collected),
            "net_vat_payable": float(output_vat_invoiced - input_vat_deductible),
            "cash_vat_position": float(output_vat_collected - input_vat_deductible),
        },
        "documents": documents,
        "count": len(documents),
    }


def finance_notifications_feed(company_id: int) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    severity_order = {"high": 0, "medium": 1, "info": 2, "low": 3}

    recent_incoming_payments = build_payments_query(
        company_id=company_id,
        payment_direction="incoming",
        status="posted",
    ).all()[:5]
    for payment in recent_incoming_payments:
        items.append(
            {
                "severity": "info",
                "code": "payment_received",
                "title": "Paiement recu",
                "message": f"Encaissement de {float(payment.amount):.2f} {payment.currency}",
                "event_date": payment.payment_date.isoformat(),
                "reference": payment.external_reference or f"PAY-{payment.id}",
            }
        )

    overdue_items = overdue_invoices_report(company_id)["items"][:8]
    for invoice in overdue_items:
        items.append(
            {
                "severity": "high",
                "code": "overdue_invoice",
                "title": "Facture en retard",
                "message": f"{invoice['invoice_number']} en retard de {invoice['days_overdue']} jour(s)",
                "event_date": invoice["due_on"],
                "reference": invoice["invoice_number"],
            }
        )

    pending_expenses = build_expenses_query(company_id=company_id, approval_status="pending").all()
    if pending_expenses:
        items.append(
            {
                "severity": "medium",
                "code": "pending_expense",
                "title": "Depenses a valider",
                "message": f"{len(pending_expenses)} depense(s) en attente de validation",
                "event_date": max((row.expense_date for row in pending_expenses), default=date.today()).isoformat(),
                "reference": None,
            }
        )

    approved_budgets = ProjectBudget.query.filter(
        ProjectBudget.company_id == company_id,
        ProjectBudget.deleted_at.is_(None),
        ProjectBudget.status == "approved",
    ).all()
    for budget in approved_budgets:
        expense_total, _ = _project_actuals(company_id, budget.project_id)
        if expense_total > budget.total_budget:
            items.append(
                {
                    "severity": "high",
                    "code": "budget_overrun",
                    "title": "Depassement budgetaire",
                    "message": f"Le projet {budget.project_id} depasse le budget approuve",
                    "event_date": (budget.approved_at.date().isoformat() if budget.approved_at else date.today().isoformat()),
                    "reference": budget.version_label,
                }
            )

    treasury_accounts = TreasuryAccount.query.filter(
        TreasuryAccount.company_id == company_id,
        TreasuryAccount.deleted_at.is_(None),
    ).all()
    for account in treasury_accounts:
        if Decimal(account.current_balance) <= Decimal(account.alert_threshold):
            items.append(
                {
                    "severity": "medium",
                    "code": "cash_alert",
                    "title": "Alerte tresorerie",
                    "message": f"Le compte {account.name} a atteint son seuil critique",
                    "event_date": date.today().isoformat(),
                    "reference": account.code,
                }
            )

    tax_report = tax_summary_report(company_id)
    if Decimal(str(tax_report["summary"]["net_vat_payable"])) > Decimal("0"):
        items.append(
            {
                "severity": "medium",
                "code": "vat_due",
                "title": "TVA a declarer",
                "message": f"TVA nette payable: {tax_report['summary']['net_vat_payable']:.2f} XAF",
                "event_date": date.today().isoformat(),
                "reference": "TVA",
            }
        )

    items.sort(
        key=lambda row: (
            severity_order.get(row["severity"], 99),
            row.get("event_date") or "",
            row.get("reference") or "",
        ),
        reverse=False,
    )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
        "count": len(items),
    }


def overdue_invoices_report(company_id: int) -> dict[str, Any]:
    items = []
    for row in build_invoices_query(company_id=company_id).all():
        if _invoice_effective_status(row) == "overdue":
            payload = _serialize_invoice(row)
            payload["days_overdue"] = payload.get("days_overdue") or 0
            items.append(payload)
    items.sort(
        key=lambda row: (
            int(row.get("days_overdue") or 0),
            float(row.get("amount_due") or 0),
        ),
        reverse=True,
    )
    return {"items": items, "count": len(items)}


def _date_matches_window(value: date | None, date_from: date | None = None, date_to: date | None = None) -> bool:
    if value is None:
        return False
    if date_from and value < date_from:
        return False
    if date_to and value > date_to:
        return False
    return True


def _resolve_account_choice(accounts_by_code: dict[str, AccountingAccount], preferred_codes: list[str], fallback_name: str) -> tuple[str, str]:
    for code in preferred_codes:
        account = accounts_by_code.get(code)
        if account is not None:
            return account.code, account.name
    return preferred_codes[0], fallback_name


def _resolve_journal_choice(journals_by_type: dict[str, AccountingJournal], journal_type: str, fallback_code: str, fallback_name: str) -> tuple[str, str, str]:
    journal = journals_by_type.get(journal_type)
    if journal is not None:
        return journal.code, journal.name, journal.journal_type
    return fallback_code, fallback_name, journal_type


def _resolve_treasury_account_for_export(
    default_treasury_account: tuple[str, str],
    treasury_by_id: dict[int, TreasuryAccount],
    treasury_account_id: int | None,
) -> tuple[str, str]:
    treasury = treasury_by_id.get(treasury_account_id) if treasury_account_id is not None else None
    if treasury is not None:
        return treasury.code, treasury.name
    return default_treasury_account


def _resolve_project_for_export(projects_by_id: dict[int, Project], project_id: int | None) -> tuple[str | None, str | None]:
    project = projects_by_id.get(project_id) if project_id is not None else None
    if project is None:
        return None, None
    return project.code, project.name


def _resolve_partner_for_export(partners_by_id: dict[int, BusinessPartner], partner_id: int | None) -> tuple[str | None, str | None]:
    partner = partners_by_id.get(partner_id) if partner_id is not None else None
    if partner is None:
        return None, None
    return partner.code, partner.legal_name


def _resolve_expense_account_for_export(accounts_by_code: dict[str, AccountingAccount], category: str | None) -> tuple[str, str]:
    category_text = (category or "").lower()
    if any(keyword in category_text for keyword in {"salary", "salaire", "payroll", "personnel"}):
        return _resolve_account_choice(accounts_by_code, ["5200", "5000"], "Charges de personnel")
    if any(keyword in category_text for keyword in {"admin", "administratif", "bureau", "office"}):
        return _resolve_account_choice(accounts_by_code, ["5300", "5000"], "Charges administratives")
    return _resolve_account_choice(accounts_by_code, ["5100", "5000"], "Achats et approvisionnements")


def _append_accounting_export_entry(
    items: list[dict[str, Any]],
    *,
    entry_reference: str,
    entry_date: date,
    journal_code: str,
    journal_name: str,
    journal_type: str,
    piece_reference: str,
    label: str,
    source_type: str,
    source_id: int,
    currency: str,
    project_code: str | None,
    project_name: str | None,
    partner_code: str | None,
    partner_name: str | None,
    tax_rate: Decimal | None,
    due_date: date | None,
    lines: list[dict[str, Any]],
) -> int:
    normalized_lines = []
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")

    for line in lines:
        debit = Decimal(line.get("debit") or Decimal("0")).quantize(TWO_PLACES)
        credit = Decimal(line.get("credit") or Decimal("0")).quantize(TWO_PLACES)
        if debit == 0 and credit == 0:
            continue
        total_debit += debit
        total_credit += credit
        normalized_lines.append(
            {
                "account_code": line["account_code"],
                "account_name": line["account_name"],
                "debit": debit,
                "credit": credit,
            }
        )

    if not normalized_lines:
        return 0
    if total_debit.quantize(TWO_PLACES) != total_credit.quantize(TWO_PLACES):
        raise FinanceError(f"Unbalanced accounting export for {entry_reference}", status_code=500)

    for index, line in enumerate(normalized_lines, start=1):
        items.append(
            {
                "entry_reference": entry_reference,
                "line_number": index,
                "entry_date": entry_date.isoformat(),
                "journal_code": journal_code,
                "journal_name": journal_name,
                "journal_type": journal_type,
                "piece_reference": piece_reference,
                "label": label,
                "account_code": line["account_code"],
                "account_name": line["account_name"],
                "partner_code": partner_code,
                "partner_name": partner_name,
                "debit": float(line["debit"]),
                "credit": float(line["credit"]),
                "currency": currency,
                "project_code": project_code,
                "project_name": project_name,
                "source_type": source_type,
                "source_id": source_id,
                "tax_rate": float(Decimal(tax_rate or Decimal("0")).quantize(TWO_PLACES)),
                "due_date": due_date.isoformat() if due_date else None,
            }
        )
    return 1


def accounting_journal_export(
    company_id: int,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    if date_from and date_to and date_to < date_from:
        raise FinanceError("date_to cannot be before date_from", status_code=400)

    _ensure_finance_reference_data(company_id)

    accounts = AccountingAccount.query.filter(
        AccountingAccount.company_id == company_id,
        AccountingAccount.deleted_at.is_(None),
    ).all()
    accounts_by_code = {row.code: row for row in accounts}
    accounts_by_id = {row.id: row for row in accounts}
    journals_by_type = {
        row.journal_type: row
        for row in AccountingJournal.query.filter_by(company_id=company_id).all()
    }
    partners_by_id = {
        row.id: row
        for row in BusinessPartner.query.filter(
            BusinessPartner.company_id == company_id,
            BusinessPartner.deleted_at.is_(None),
        ).all()
    }
    projects_by_id = {
        row.id: row
        for row in Project.query.filter(
            Project.company_id == company_id,
            Project.deleted_at.is_(None),
        ).all()
    }
    treasury_by_id = {
        row.id: row
        for row in TreasuryAccount.query.filter(
            TreasuryAccount.company_id == company_id,
            TreasuryAccount.deleted_at.is_(None),
        ).all()
    }

    receivable_account = _resolve_account_choice(accounts_by_code, ["1200"], "Clients")
    payable_account = _resolve_account_choice(accounts_by_code, ["2100"], "Fournisseurs")
    revenue_account = _resolve_account_choice(accounts_by_code, ["4100", "4000"], "Produits")
    default_treasury_account = _resolve_account_choice(accounts_by_code, ["1100"], "Tresorerie")
    input_vat_account = _resolve_account_choice(accounts_by_code, ["6010", "6000"], "TVA deductible")
    output_vat_account = _resolve_account_choice(accounts_by_code, ["6020", "6000"], "TVA collectee")
    sales_journal = _resolve_journal_choice(journals_by_type, "sales", "VEN", "Journal des ventes")
    purchase_journal = _resolve_journal_choice(journals_by_type, "purchase", "ACH", "Journal des achats")
    misc_journal = _resolve_journal_choice(journals_by_type, "misc", "ODV", "Journal des operations diverses")
    cash_journal = _resolve_journal_choice(journals_by_type, "cash", "CAI", "Journal de caisse")
    bank_journal = _resolve_journal_choice(journals_by_type, "bank", "BNQ", "Journal de banque")

    items: list[dict[str, Any]] = []
    entry_count = 0

    approved_expenses = ExpenseRecord.query.filter(
        ExpenseRecord.company_id == company_id,
        ExpenseRecord.deleted_at.is_(None),
        ExpenseRecord.approval_status == "approved",
    ).order_by(ExpenseRecord.expense_date.asc(), ExpenseRecord.id.asc()).all()
    for expense in approved_expenses:
        if not _date_matches_window(expense.expense_date, date_from, date_to):
            continue
        project_code, project_name = _resolve_project_for_export(projects_by_id, expense.project_id)
        partner_code, partner_name = _resolve_partner_for_export(partners_by_id, expense.partner_id)
        expense_account = _resolve_expense_account_for_export(accounts_by_code, expense.category)
        settlement_account = (
            _resolve_treasury_account_for_export(default_treasury_account, treasury_by_id, expense.treasury_account_id)
            if expense.payment_status == "paid"
            else payable_account
        )
        entry_count += _append_accounting_export_entry(
            items,
            entry_reference=f"EXP-{expense.id}",
            entry_date=expense.expense_date,
            journal_code=purchase_journal[0],
            journal_name=purchase_journal[1],
            journal_type=purchase_journal[2],
            piece_reference=expense.expense_number,
            label=expense.description or expense.category,
            source_type="expense_record",
            source_id=expense.id,
            currency=expense.currency,
            project_code=project_code,
            project_name=project_name,
            partner_code=partner_code,
            partner_name=partner_name,
            tax_rate=Decimal(expense.tax_rate or Decimal("0")),
            due_date=None,
            lines=[
                {"account_code": expense_account[0], "account_name": expense_account[1], "debit": expense.net_amount, "credit": Decimal("0")},
                {"account_code": input_vat_account[0], "account_name": input_vat_account[1], "debit": expense.tax_amount, "credit": Decimal("0")},
                {"account_code": settlement_account[0], "account_name": settlement_account[1], "debit": Decimal("0"), "credit": expense.amount},
            ],
        )

    revenues = RevenueRecord.query.filter(
        RevenueRecord.company_id == company_id,
        RevenueRecord.deleted_at.is_(None),
    ).order_by(RevenueRecord.revenue_date.asc(), RevenueRecord.id.asc()).all()
    for revenue in revenues:
        if not _date_matches_window(revenue.revenue_date, date_from, date_to):
            continue
        project_code, project_name = _resolve_project_for_export(projects_by_id, revenue.project_id)
        partner_code, partner_name = _resolve_partner_for_export(partners_by_id, revenue.partner_id)
        counterparty_account = (
            _resolve_treasury_account_for_export(default_treasury_account, treasury_by_id, revenue.treasury_account_id)
            if revenue.treasury_account_id is not None
            else receivable_account
        )
        entry_count += _append_accounting_export_entry(
            items,
            entry_reference=f"REV-{revenue.id}",
            entry_date=revenue.revenue_date,
            journal_code=sales_journal[0],
            journal_name=sales_journal[1],
            journal_type=sales_journal[2],
            piece_reference=revenue.revenue_number,
            label=revenue.description or revenue.revenue_type,
            source_type="revenue_record",
            source_id=revenue.id,
            currency=revenue.currency,
            project_code=project_code,
            project_name=project_name,
            partner_code=partner_code,
            partner_name=partner_name,
            tax_rate=Decimal(revenue.tax_rate or Decimal("0")),
            due_date=None,
            lines=[
                {"account_code": counterparty_account[0], "account_name": counterparty_account[1], "debit": revenue.amount, "credit": Decimal("0")},
                {"account_code": revenue_account[0], "account_name": revenue_account[1], "debit": Decimal("0"), "credit": revenue.net_amount},
                {"account_code": output_vat_account[0], "account_name": output_vat_account[1], "debit": Decimal("0"), "credit": revenue.tax_amount},
            ],
        )

    invoices = Invoice.query.filter(
        Invoice.company_id == company_id,
        Invoice.deleted_at.is_(None),
    ).order_by(Invoice.issued_on.asc(), Invoice.id.asc()).all()
    invoice_numbers_by_id = {row.id: row.invoice_number for row in invoices}
    for invoice in invoices:
        if invoice.status in {"draft", "cancelled"}:
            continue
        if not _date_matches_window(invoice.issued_on, date_from, date_to):
            continue
        project_code, project_name = _resolve_project_for_export(projects_by_id, invoice.project_id)
        line_amounts: dict[tuple[str, str], Decimal] = defaultdict(lambda: Decimal("0.00"))
        for line in InvoiceLine.query.filter_by(invoice_id=invoice.id).order_by(InvoiceLine.id.asc()).all():
            account = accounts_by_id.get(line.revenue_account_id) if line.revenue_account_id is not None else None
            account_key = (
                account.code if account is not None else revenue_account[0],
                account.name if account is not None else revenue_account[1],
            )
            line_amounts[account_key] += Decimal(line.line_total or Decimal("0"))
        if not line_amounts:
            line_amounts[(revenue_account[0], revenue_account[1])] = Decimal(invoice.subtotal_amount or Decimal("0"))

        export_lines = [
            {"account_code": receivable_account[0], "account_name": receivable_account[1], "debit": invoice.amount_total, "credit": Decimal("0")},
        ]
        for (account_code, account_name), amount in sorted(line_amounts.items(), key=lambda row: row[0][0]):
            export_lines.append({"account_code": account_code, "account_name": account_name, "debit": Decimal("0"), "credit": amount})
        export_lines.append(
            {"account_code": output_vat_account[0], "account_name": output_vat_account[1], "debit": Decimal("0"), "credit": invoice.tax_amount}
        )
        entry_count += _append_accounting_export_entry(
            items,
            entry_reference=f"INV-{invoice.id}",
            entry_date=invoice.issued_on,
            journal_code=sales_journal[0],
            journal_name=sales_journal[1],
            journal_type=sales_journal[2],
            piece_reference=invoice.invoice_number,
            label=f"Facture {invoice.customer_name}",
            source_type="invoice",
            source_id=invoice.id,
            currency=invoice.currency,
            project_code=project_code,
            project_name=project_name,
            partner_code=None,
            partner_name=invoice.customer_name,
            tax_rate=Decimal(invoice.tax_rate or Decimal("0")),
            due_date=invoice.due_on,
            lines=export_lines,
        )

    posted_invoice_payments = Payment.query.filter(
        Payment.company_id == company_id,
        Payment.invoice_id.isnot(None),
        Payment.status == "posted",
    ).order_by(Payment.payment_date.asc(), Payment.id.asc()).all()
    for payment in posted_invoice_payments:
        if not _date_matches_window(payment.payment_date, date_from, date_to):
            continue
        invoice_number = invoice_numbers_by_id.get(payment.invoice_id) or f"FAC-{payment.invoice_id}"
        treasury_account = _resolve_treasury_account_for_export(default_treasury_account, treasury_by_id, payment.treasury_account_id)
        payment_journal = bank_journal if treasury_by_id.get(payment.treasury_account_id) and treasury_by_id[payment.treasury_account_id].account_type == "bank" else cash_journal
        partner_code, partner_name = _resolve_partner_for_export(partners_by_id, payment.partner_id)
        entry_count += _append_accounting_export_entry(
            items,
            entry_reference=f"PAY-{payment.id}",
            entry_date=payment.payment_date,
            journal_code=payment_journal[0],
            journal_name=payment_journal[1],
            journal_type=payment_journal[2],
            piece_reference=payment.external_reference or invoice_number,
            label=f"Reglement {invoice_number}",
            source_type="payment",
            source_id=payment.id,
            currency=payment.currency,
            project_code=None,
            project_name=None,
            partner_code=partner_code,
            partner_name=partner_name,
            tax_rate=Decimal("0"),
            due_date=None,
            lines=[
                {"account_code": treasury_account[0], "account_name": treasury_account[1], "debit": payment.amount, "credit": Decimal("0")},
                {"account_code": receivable_account[0], "account_name": receivable_account[1], "debit": Decimal("0"), "credit": payment.amount},
            ],
        )

    finance_entries = FinanceEntry.query.filter(
        FinanceEntry.company_id == company_id,
        FinanceEntry.deleted_at.is_(None),
    ).order_by(FinanceEntry.entry_date.asc(), FinanceEntry.id.asc()).all()
    for entry in finance_entries:
        if not _date_matches_window(entry.entry_date, date_from, date_to):
            continue
        project_code, project_name = _resolve_project_for_export(projects_by_id, entry.project_id)
        if entry.entry_type == "expense":
            debit_account = _resolve_expense_account_for_export(accounts_by_code, entry.category)
            credit_account = default_treasury_account
        else:
            debit_account = default_treasury_account
            credit_account = revenue_account
        entry_count += _append_accounting_export_entry(
            items,
            entry_reference=f"LEG-{entry.id}",
            entry_date=entry.entry_date,
            journal_code=misc_journal[0],
            journal_name=misc_journal[1],
            journal_type=misc_journal[2],
            piece_reference=entry.reference or f"ENT-{entry.id}",
            label=entry.description or entry.category,
            source_type="finance_entry",
            source_id=entry.id,
            currency=entry.currency,
            project_code=project_code,
            project_name=project_name,
            partner_code=None,
            partner_name=entry.vendor_name,
            tax_rate=Decimal("0"),
            due_date=None,
            lines=[
                {"account_code": debit_account[0], "account_name": debit_account[1], "debit": entry.amount, "credit": Decimal("0")},
                {"account_code": credit_account[0], "account_name": credit_account[1], "debit": Decimal("0"), "credit": entry.amount},
            ],
        )

    items.sort(key=lambda row: (row["entry_date"], row["journal_code"], row["entry_reference"], row["line_number"]))
    total_debit = sum((Decimal(str(row["debit"])) for row in items), Decimal("0.00"))
    total_credit = sum((Decimal(str(row["credit"])) for row in items), Decimal("0.00"))

    return {
        "standard": "generic_accounting_journal_v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date_from": date_from.isoformat() if date_from else None,
        "date_to": date_to.isoformat() if date_to else None,
        "summary": {
            "entries": entry_count,
            "lines": len(items),
            "total_debit": float(total_debit),
            "total_credit": float(total_credit),
            "balance_gap": float((total_debit - total_credit).quantize(TWO_PLACES)),
        },
        "items": items,
        "count": len(items),
    }


def finance_export_payload(
    company_id: int,
    report_name: str,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
) -> dict[str, Any]:
    if report_name == "dashboard":
        return finance_dashboard_report(company_id)
    if report_name == "cash_flow":
        return cash_flow_report(company_id)
    if report_name == "tax_summary":
        return tax_summary_report(company_id)
    if report_name == "notifications":
        return finance_notifications_feed(company_id)
    if report_name == "expenses":
        rows = build_expenses_query(company_id=company_id).all()
        return {"items": [_serialize_expense(row) for row in rows], "count": len(rows)}
    if report_name == "revenues":
        rows = build_revenues_query(company_id=company_id).all()
        return {"items": [_serialize_revenue(row) for row in rows], "count": len(rows)}
    if report_name == "invoices":
        rows = build_invoices_query(company_id=company_id).all()
        return {"items": [_serialize_invoice(row) for row in rows], "count": len(rows)}
    if report_name == "accounting_journal":
        return accounting_journal_export(company_id=company_id, date_from=date_from, date_to=date_to)
    raise FinanceError("Unsupported export report", status_code=400)
