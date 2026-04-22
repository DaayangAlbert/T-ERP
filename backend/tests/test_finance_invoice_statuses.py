from test_v1_critical_flows import auth_headers, create_approved_company_context


def test_invoice_creation_rejects_paid_like_initial_statuses(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-001",
        company_email="contact@finance-invoice-status.example.com",
        admin_email="admin@finance-invoice-status.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-STATUS-001",
            "customer_name": "Client Statut Test",
            "amount_total": "250000",
            "currency": "XAF",
            "issued_on": "2026-01-10",
            "due_on": "2026-01-31",
            "status": "partially_paid",
        },
    )

    assert response.status_code == 400, response.get_json()
    assert response.get_json()["message"] == "Invoices can only be created as draft, sent or cancelled"


def test_invoice_list_exposes_effective_status_and_overdue_filter(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-002",
        company_email="contact@finance-overdue-filter.example.com",
        admin_email="admin@finance-overdue-filter.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-OVERDUE-001",
            "customer_name": "Client Retard Test",
            "amount_total": "600000",
            "currency": "XAF",
            "issued_on": "2026-01-10",
            "due_on": "2026-01-31",
            "status": "sent",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()

    all_invoices_response = client.get("/api/v1/finance/invoices", headers=headers)
    assert all_invoices_response.status_code == 200, all_invoices_response.get_json()
    all_rows = all_invoices_response.get_json()["items"]
    assert len(all_rows) == 1
    assert all_rows[0]["status"] == "sent"
    assert all_rows[0]["effective_status"] == "overdue"
    assert all_rows[0]["is_overdue"] is True

    overdue_response = client.get("/api/v1/finance/invoices?status=overdue", headers=headers)
    assert overdue_response.status_code == 200, overdue_response.get_json()
    overdue_rows = overdue_response.get_json()["items"]
    assert len(overdue_rows) == 1
    assert overdue_rows[0]["invoice_number"] == "FAC-OVERDUE-001"
    assert overdue_rows[0]["effective_status"] == "overdue"

    sent_response = client.get("/api/v1/finance/invoices?status=sent", headers=headers)
    assert sent_response.status_code == 200, sent_response.get_json()
    assert sent_response.get_json()["pagination"]["total"] == 0


def test_cancelled_invoice_cannot_accept_payment(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-003",
        company_email="contact@finance-cancelled-invoice.example.com",
        admin_email="admin@finance-cancelled-invoice.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-CANCEL-001",
            "customer_name": "Client Annule Test",
            "amount_total": "420000",
            "currency": "XAF",
            "issued_on": "2026-02-10",
            "due_on": "2026-02-28",
            "status": "cancelled",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    invoice_id = create_response.get_json()["invoice"]["id"]

    payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "100000",
            "payment_date": "2026-02-20",
            "payment_method": "cash",
            "reference": "PAY-CANCEL-001",
        },
    )

    assert payment_response.status_code == 400, payment_response.get_json()
    assert payment_response.get_json()["message"] == "Cannot record a payment on a cancelled invoice"


def test_draft_invoice_cannot_accept_payment(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-004",
        company_email="contact@finance-draft-invoice.example.com",
        admin_email="admin@finance-draft-invoice.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-DRAFT-001",
            "customer_name": "Client Brouillon Test",
            "amount_total": "300000",
            "currency": "XAF",
            "issued_on": "2026-03-10",
            "due_on": "2026-03-31",
            "status": "draft",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    invoice_id = create_response.get_json()["invoice"]["id"]

    payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "100000",
            "payment_date": "2026-03-20",
            "payment_method": "cash",
        },
    )

    assert payment_response.status_code == 400, payment_response.get_json()
    assert payment_response.get_json()["message"] == "Cannot record a payment on a draft invoice"


def test_cancelled_invoice_is_excluded_from_finance_summary(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-005",
        company_email="contact@finance-summary-cancelled.example.com",
        admin_email="admin@finance-summary-cancelled.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-CANCEL-SUM-001",
            "customer_name": "Client Annule Resume",
            "amount_total": "510000",
            "currency": "XAF",
            "issued_on": "2026-03-10",
            "due_on": "2026-03-31",
            "status": "cancelled",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()

    summary_response = client.get("/api/v1/finance/summary", headers=headers)
    assert summary_response.status_code == 200, summary_response.get_json()
    summary = summary_response.get_json()
    assert summary["totals"]["invoiced"] == 0.0
    assert summary["totals"]["collected"] == 0.0
    assert summary["totals"]["outstanding"] == 0.0
    assert summary["counts"]["invoices"] == 0


def test_invoice_payment_rejects_treasury_currency_mismatch(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-006",
        company_email="contact@finance-currency-mismatch.example.com",
        admin_email="admin@finance-currency-mismatch.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": "USD-CASH-001",
            "name": "Caisse USD",
            "account_type": "cash",
            "currency": "USD",
            "opening_balance": "1000",
            "alert_threshold": "100",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-XAF-001",
            "customer_name": "Client Devise Test",
            "amount_total": "250000",
            "currency": "XAF",
            "issued_on": "2026-03-12",
            "due_on": "2026-03-31",
            "status": "sent",
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice_id = invoice_response.get_json()["invoice"]["id"]

    payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "100000",
            "payment_date": "2026-03-20",
            "payment_method": "cash",
            "treasury_account_id": treasury_account_id,
        },
    )

    assert payment_response.status_code == 400, payment_response.get_json()
    assert payment_response.get_json()["message"] == "Treasury account currency mismatch"

    invoices_response = client.get("/api/v1/finance/invoices", headers=headers)
    assert invoices_response.status_code == 200, invoices_response.get_json()
    invoice_row = invoices_response.get_json()["items"][0]
    assert invoice_row["amount_paid"] == 0.0
    assert invoice_row["amount_due"] == 250000.0
    assert invoice_row["status"] == "sent"

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 0


def test_dashboard_overdue_receivables_excludes_draft_invoices(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-007",
        company_email="contact@finance-dashboard-overdue.example.com",
        admin_email="admin@finance-dashboard-overdue.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    draft_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-DRF-001",
            "customer_name": "Client Draft Test",
            "amount_total": "150000",
            "currency": "XAF",
            "issued_on": "2026-01-05",
            "due_on": "2026-01-20",
            "status": "draft",
        },
    )
    assert draft_response.status_code == 201, draft_response.get_json()

    sent_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-SENT-001",
            "customer_name": "Client Sent Test",
            "amount_total": "200000",
            "currency": "XAF",
            "issued_on": "2026-01-10",
            "due_on": "2099-01-31",
            "status": "sent",
        },
    )
    assert sent_response.status_code == 201, sent_response.get_json()

    overdue_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-OVD-002",
            "customer_name": "Client Overdue Test",
            "amount_total": "300000",
            "currency": "XAF",
            "issued_on": "2026-01-12",
            "due_on": "2026-01-31",
            "status": "sent",
        },
    )
    assert overdue_response.status_code == 201, overdue_response.get_json()

    overdue_report_response = client.get("/api/v1/finance/reports/overdue-invoices", headers=headers)
    assert overdue_report_response.status_code == 200, overdue_report_response.get_json()
    overdue_rows = overdue_report_response.get_json()["items"]
    assert len(overdue_rows) == 1
    assert overdue_rows[0]["invoice_number"] == "FAC-OVD-002"
    assert overdue_rows[0]["effective_status"] == "overdue"

    dashboard_response = client.get("/api/v1/finance/reports/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["kpis"]["overdue_receivables"] == 300000.0
    assert dashboard["kpis"]["pending_invoices"] == 2


def test_draft_invoice_can_be_sent_then_cancelled(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-008",
        company_email="contact@finance-send-cancel.example.com",
        admin_email="admin@finance-send-cancel.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-TRS-001",
            "customer_name": "Client Transition",
            "amount_total": "275000",
            "currency": "XAF",
            "issued_on": "2026-04-10",
            "due_on": "2026-04-30",
            "status": "draft",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    invoice_id = create_response.get_json()["invoice"]["id"]

    send_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/send",
        headers=headers,
        json={"transition_note": "Emission client"},
    )
    assert send_response.status_code == 200, send_response.get_json()
    sent_invoice = send_response.get_json()["invoice"]
    assert sent_invoice["status"] == "sent"
    assert sent_invoice["effective_status"] == "sent"

    cancel_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/cancel",
        headers=headers,
        json={"transition_note": "Emission annulee"},
    )
    assert cancel_response.status_code == 200, cancel_response.get_json()
    cancelled_invoice = cancel_response.get_json()["invoice"]
    assert cancelled_invoice["status"] == "cancelled"
    assert cancelled_invoice["effective_status"] == "cancelled"


def test_partially_paid_invoice_cannot_be_cancelled(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-009",
        company_email="contact@finance-no-cancel-after-payment.example.com",
        admin_email="admin@finance-no-cancel-after-payment.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-TRS-002",
            "customer_name": "Client Paiement Partiel",
            "amount_total": "400000",
            "currency": "XAF",
            "issued_on": "2026-04-11",
            "due_on": "2026-04-30",
            "status": "sent",
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice_id = invoice_response.get_json()["invoice"]["id"]

    payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "100000",
            "payment_date": "2026-04-15",
            "payment_method": "bank_transfer",
            "reference": "PAY-TRS-002",
        },
    )
    assert payment_response.status_code == 201, payment_response.get_json()

    cancel_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/cancel",
        headers=headers,
        json={"transition_note": "Tentative tardive"},
    )
    assert cancel_response.status_code == 400, cancel_response.get_json()
    assert cancel_response.get_json()["message"] == "Partially paid or paid invoices cannot be cancelled"


def test_invoice_partial_then_full_payment_updates_due_paid_on_and_history(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-INV-STATUS-010",
        company_email="contact@finance-payment-cycle.example.com",
        admin_email="admin@finance-payment-cycle.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": "BNQ-INV-001",
            "name": "Compte encaissement factures",
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": "50000",
            "alert_threshold": "10000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-CYCLE-001",
            "customer_name": "Client Cycle Paiement",
            "amount_total": "400000",
            "currency": "XAF",
            "issued_on": "2026-04-12",
            "due_on": "2026-04-30",
            "status": "sent",
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice_id = invoice_response.get_json()["invoice"]["id"]

    partial_payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "100000",
            "payment_date": "2026-04-15",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-CYCLE-001-A",
        },
    )
    assert partial_payment_response.status_code == 201, partial_payment_response.get_json()
    partial_payment = partial_payment_response.get_json()["payment"]
    assert partial_payment["invoice_number"] == "FAC-CYCLE-001"
    assert partial_payment["invoice_amount_total"] == 400000.0
    assert partial_payment["invoice_amount_paid"] == 100000.0
    assert partial_payment["invoice_amount_due"] == 300000.0

    invoice_rows_response = client.get("/api/v1/finance/invoices", headers=headers)
    assert invoice_rows_response.status_code == 200, invoice_rows_response.get_json()
    partial_invoice = invoice_rows_response.get_json()["items"][0]
    assert partial_invoice["status"] == "partially_paid"
    assert partial_invoice["effective_status"] == "partially_paid"
    assert partial_invoice["amount_paid"] == 100000.0
    assert partial_invoice["amount_due"] == 300000.0
    assert partial_invoice["paid_on"] is None

    final_payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "300000",
            "payment_date": "2026-04-20",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-CYCLE-001-B",
        },
    )
    assert final_payment_response.status_code == 201, final_payment_response.get_json()
    final_payment = final_payment_response.get_json()["payment"]
    assert final_payment["invoice_amount_paid"] == 400000.0
    assert final_payment["invoice_amount_due"] == 0.0

    invoice_history_response = client.get(f"/api/v1/finance/invoices/{invoice_id}/payments", headers=headers)
    assert invoice_history_response.status_code == 200, invoice_history_response.get_json()
    invoice_history = invoice_history_response.get_json()["items"]
    assert len(invoice_history) == 2
    assert invoice_history[0]["reference"] == "PAY-CYCLE-001-B"
    assert invoice_history[1]["reference"] == "PAY-CYCLE-001-A"

    paid_invoice_response = client.get("/api/v1/finance/invoices?status=paid", headers=headers)
    assert paid_invoice_response.status_code == 200, paid_invoice_response.get_json()
    assert paid_invoice_response.get_json()["pagination"]["total"] == 1
    paid_invoice = paid_invoice_response.get_json()["items"][0]
    assert paid_invoice["invoice_number"] == "FAC-CYCLE-001"
    assert paid_invoice["status"] == "paid"
    assert paid_invoice["effective_status"] == "paid"
    assert paid_invoice["amount_paid"] == 400000.0
    assert paid_invoice["amount_due"] == 0.0
    assert paid_invoice["paid_on"] == "2026-04-20"

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 2

    treasury_accounts_response = client.get("/api/v1/finance/treasury-accounts", headers=headers)
    assert treasury_accounts_response.status_code == 200, treasury_accounts_response.get_json()
    assert treasury_accounts_response.get_json()["items"][0]["current_balance"] == 450000.0
