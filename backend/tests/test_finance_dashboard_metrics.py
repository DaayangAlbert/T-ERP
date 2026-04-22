from datetime import date, timedelta

from test_v1_critical_flows import auth_headers, create_approved_company_context


def test_dashboard_exposes_consolidated_kpis_and_structured_alerts(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-DASH-001",
        company_email="contact@finance-dashboard-kpis.example.com",
        admin_email="admin@finance-dashboard-kpis.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    today = date.today()
    today_iso = today.isoformat()
    issued_on = (today - timedelta(days=10)).isoformat()
    overdue_due_on = (today - timedelta(days=2)).isoformat()
    open_due_on = (today + timedelta(days=7)).isoformat()

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": "BNQ-DASH-001",
            "name": "Compte dashboard",
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": "200000",
            "alert_threshold": "190000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account = treasury_response.get_json()["treasury_account"]
    treasury_account_id = treasury_account["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={"partner_type": "supplier", "legal_name": "Fournisseur Dashboard SARL"},
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    customer_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={"partner_type": "customer", "legal_name": "Client Dashboard SA"},
    )
    assert customer_response.status_code == 201, customer_response.get_json()
    customer_id = customer_response.get_json()["partner"]["id"]

    pending_expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "category": "services",
            "amount": "120000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": today_iso,
            "payment_method": "cash",
            "approval_status": "pending",
            "description": "Depense en attente dashboard",
        },
    )
    assert pending_expense_response.status_code == 201, pending_expense_response.get_json()

    approved_expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "70000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": today_iso,
            "payment_method": "bank_transfer",
            "approval_status": "approved",
            "description": "Depense approuvee dashboard",
        },
    )
    assert approved_expense_response.status_code == 201, approved_expense_response.get_json()

    revenue_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "partner_id": customer_id,
            "treasury_account_id": treasury_account_id,
            "revenue_type": "advance",
            "amount": "50000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": today_iso,
            "payment_method": "bank_transfer",
            "reference": "REV-DASH-001",
        },
    )
    assert revenue_response.status_code == 201, revenue_response.get_json()

    overdue_invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-DASH-OVD",
            "customer_id": customer_id,
            "issued_on": issued_on,
            "due_on": overdue_due_on,
            "status": "sent",
            "amount_total": "300000",
            "currency": "XAF",
        },
    )
    assert overdue_invoice_response.status_code == 201, overdue_invoice_response.get_json()

    open_invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-DASH-OPEN",
            "customer_id": customer_id,
            "issued_on": issued_on,
            "due_on": open_due_on,
            "status": "sent",
            "amount_total": "120000",
            "currency": "XAF",
        },
    )
    assert open_invoice_response.status_code == 201, open_invoice_response.get_json()

    dashboard_response = client.get("/api/v1/finance/reports/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()

    assert dashboard["kpis"]["cash_balance"] == 180000.0
    assert dashboard["kpis"]["revenues_today"] == 50000.0
    assert dashboard["kpis"]["expenses_today"] == 70000.0
    assert dashboard["kpis"]["payments_incoming_today"] == 50000.0
    assert dashboard["kpis"]["payments_outgoing_today"] == 70000.0
    assert dashboard["kpis"]["net_cash_flow_today"] == -20000.0
    assert dashboard["kpis"]["pending_invoices"] == 2
    assert dashboard["kpis"]["overdue_invoice_count"] == 1
    assert dashboard["kpis"]["overdue_receivables"] == 300000.0
    assert dashboard["kpis"]["outstanding_amount"] == 420000.0
    assert dashboard["kpis"]["pending_expenses"] == 1
    assert dashboard["kpis"]["pending_expenses_amount"] == 120000.0
    assert dashboard["kpis"]["treasury_accounts_in_alert"] == 1
    assert dashboard["kpis"]["treasury_accounts_count"] == 1

    alerts = dashboard["alerts"]
    assert alerts[0]["code"] == "overdue_invoice"
    assert alerts[0]["count"] == 1
    assert alerts[0]["amount"] == 300000.0

    pending_alert = next(item for item in alerts if item["code"] == "pending_expense")
    assert pending_alert["count"] == 1
    assert pending_alert["amount"] == 120000.0

    cash_alert = next(item for item in alerts if item["code"] == "cash_alert")
    assert cash_alert["treasury_account_id"] == treasury_account_id
    assert cash_alert["treasury_account_name"] == "Compte dashboard"
