from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.core.multitenancy import resolve_target_company_id as resolve_company_scope, resolve_tenant_context
from app.core.pagination import get_pagination_params, paginate_query
from app.core.responses import error_response_from_exception
from app.core.rbac import require_permission
from app.core.security import rate_limit
from app.core.validation import load_json, load_query
from app.modules.finance.schemas import (
    AccountingAccountCreateSchema,
    AccountingAccountUpdateSchema,
    AccountingJournalCreateSchema,
    AccountingPeriodCreateSchema,
    AccountsListQuerySchema,
    BudgetsListQuerySchema,
    BusinessPartnerCreateSchema,
    BusinessPartnerUpdateSchema,
    ExpenseApproveSchema,
    ExpensePaymentCreateSchema,
    ExpenseRejectSchema,
    ExpenseCreateSchema,
    ExpenseListQuerySchema,
    FinanceExportQuerySchema,
    FinanceEntriesListQuerySchema,
    FinanceEntryCreateSchema,
    FinanceSummaryQuerySchema,
    InvoiceCreateSchema,
    InvoicePaymentCreateSchema,
    InvoiceTransitionSchema,
    InvoicesListQuerySchema,
    JournalsListQuerySchema,
    PartnersListQuerySchema,
    PaymentsListQuerySchema,
    PeriodsListQuerySchema,
    ProjectBudgetCreateSchema,
    RevenueCollectionCreateSchema,
    RevenueCreateSchema,
    RevenueListQuerySchema,
    TreasuryAccountCreateSchema,
    TreasuryAccountsListQuerySchema,
    TreasuryMovementsListQuerySchema,
)
from app.modules.finance.service import (
    FinanceError,
    approve_expense_record,
    approve_project_budget,
    build_accounts_query,
    build_budgets_query,
    build_expenses_query,
    build_finance_entries_query,
    build_invoices_query,
    build_journals_query,
    build_partners_query,
    build_payments_query,
    build_periods_query,
    build_revenues_query,
    build_treasury_accounts_query,
    build_treasury_movements_query,
    cash_flow_report,
    close_accounting_period,
    create_accounting_account,
    create_accounting_journal,
    create_accounting_period,
    create_business_partner,
    create_expense_record,
    create_finance_entry,
    create_invoice,
    create_project_budget,
    create_revenue_record,
    create_treasury_account,
    cancel_invoice,
    finance_dashboard_report,
    finance_export_payload,
    finance_notifications_feed,
    finance_summary,
    list_invoice_payments,
    overdue_invoices_report,
    project_profitability_report,
    reject_expense_record,
    record_expense_payment,
    record_invoice_payment,
    record_revenue_collection,
    serialize_accounting_account,
    serialize_accounting_journal,
    serialize_accounting_period,
    serialize_business_partner,
    serialize_expense_record,
    serialize_finance_entry,
    serialize_invoice,
    serialize_payment,
    serialize_project_budget,
    serialize_revenue_record,
    serialize_treasury_account,
    serialize_treasury_movement,
    send_invoice,
    tax_summary_report,
    update_accounting_account,
    update_business_partner,
)
from app.modules.finance.exporters import build_finance_export_document

finance_bp = Blueprint("finance", __name__, url_prefix="/finance")


@finance_bp.get("/status")
@jwt_required()
@require_permission("finance.read")
def finance_status():
    tenant_id = resolve_tenant_context(optional=False)
    return jsonify({"module": "finance", "status": "ready", "tenant_id": tenant_id}), 200


@finance_bp.get("/summary")
@jwt_required()
@require_permission("finance.read")
def finance_get_summary():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(finance_summary(company_id=company_id, project_id=params.get("project_id"))), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/reports/dashboard")
@jwt_required()
@require_permission("finance.read")
def finance_reports_dashboard():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(finance_dashboard_report(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/reports/project-profitability")
@jwt_required()
@require_permission("finance.read")
def finance_reports_project_profitability():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(project_profitability_report(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/reports/cash-flow")
@jwt_required()
@require_permission("finance.read")
def finance_reports_cash_flow():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(cash_flow_report(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/reports/tax-summary")
@jwt_required()
@require_permission("finance.read")
def finance_reports_tax_summary():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(tax_summary_report(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/reports/overdue-invoices")
@jwt_required()
@require_permission("finance.read")
def finance_reports_overdue_invoices():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(overdue_invoices_report(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/notifications")
@jwt_required()
@require_permission("finance.read")
def finance_notifications_list():
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify(finance_notifications_feed(company_id=company_id)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/exports")
@jwt_required()
@require_permission("finance.read")
def finance_exports():
    params = load_query(FinanceExportQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        payload = finance_export_payload(
            company_id=company_id,
            report_name=params["report"],
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
        )
        buffer, mimetype, filename = build_finance_export_document(
            report_name=params["report"],
            export_format=params["format"],
            payload=payload,
        )
        return send_file(buffer, mimetype=mimetype, as_attachment=True, download_name=filename, max_age=0)
    except (FinanceError, ValueError) as exc:
        if isinstance(exc, FinanceError):
            return error_response_from_exception(exc)
        return error_response_from_exception(FinanceError(str(exc), status_code=400))


@finance_bp.get("/entries")
@jwt_required()
@require_permission("finance.read")
@rate_limit(max_requests=100, window_seconds=60, scope="finance-entries-list")
def finance_entries_list():
    params = load_query(FinanceEntriesListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_finance_entries_query(
            company_id=company_id,
            project_id=params.get("project_id"),
            entry_type=params.get("entry_type"),
            include_archived=params["include_archived"],
        )
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_finance_entry)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/entries")
@jwt_required()
@require_permission("finance.manage")
def finance_entries_create():
    payload = load_json(FinanceEntryCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        row = create_finance_entry(company_id=company_id, recorded_by_user_id=int(get_jwt_identity()), payload=payload)
        return jsonify({"message": "Finance entry created", "entry": row}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/accounts")
@jwt_required()
@require_permission("finance.read")
def finance_accounts_list():
    params = load_query(AccountsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_accounts_query(company_id=company_id, account_class=params.get("account_class"), include_archived=params["include_archived"])
        page, page_size = get_pagination_params(default_page_size=50)
        return jsonify(paginate_query(query, page, page_size, serialize_accounting_account)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/accounts")
@jwt_required()
@require_permission("finance.manage")
def finance_accounts_create():
    payload = load_json(AccountingAccountCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Accounting account created", "account": create_accounting_account(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.patch("/accounts/<int:account_id>")
@jwt_required()
@require_permission("finance.manage")
def finance_accounts_update(account_id):
    payload = load_json(AccountingAccountUpdateSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Accounting account updated", "account": update_accounting_account(company_id, account_id, payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/journals")
@jwt_required()
@require_permission("finance.read")
def finance_journals_list():
    params = load_query(JournalsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify({"items": [serialize_accounting_journal(row) for row in build_journals_query(company_id, params.get("journal_type")).all()]}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/journals")
@jwt_required()
@require_permission("finance.manage")
def finance_journals_create():
    payload = load_json(AccountingJournalCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Journal created", "journal": create_accounting_journal(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/periods")
@jwt_required()
@require_permission("finance.read")
def finance_periods_list():
    params = load_query(PeriodsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify({"items": [serialize_accounting_period(row) for row in build_periods_query(company_id, params.get("status")).all()]}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/periods")
@jwt_required()
@require_permission("finance.manage")
def finance_periods_create():
    payload = load_json(AccountingPeriodCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Accounting period created", "period": create_accounting_period(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/periods/<int:period_id>/close")
@jwt_required()
@require_permission("finance.manage")
def finance_periods_close(period_id):
    payload = load_json(FinanceSummaryQuerySchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Accounting period closed", "period": close_accounting_period(company_id, period_id, int(get_jwt_identity()))}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/partners")
@jwt_required()
@require_permission("finance.read")
def finance_partners_list():
    params = load_query(PartnersListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_partners_query(company_id=company_id, partner_type=params.get("partner_type"), include_archived=params["include_archived"])
        page, page_size = get_pagination_params(default_page_size=50)
        return jsonify(paginate_query(query, page, page_size, serialize_business_partner)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/partners")
@jwt_required()
@require_permission("finance.manage")
def finance_partners_create():
    payload = load_json(BusinessPartnerCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Partner created", "partner": create_business_partner(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.patch("/partners/<int:partner_id>")
@jwt_required()
@require_permission("finance.manage")
def finance_partners_update(partner_id):
    payload = load_json(BusinessPartnerUpdateSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Partner updated", "partner": update_business_partner(company_id, partner_id, payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/treasury-accounts")
@jwt_required()
@require_permission("finance.read")
def finance_treasury_accounts_list():
    params = load_query(TreasuryAccountsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_treasury_accounts_query(company_id=company_id, account_type=params.get("account_type"), include_archived=params["include_archived"])
        return jsonify({"items": [serialize_treasury_account(row) for row in query.all()]}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/treasury-accounts")
@jwt_required()
@require_permission("finance.manage")
def finance_treasury_accounts_create():
    payload = load_json(TreasuryAccountCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Treasury account created", "treasury_account": create_treasury_account(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/treasury-movements")
@jwt_required()
@require_permission("finance.read")
def finance_treasury_movements_list():
    params = load_query(TreasuryMovementsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_treasury_movements_query(company_id=company_id, treasury_account_id=params.get("treasury_account_id"), direction=params.get("direction"))
        page, page_size = get_pagination_params(default_page_size=50)
        return jsonify(paginate_query(query, page, page_size, serialize_treasury_movement)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/budgets")
@jwt_required()
@require_permission("finance.read")
def finance_budgets_list():
    params = load_query(BudgetsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_budgets_query(company_id=company_id, project_id=params.get("project_id"), status=params.get("status"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_project_budget)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/budgets")
@jwt_required()
@require_permission("finance.manage")
def finance_budgets_create():
    payload = load_json(ProjectBudgetCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Budget created", "budget": create_project_budget(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/budgets/<int:budget_id>/approve")
@jwt_required()
@require_permission("finance.manage")
def finance_budgets_approve(budget_id):
    payload = load_json(FinanceSummaryQuerySchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Budget approved", "budget": approve_project_budget(company_id, budget_id, int(get_jwt_identity()))}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/expenses")
@jwt_required()
@require_permission("finance.read")
def finance_expenses_list():
    params = load_query(ExpenseListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_expenses_query(company_id=company_id, project_id=params.get("project_id"), approval_status=params.get("approval_status"), payment_status=params.get("payment_status"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_expense_record)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/expenses")
@jwt_required()
@require_permission("finance.manage")
def finance_expenses_create():
    payload = load_json(ExpenseCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Expense recorded", "expense": create_expense_record(company_id, int(get_jwt_identity()), payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/expenses/<int:expense_id>/approve")
@jwt_required()
@require_permission("finance.manage")
def finance_expenses_approve(expense_id):
    payload = load_json(ExpenseApproveSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Expense approved", "expense": approve_expense_record(company_id, expense_id, int(get_jwt_identity()), payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/expenses/<int:expense_id>/reject")
@jwt_required()
@require_permission("finance.manage")
def finance_expenses_reject(expense_id):
    payload = load_json(ExpenseRejectSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Expense rejected", "expense": reject_expense_record(company_id, expense_id, int(get_jwt_identity()), payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/expenses/<int:expense_id>/payments")
@jwt_required()
@require_permission("finance.manage")
def finance_expenses_record_payment(expense_id):
    payload = load_json(ExpensePaymentCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify(
            {
                "message": "Expense payment recorded",
                "expense": record_expense_payment(company_id, expense_id, int(get_jwt_identity()), payload),
            }
        ), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/revenues")
@jwt_required()
@require_permission("finance.read")
def finance_revenues_list():
    params = load_query(RevenueListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_revenues_query(company_id=company_id, project_id=params.get("project_id"), collection_status=params.get("collection_status"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_revenue_record)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/revenues")
@jwt_required()
@require_permission("finance.manage")
def finance_revenues_create():
    payload = load_json(RevenueCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Revenue recorded", "revenue": create_revenue_record(company_id, int(get_jwt_identity()), payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/revenues/<int:revenue_id>/payments")
@jwt_required()
@require_permission("finance.manage")
def finance_revenues_record_payment(revenue_id):
    payload = load_json(RevenueCollectionCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify(
            {
                "message": "Revenue collection recorded",
                "revenue": record_revenue_collection(company_id, revenue_id, int(get_jwt_identity()), payload),
            }
        ), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/invoices")
@jwt_required()
@require_permission("finance.read")
def finance_invoices_list():
    params = load_query(InvoicesListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_invoices_query(company_id=company_id, status=params.get("status"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_invoice)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/invoices")
@jwt_required()
@require_permission("finance.manage")
def finance_invoices_create():
    payload = load_json(InvoiceCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Invoice created", "invoice": create_invoice(company_id, payload)}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/invoices/<int:invoice_id>/payments")
@jwt_required()
@require_permission("finance.read")
def finance_invoice_payments_list(invoice_id):
    params = load_query(FinanceSummaryQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        return jsonify({"items": list_invoice_payments(company_id=company_id, invoice_id=invoice_id)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/invoices/<int:invoice_id>/send")
@jwt_required()
@require_permission("finance.manage")
def finance_invoice_send(invoice_id):
    payload = load_json(InvoiceTransitionSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Invoice sent", "invoice": send_invoice(company_id, invoice_id, int(get_jwt_identity()), payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/invoices/<int:invoice_id>/cancel")
@jwt_required()
@require_permission("finance.manage")
def finance_invoice_cancel(invoice_id):
    payload = load_json(InvoiceTransitionSchema(), partial=True)
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        return jsonify({"message": "Invoice cancelled", "invoice": cancel_invoice(company_id, invoice_id, int(get_jwt_identity()), payload)}), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.post("/invoices/<int:invoice_id>/payments")
@jwt_required()
@require_permission("finance.manage")
def finance_invoice_record_payment(invoice_id):
    payload = load_json(InvoicePaymentCreateSchema())
    try:
        company_id = resolve_company_scope(FinanceError, payload)
        row = record_invoice_payment(company_id=company_id, invoice_id=invoice_id, received_by_user_id=int(get_jwt_identity()), payload=payload)
        return jsonify({"message": "Payment recorded", "payment": row}), 201
    except FinanceError as exc:
        return error_response_from_exception(exc)


@finance_bp.get("/payments")
@jwt_required()
@require_permission("finance.read")
def finance_payments_list():
    params = load_query(PaymentsListQuerySchema())
    try:
        company_id = resolve_company_scope(FinanceError, params)
        query = build_payments_query(company_id=company_id, payment_direction=params.get("payment_direction"), status=params.get("status"))
        page, page_size = get_pagination_params(default_page_size=30)
        return jsonify(paginate_query(query, page, page_size, serialize_payment)), 200
    except FinanceError as exc:
        return error_response_from_exception(exc)
