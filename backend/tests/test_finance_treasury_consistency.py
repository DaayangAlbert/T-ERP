from test_v1_critical_flows import auth_headers, create_approved_company_context


def _create_treasury_account(client, headers, *, code, name, opening_balance, account_type="bank"):
    response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": code,
            "name": name,
            "account_type": account_type,
            "currency": "XAF",
            "opening_balance": str(opening_balance),
            "alert_threshold": "10000",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["treasury_account"]["id"]


def _create_supplier(client, headers, legal_name):
    response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={"partner_type": "supplier", "legal_name": legal_name},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["partner"]["id"]


def _create_customer(client, headers, legal_name):
    response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={"partner_type": "customer", "legal_name": legal_name},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["partner"]["id"]


def test_backdated_outgoing_operation_cannot_rely_on_future_incoming_balance(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-TREASURY-001",
        company_email="contact@finance-treasury-history.example.com",
        admin_email="admin@finance-treasury-history.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_account_id = _create_treasury_account(
        client,
        headers,
        code="BNQ-HIST-001",
        name="Compte historique",
        opening_balance=100000,
    )
    customer_id = _create_customer(client, headers, "Client Historique SA")
    supplier_id = _create_supplier(client, headers, "Fournisseur Historique SARL")

    revenue_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "partner_id": customer_id,
            "treasury_account_id": treasury_account_id,
            "revenue_type": "advance",
            "amount": "80000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": "2026-04-20",
            "payment_method": "bank_transfer",
            "reference": "REV-HIST-001",
        },
    )
    assert revenue_response.status_code == 201, revenue_response.get_json()

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "150000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-04-10",
            "payment_method": "bank_transfer",
            "approval_status": "approved",
            "description": "Sortie datee avant l'entree future",
        },
    )
    assert expense_response.status_code == 400, expense_response.get_json()
    assert expense_response.get_json()["message"] == "Insufficient treasury balance"


def test_running_balances_are_recomputed_after_backdated_incoming(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-TREASURY-002",
        company_email="contact@finance-treasury-running.example.com",
        admin_email="admin@finance-treasury-running.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_account_id = _create_treasury_account(
        client,
        headers,
        code="CAI-RUN-001",
        name="Caisse running",
        opening_balance=100000,
        account_type="cash",
    )
    customer_id = _create_customer(client, headers, "Client Running SA")
    supplier_id = _create_supplier(client, headers, "Fournisseur Running SARL")

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "services",
            "amount": "40000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-04-20",
            "payment_method": "cash",
            "approval_status": "approved",
            "description": "Sortie initiale",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()

    revenue_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "partner_id": customer_id,
            "treasury_account_id": treasury_account_id,
            "revenue_type": "misc_income",
            "amount": "50000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": "2026-04-10",
            "payment_method": "cash",
            "reference": "REV-RUN-001",
        },
    )
    assert revenue_response.status_code == 201, revenue_response.get_json()

    treasury_response = client.get("/api/v1/finance/treasury-accounts", headers=headers)
    assert treasury_response.status_code == 200, treasury_response.get_json()
    treasury_row = treasury_response.get_json()["items"][0]
    assert treasury_row["current_balance"] == 110000.0

    movements_response = client.get("/api/v1/finance/treasury-movements", headers=headers)
    assert movements_response.status_code == 200, movements_response.get_json()
    movements = movements_response.get_json()["items"]
    assert len(movements) == 2
    assert movements[0]["movement_date"] == "2026-04-20"
    assert movements[0]["direction"] == "outgoing"
    assert movements[0]["running_balance"] == 110000.0
    assert movements[1]["movement_date"] == "2026-04-10"
    assert movements[1]["direction"] == "incoming"
    assert movements[1]["running_balance"] == 150000.0


def test_reapproving_expense_does_not_duplicate_treasury_movements(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-TREASURY-003",
        company_email="contact@finance-treasury-no-duplicate.example.com",
        admin_email="admin@finance-treasury-no-duplicate.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    treasury_account_id = _create_treasury_account(
        client,
        headers,
        code="BNQ-DUP-001",
        name="Compte sans doublon",
        opening_balance=300000,
    )
    supplier_id = _create_supplier(client, headers, "Fournisseur Sans Doublon SARL")

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "90000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-04-22",
            "payment_method": "bank_transfer",
            "approval_status": "pending",
            "description": "Depense approuvee une seule fois",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()
    expense_id = expense_response.get_json()["expense"]["id"]

    first_approve_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/approve",
        headers=headers,
        json={},
    )
    assert first_approve_response.status_code == 200, first_approve_response.get_json()

    second_approve_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/approve",
        headers=headers,
        json={},
    )
    assert second_approve_response.status_code == 200, second_approve_response.get_json()
    assert second_approve_response.get_json()["expense"]["payment_status"] == "paid"

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 1

    movements_response = client.get("/api/v1/finance/treasury-movements", headers=headers)
    assert movements_response.status_code == 200, movements_response.get_json()
    assert len(movements_response.get_json()["items"]) == 1

    treasury_response = client.get("/api/v1/finance/treasury-accounts", headers=headers)
    assert treasury_response.status_code == 200, treasury_response.get_json()
    treasury_row = treasury_response.get_json()["items"][0]
    assert treasury_row["current_balance"] == 210000.0
