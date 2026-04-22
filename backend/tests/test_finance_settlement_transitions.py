from test_v1_critical_flows import auth_headers, create_approved_company_context


def _create_supplier(client, headers):
    response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Fournisseur transition finance SARL",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["partner"]["id"]


def _create_customer(client, headers):
    response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "customer",
            "legal_name": "Client transition finance SARL",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["partner"]["id"]


def _create_treasury_account(client, headers, code, name, opening_balance):
    response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": code,
            "name": name,
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": str(opening_balance),
            "alert_threshold": "50000",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["treasury_account"]["id"]


def test_approved_expense_can_be_paid_in_multiple_steps(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-SETTLE-001",
        company_email="contact@finance-settle-expense.example.com",
        admin_email="admin@finance-settle-expense.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_user_id = context["company_user"]["id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_account_id = _create_treasury_account(client, headers, "BNQ-SET-001", "Compte reglements depenses", 500000)
    supplier_id = _create_supplier(client, headers)

    create_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "category": "services",
            "amount": "200000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-04-12",
            "payment_method": "bank_transfer",
            "document_reference": "EXP-SET-001",
            "approval_status": "approved",
            "description": "Depense approuvee a regler en deux fois",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    expense = create_response.get_json()["expense"]
    expense_id = expense["id"]
    assert expense["approval_status"] == "approved"
    assert expense["payment_status"] == "unpaid"
    assert expense["paid_amount"] == 0.0
    assert expense["amount_due"] == 200000.0
    assert expense["approved_by_user_id"] == admin_user_id

    partial_payment_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/payments",
        headers=headers,
        json={
            "amount": "50000",
            "payment_date": "2026-04-13",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-EXP-001-A",
        },
    )
    assert partial_payment_response.status_code == 201, partial_payment_response.get_json()
    partial_expense = partial_payment_response.get_json()["expense"]
    assert partial_expense["payment_status"] == "partial"
    assert partial_expense["paid_amount"] == 50000.0
    assert partial_expense["amount_due"] == 150000.0
    assert partial_expense["treasury_account_id"] == treasury_account_id

    final_payment_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/payments",
        headers=headers,
        json={
            "amount": "150000",
            "payment_date": "2026-04-14",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-EXP-001-B",
        },
    )
    assert final_payment_response.status_code == 201, final_payment_response.get_json()
    final_expense = final_payment_response.get_json()["expense"]
    assert final_expense["payment_status"] == "paid"
    assert final_expense["paid_amount"] == 200000.0
    assert final_expense["amount_due"] == 0.0

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 2

    treasury_response = client.get("/api/v1/finance/treasury-accounts", headers=headers)
    assert treasury_response.status_code == 200, treasury_response.get_json()
    treasury_row = treasury_response.get_json()["items"][0]
    assert treasury_row["current_balance"] == 300000.0


def test_pending_expense_cannot_be_paid(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-SETTLE-002",
        company_email="contact@finance-settle-pending.example.com",
        admin_email="admin@finance-settle-pending.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    supplier_id = _create_supplier(client, headers)

    create_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "category": "materials",
            "amount": "80000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-04-15",
            "payment_method": "cash",
            "approval_status": "pending",
            "description": "Depense encore en attente",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    expense_id = create_response.get_json()["expense"]["id"]

    payment_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/payments",
        headers=headers,
        json={
            "amount": "80000",
            "payment_date": "2026-04-16",
            "payment_method": "cash",
        },
    )
    assert payment_response.status_code == 400, payment_response.get_json()
    assert payment_response.get_json()["message"] == "Only approved expenses can be paid"


def test_uncollected_revenue_can_be_collected_in_multiple_steps(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-SETTLE-003",
        company_email="contact@finance-settle-revenue.example.com",
        admin_email="admin@finance-settle-revenue.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_account_id = _create_treasury_account(client, headers, "BNQ-SET-002", "Compte encaissements", 100000)
    customer_id = _create_customer(client, headers)

    create_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "partner_id": customer_id,
            "revenue_type": "service_invoice",
            "amount": "240000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": "2026-04-17",
            "payment_method": "bank_transfer",
            "reference": "REV-SET-001",
            "description": "Recette a encaisser en deux fois",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    revenue = create_response.get_json()["revenue"]
    revenue_id = revenue["id"]
    assert revenue["collection_status"] == "uncollected"
    assert revenue["collected_amount"] == 0.0
    assert revenue["amount_due"] == 240000.0

    partial_collection_response = client.post(
        f"/api/v1/finance/revenues/{revenue_id}/payments",
        headers=headers,
        json={
            "amount": "90000",
            "payment_date": "2026-04-18",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-REV-001-A",
        },
    )
    assert partial_collection_response.status_code == 201, partial_collection_response.get_json()
    partial_revenue = partial_collection_response.get_json()["revenue"]
    assert partial_revenue["collection_status"] == "partial"
    assert partial_revenue["collected_amount"] == 90000.0
    assert partial_revenue["amount_due"] == 150000.0
    assert partial_revenue["treasury_account_id"] == treasury_account_id

    final_collection_response = client.post(
        f"/api/v1/finance/revenues/{revenue_id}/payments",
        headers=headers,
        json={
            "amount": "150000",
            "payment_date": "2026-04-19",
            "payment_method": "bank_transfer",
            "treasury_account_id": treasury_account_id,
            "reference": "PAY-REV-001-B",
        },
    )
    assert final_collection_response.status_code == 201, final_collection_response.get_json()
    final_revenue = final_collection_response.get_json()["revenue"]
    assert final_revenue["collection_status"] == "collected"
    assert final_revenue["collected_amount"] == 240000.0
    assert final_revenue["amount_due"] == 0.0

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 2

    treasury_response = client.get("/api/v1/finance/treasury-accounts", headers=headers)
    assert treasury_response.status_code == 200, treasury_response.get_json()
    treasury_row = treasury_response.get_json()["items"][0]
    assert treasury_row["current_balance"] == 340000.0


def test_revenue_collection_cannot_exceed_balance(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-SETTLE-004",
        company_email="contact@finance-settle-overcollect.example.com",
        admin_email="admin@finance-settle-overcollect.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    customer_id = _create_customer(client, headers)

    create_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "partner_id": customer_id,
            "revenue_type": "misc_income",
            "amount": "110000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": "2026-04-20",
            "payment_method": "cash",
            "reference": "REV-SET-002",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    revenue_id = create_response.get_json()["revenue"]["id"]

    collection_response = client.post(
        f"/api/v1/finance/revenues/{revenue_id}/payments",
        headers=headers,
        json={
            "amount": "120000",
            "payment_date": "2026-04-21",
            "payment_method": "cash",
        },
    )
    assert collection_response.status_code == 400, collection_response.get_json()
    assert collection_response.get_json()["message"] == "collection exceeds revenue balance"
