from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_comptable_major_expense_is_forced_to_pending_approval(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-PROFILE-001",
        company_email="contact@finance-profile.example.com",
        admin_email="admin@finance-profile.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_user_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "comptable.finance@example.com",
            "password": "ComptableFinance123!",
            "first_name": "Nadia",
            "last_name": "Mvondo",
            "login_identifier": "nadia.finance",
            "user_type": "employee",
            "operational_profile_code": "comptable",
            "account_status": "active",
        },
    )
    assert create_user_response.status_code == 201, create_user_response.get_json()

    comptable_login_response = login(
        client,
        email="comptable.finance@example.com",
        password="ComptableFinance123!",
        company_id=company_id,
    )
    assert comptable_login_response.status_code == 200, comptable_login_response.get_json()
    comptable_headers = auth_headers(comptable_login_response.get_json()["access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-FIN-CPT-001",
            "name": "Chantier controle comptable",
            "status": "planned",
            "budget_amount": "2000000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=admin_headers,
        json={
            "code": "BNQ-CPT-001",
            "name": "Compte comptable principal",
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": "2500000",
            "alert_threshold": "250000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=admin_headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Materiaux BTP Test SARL",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=comptable_headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "1000000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-10",
            "payment_method": "bank_transfer",
            "document_reference": "FACT-CPT-001",
            "approval_status": "approved",
            "description": "Achat majeur saisi par un comptable",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()
    expense = expense_response.get_json()["expense"]
    assert expense["approval_status"] == "pending"
    assert expense["payment_status"] == "unpaid"
    assert expense["paid_amount"] == 0.0
    assert expense["approved_by_user_id"] is None

    payments_response = client.get("/api/v1/finance/payments", headers=comptable_headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 0


def test_company_admin_major_expense_can_stay_approved_and_generate_payment(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-PROFILE-002",
        company_email="contact@finance-admin.example.com",
        admin_email="admin@finance-admin.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)
    admin_user_id = context["company_user"]["id"]

    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-FIN-ADM-001",
            "name": "Chantier validation admin",
            "status": "planned",
            "budget_amount": "3000000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=admin_headers,
        json={
            "code": "BNQ-ADM-001",
            "name": "Compte admin principal",
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": "5000000",
            "alert_threshold": "500000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=admin_headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Fournisseur validation admin SARL",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=admin_headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "1200000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-11",
            "payment_method": "bank_transfer",
            "document_reference": "FACT-ADM-001",
            "approval_status": "approved",
            "description": "Achat majeur saisi par un admin entreprise",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()
    expense = expense_response.get_json()["expense"]
    assert expense["approval_status"] == "approved"
    assert expense["payment_status"] == "paid"
    assert expense["paid_amount"] == 1200000.0
    assert expense["approved_by_user_id"] == admin_user_id

    payments_response = client.get("/api/v1/finance/payments", headers=admin_headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 1


def test_approved_expense_cannot_overdraw_treasury_account(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-PROFILE-003",
        company_email="contact@finance-overdraw.example.com",
        admin_email="admin@finance-overdraw.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-FIN-ODR-001",
            "name": "Chantier solde critique",
            "status": "planned",
            "budget_amount": "500000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=admin_headers,
        json={
            "code": "CAISSE-ODR-001",
            "name": "Caisse critique",
            "account_type": "cash",
            "currency": "XAF",
            "opening_balance": "100000",
            "alert_threshold": "10000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=admin_headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Fournisseur fonds insuffisants SARL",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=admin_headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "150000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-15",
            "payment_method": "cash",
            "document_reference": "FACT-ODR-001",
            "approval_status": "approved",
            "description": "Depense depassant le solde disponible",
        },
    )
    assert expense_response.status_code == 400, expense_response.get_json()
    assert expense_response.get_json()["message"] == "Insufficient treasury balance"

    expenses_response = client.get("/api/v1/finance/expenses", headers=admin_headers)
    assert expenses_response.status_code == 200, expenses_response.get_json()
    assert expenses_response.get_json()["pagination"]["total"] == 0

    payments_response = client.get("/api/v1/finance/payments", headers=admin_headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 0


def test_pending_expense_can_be_rejected_and_can_no_longer_be_approved(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-PROFILE-004",
        company_email="contact@finance-reject.example.com",
        admin_email="admin@finance-reject.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-FIN-REJ-001",
            "name": "Chantier rejet depense",
            "status": "planned",
            "budget_amount": "900000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=admin_headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Fournisseur rejet finance SARL",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=admin_headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "category": "services",
            "amount": "180000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-18",
            "payment_method": "cash",
            "document_reference": "FACT-REJ-001",
            "approval_status": "pending",
            "description": "Prestation a rejeter",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()
    expense_id = expense_response.get_json()["expense"]["id"]

    reject_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/reject",
        headers=admin_headers,
        json={"decision_note": "Justificatif incomplet"},
    )
    assert reject_response.status_code == 200, reject_response.get_json()
    rejected_expense = reject_response.get_json()["expense"]
    assert rejected_expense["approval_status"] == "rejected"
    assert rejected_expense["payment_status"] == "unpaid"
    assert rejected_expense["paid_amount"] == 0.0

    approve_response = client.post(
        f"/api/v1/finance/expenses/{expense_id}/approve",
        headers=admin_headers,
        json={},
    )
    assert approve_response.status_code == 400, approve_response.get_json()
    assert approve_response.get_json()["message"] == "Rejected expenses cannot be approved"


def test_expense_cannot_be_created_directly_as_rejected(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-PROFILE-005",
        company_email="contact@finance-create-rejected.example.com",
        admin_email="admin@finance-create-rejected.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=admin_headers,
        json={
            "category": "services",
            "amount": "90000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-19",
            "payment_method": "cash",
            "approval_status": "rejected",
            "description": "Tentative de creation incoherente",
        },
    )
    assert expense_response.status_code == 400, expense_response.get_json()
    assert expense_response.get_json()["message"] == "Expenses can only be created as draft, pending or approved"
