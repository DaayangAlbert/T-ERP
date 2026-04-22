import csv
from io import StringIO

from app.core.operational_profiles import list_operational_access_matrix, list_operational_profile_templates


def bootstrap_super_admin(client, email="platform-admin@example.com", password="PlatformPass123!"):
    response = client.post(
        "/api/v1/auth/bootstrap-super-admin",
        json={
            "email": email,
            "password": password,
            "first_name": "Platform",
            "last_name": "Admin",
        },
    )
    assert response.status_code == 201, response.get_json()
    payload = response.get_json()
    return {
        "email": email,
        "password": password,
        "access_token": payload["access_token"],
        "refresh_token": payload["refresh_token"],
        "user": payload["user"],
    }


def register_company(
    client,
    *,
    registration_number="REG-TEST-001",
    company_email="contact@test-company.example.com",
    admin_email="admin@test-company.example.com",
    admin_password="CompanyPass123!",
):
    response = client.post(
        "/api/v1/companies/register",
        json={
            "legal_name": "Test Company SARL",
            "registration_number": registration_number,
            "email": company_email,
            "country_code": "CM",
            "admin_first_name": "Alice",
            "admin_last_name": "Builder",
            "admin_email": admin_email,
            "admin_password": admin_password,
            "currency": "XAF",
            "timezone": "Africa/Douala",
        },
    )
    assert response.status_code == 201, response.get_json()
    payload = response.get_json()["company"]
    return {
        "company_id": payload["id"],
        "admin_email": admin_email,
        "admin_password": admin_password,
        "company": payload,
    }


def login(client, *, email, password, company_id=None):
    payload = {"email": email, "password": password}
    if company_id is not None:
        payload["company_id"] = company_id

    response = client.post("/api/v1/auth/login", json=payload)
    return response


def auth_headers(access_token, tenant_id=None):
    headers = {"Authorization": f"Bearer {access_token}"}
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    return headers


def create_approved_company_context(
    client,
    *,
    registration_number="REG-TEST-APPROVED-001",
    company_email="contact@approved-company.example.com",
    admin_email="admin@approved-company.example.com",
):
    super_admin = bootstrap_super_admin(client)
    company = register_company(
        client,
        registration_number=registration_number,
        company_email=company_email,
        admin_email=admin_email,
    )

    review_response = client.patch(
        f"/api/v1/companies/{company['company_id']}/review",
        headers=auth_headers(super_admin["access_token"]),
        json={"decision": "approved"},
    )
    assert review_response.status_code == 200, review_response.get_json()

    company_login = login(
        client,
        email=company["admin_email"],
        password=company["admin_password"],
        company_id=company["company_id"],
    )
    assert company_login.status_code == 200, company_login.get_json()

    company_payload = company_login.get_json()
    return {
        "super_admin": super_admin,
        "company": company,
        "company_access_token": company_payload["access_token"],
        "company_user": company_payload["user"],
    }


def create_subscription_plan(client, access_token, *, code="starter", name="Starter", duration_days=30, price_amount="250000"):
    response = client.post(
        "/api/v1/admin/subscription-plans",
        headers=auth_headers(access_token),
        json={
            "code": code,
            "name": name,
            "description": "Plan de test",
            "duration_days": duration_days,
            "price_amount": price_amount,
            "currency": "XAF",
            "is_active": True,
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["plan"]


def test_company_registration_submits_pending_company(client):
    company = register_company(client)

    assert company["company"]["onboarding_status"] == "pending"
    assert company["company"]["is_active"] is False


def test_super_admin_can_review_pending_company(client):
    super_admin = bootstrap_super_admin(client)
    company = register_company(
        client,
        registration_number="REG-TEST-REVIEW-001",
        company_email="contact@review-company.example.com",
        admin_email="admin@review-company.example.com",
    )

    pending_response = client.get(
        "/api/v1/companies/pending",
        headers=auth_headers(super_admin["access_token"]),
    )
    assert pending_response.status_code == 200, pending_response.get_json()
    pending_ids = {row["id"] for row in pending_response.get_json()["items"]}
    assert company["company_id"] in pending_ids

    review_response = client.patch(
        f"/api/v1/companies/{company['company_id']}/review",
        headers=auth_headers(super_admin["access_token"]),
        json={"decision": "approved"},
    )
    assert review_response.status_code == 200, review_response.get_json()
    reviewed_company = review_response.get_json()["company"]
    assert reviewed_company["onboarding_status"] == "approved"
    assert reviewed_company["is_active"] is True


def test_company_admin_login_requires_company_approval(client):
    register_result = register_company(
        client,
        registration_number="REG-TEST-LOGIN-BLOCK-001",
        company_email="contact@login-block.example.com",
        admin_email="admin@login-block.example.com",
    )

    response = login(
        client,
        email=register_result["admin_email"],
        password=register_result["admin_password"],
        company_id=register_result["company_id"],
    )

    assert response.status_code == 403, response.get_json()
    payload = response.get_json()
    assert payload["code"] == "company_pending_approval"
    assert payload["message"] == "Company registration is pending approval."


def test_company_admin_can_login_after_approval(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-LOGIN-OK-001",
        company_email="contact@login-ok.example.com",
        admin_email="admin@login-ok.example.com",
    )

    me_response = client.get(
        "/api/v1/auth/me",
        headers=auth_headers(context["company_access_token"], tenant_id=context["company"]["company_id"]),
    )
    assert me_response.status_code == 200, me_response.get_json()
    me_payload = me_response.get_json()
    assert me_payload["company_id"] == context["company"]["company_id"]
    assert me_payload["user_type"] == "company_admin"
    assert me_payload["company_setup_pending"] is True
    assert me_payload["company_setup_status"] == "pending"
    assert "company_phone" in me_payload["company_setup_pending_task_codes"]


def test_company_admin_login_surfaces_info_requested_status(client):
    super_admin = bootstrap_super_admin(client, email="platform-admin-info@example.com")
    company = register_company(
        client,
        registration_number="REG-TEST-INFO-REQ-001",
        company_email="contact@info-req.example.com",
        admin_email="admin@info-req.example.com",
    )

    review_response = client.patch(
        f"/api/v1/companies/{company['company_id']}/review",
        headers=auth_headers(super_admin["access_token"]),
        json={"decision": "info_requested", "requested_information": "Merci de completer les informations de contact."},
    )
    assert review_response.status_code == 200, review_response.get_json()

    response = login(
        client,
        email=company["admin_email"],
        password=company["admin_password"],
        company_id=company["company_id"],
    )

    assert response.status_code == 403, response.get_json()
    payload = response.get_json()
    assert payload["code"] == "company_info_requested"
    assert payload["message"] == "Additional company information is required before approval."


def test_company_admin_can_create_project(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PROJECT-001",
        company_email="contact@project-company.example.com",
        admin_email="admin@project-company.example.com",
    )
    company_id = context["company"]["company_id"]

    response = client.post(
        "/api/v1/projects",
        headers=auth_headers(context["company_access_token"], tenant_id=company_id),
        json={
            "code": "PRJ-001",
            "name": "Immeuble Test",
            "status": "planned",
            "budget_amount": "25000000",
        },
    )

    assert response.status_code == 201, response.get_json()
    project = response.get_json()["project"]
    assert project["company_id"] == company_id
    assert project["code"] == "PRJ-001"
    assert project["name"] == "Immeuble Test"


def test_company_admin_can_manage_project_market_workspace(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PROJECT-MODULE-001",
        company_email="contact@project-market.example.com",
        admin_email="admin@project-market.example.com",
    )
    company_id = context["company"]["company_id"]
    user_id = context["company_user"]["id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "MCH-2026-001",
            "name": "Construction du centre de sante",
            "market_reference": "AO-2026-001",
            "project_type": "public_market",
            "status": "preparation",
            "client_name": "Commune de Test",
            "location": "Douala",
            "start_date": "2026-04-05",
            "end_date": "2026-09-30",
            "budget_amount": "95000000",
            "contract_amount": "102000000",
            "dao_number": "DAO-2026-45",
            "contracting_authority": "Mairie de Test",
            "submission_date": "2026-04-15",
            "funding_source": "BIP",
            "description": "Projet pilote BTP / marche public",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project = project_response.get_json()["project"]
    project_id = project["id"]

    assignment_response = client.post(
        f"/api/v1/projects/{project_id}/assignments",
        headers=headers,
        json={
            "user_id": user_id,
            "project_role": "chef_projet",
            "assignment_mode": "immediate",
            "start_date": "2026-04-05",
            "responsibility": "Pilotage chantier et coordination",
        },
    )
    assert assignment_response.status_code == 201, assignment_response.get_json()

    task_response = client.post(
        f"/api/v1/projects/{project_id}/tasks",
        headers=headers,
        json={
            "task_type": "phase",
            "title": "Installation du chantier",
            "responsible_user_id": user_id,
            "start_date": "2026-04-05",
            "end_date": "2026-04-12",
            "priority": "high",
            "status": "in_progress",
            "progress_percent": "40",
        },
    )
    assert task_response.status_code == 201, task_response.get_json()

    report_response = client.post(
        f"/api/v1/projects/{project_id}/reports",
        headers=headers,
        json={
            "report_date": "2026-04-06",
            "report_type": "daily",
            "summary": "Demarrage des travaux preliminaires",
            "activities_summary": "Implantation et nettoyage du site",
            "personnel_present": 12,
            "incidents": "RAS",
            "observations": "Acces chantier securise",
        },
    )
    assert report_response.status_code == 201, report_response.get_json()

    risk_response = client.post(
        f"/api/v1/projects/{project_id}/risks",
        headers=headers,
        json={
            "owner_user_id": user_id,
            "title": "Retard de livraison ciment",
            "severity": "high",
            "status": "monitoring",
            "mitigation_plan": "Securiser un fournisseur alternatif",
        },
    )
    assert risk_response.status_code == 201, risk_response.get_json()

    change_order_response = client.post(
        f"/api/v1/projects/{project_id}/change-orders",
        headers=headers,
        json={
            "reference": "AV-001",
            "title": "Avenant terrassement complementaire",
            "amount_delta": "3500000",
            "delay_delta_days": 7,
            "status": "draft",
        },
    )
    assert change_order_response.status_code == 201, change_order_response.get_json()

    document_response = client.post(
        f"/api/v1/projects/{project_id}/documents",
        headers=headers,
        json={
            "category": "decompte",
            "title": "Decompte travaux no 1",
            "file_url": "https://example.com/decompte.pdf",
            "document_date": "2026-04-01",
        },
    )
    assert document_response.status_code == 201, document_response.get_json()

    budget_response = client.post(
        f"/api/v1/projects/{project_id}/budgets",
        headers=headers,
        json={
            "version_label": "V1",
            "status": "approved",
            "total_budget": "95000000",
        },
    )
    assert budget_response.status_code == 201, budget_response.get_json()
    budget_id = budget_response.get_json()["budget"]["id"]

    budget_line_response = client.post(
        f"/api/v1/projects/budgets/{budget_id}/lines",
        headers=headers,
        json={
            "category": "gros_oeuvre",
            "label": "Fondations",
            "planned_amount": "18000000",
            "committed_amount": "5000000",
            "actual_amount": "2500000",
        },
    )
    assert budget_line_response.status_code == 201, budget_line_response.get_json()

    workspace_response = client.get(f"/api/v1/projects/{project_id}/workspace", headers=headers)
    assert workspace_response.status_code == 200, workspace_response.get_json()
    workspace = workspace_response.get_json()
    assert workspace["project"]["project_type"] == "public_market"
    assert workspace["assignments"]["count"] == 1
    assert workspace["tasks"]["count"] == 1
    assert workspace["reports"]["count"] == 1
    assert workspace["risks"]["count"] == 1
    assert workspace["change_orders"]["count"] == 1
    assert workspace["documents"]["count"] == 1
    assert workspace["budgets"]["count"] == 1
    assert workspace["alerts"] is not None

    dashboard_response = client.get("/api/v1/projects/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["counts"]["projects_total"] >= 1
    assert dashboard["counts"]["projects_in_preparation"] >= 1
    recent_documents = dashboard["recent_documents"]["items"]
    recent_titles = {item["title"] for item in recent_documents}
    recent_references = {item["reference"] for item in recent_documents}
    assert "Decompte travaux no 1" in recent_titles
    assert "Avenant terrassement complementaire" in recent_titles
    assert "Demarrage des travaux preliminaires" in recent_titles
    assert "AV-001" in recent_references


def test_stock_movement_updates_item_stock(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-STOCK-001",
        company_email="contact@stock-company.example.com",
        admin_email="admin@stock-company.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    location_response = client.post(
        "/api/v1/inventory/locations",
        headers=headers,
        json={"code": "WH-001", "name": "Main Warehouse", "location_type": "warehouse"},
    )
    assert location_response.status_code == 201, location_response.get_json()
    location_id = location_response.get_json()["location"]["id"]

    item_response = client.post(
        "/api/v1/inventory/items",
        headers=headers,
        json={"sku": "CEM-001", "name": "Ciment", "unit": "bag", "min_threshold": "10"},
    )
    assert item_response.status_code == 201, item_response.get_json()
    item_id = item_response.get_json()["item"]["id"]

    inbound_response = client.post(
        "/api/v1/inventory/movements",
        headers=headers,
        json={
            "item_id": item_id,
            "movement_type": "in",
            "to_location_id": location_id,
            "quantity": "100",
            "reference": "GRN-001",
        },
    )
    assert inbound_response.status_code == 201, inbound_response.get_json()

    outbound_response = client.post(
        "/api/v1/inventory/movements",
        headers=headers,
        json={
            "item_id": item_id,
            "movement_type": "out",
            "from_location_id": location_id,
            "quantity": "25",
            "reference": "ISS-001",
        },
    )
    assert outbound_response.status_code == 201, outbound_response.get_json()

    stock_response = client.get(
        f"/api/v1/inventory/items/{item_id}/stock?location_id={location_id}",
        headers=headers,
    )
    assert stock_response.status_code == 200, stock_response.get_json()
    stock = stock_response.get_json()
    assert stock["quantity"] == 75.0
    assert stock["below_threshold"] is False


def test_invoice_payment_flow_updates_invoice_balance(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FINANCE-001",
        company_email="contact@finance-company.example.com",
        admin_email="admin@finance-company.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "invoice_number": "FAC-001",
            "customer_name": "Client Test",
            "amount_total": "1500000",
            "currency": "XAF",
            "issued_on": "2026-01-10",
            "due_on": "2026-01-31",
            "status": "sent",
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice = invoice_response.get_json()["invoice"]
    invoice_id = invoice["id"]

    payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "500000",
            "payment_date": "2026-01-20",
            "payment_method": "transfer",
            "reference": "PAY-001",
        },
    )
    assert payment_response.status_code == 201, payment_response.get_json()

    invoices_response = client.get("/api/v1/finance/invoices", headers=headers)
    assert invoices_response.status_code == 200, invoices_response.get_json()
    invoice_rows = invoices_response.get_json()["items"]
    assert len(invoice_rows) == 1

    refreshed_invoice = invoice_rows[0]
    assert refreshed_invoice["status"] == "partially_paid"
    assert refreshed_invoice["amount_paid"] == 500000.0
    assert refreshed_invoice["amount_due"] == 1000000.0


def test_finance_reference_catalog_is_available(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-REF-001",
        company_email="contact@finance-ref.example.com",
        admin_email="admin@finance-ref.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    accounts_response = client.get("/api/v1/finance/accounts", headers=headers)
    assert accounts_response.status_code == 200, accounts_response.get_json()
    account_codes = {row["code"] for row in accounts_response.get_json()["items"]}
    assert {"1000", "4000", "5000"}.issubset(account_codes)

    journals_response = client.get("/api/v1/finance/journals", headers=headers)
    assert journals_response.status_code == 200, journals_response.get_json()
    journal_codes = {row["code"] for row in journals_response.get_json()["items"]}
    assert {"ACH", "VEN", "CAI", "BNQ", "ODV"} == journal_codes


def test_finance_operational_flow_updates_budget_treasury_and_reports(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-FIN-OPS-001",
        company_email="contact@finance-ops.example.com",
        admin_email="admin@finance-ops.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "FIN-PRJ-001",
            "name": "Chantier Finance",
            "status": "planned",
            "budget_amount": "800000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": "CAISSE-001",
            "name": "Caisse principale",
            "account_type": "cash",
            "currency": "XAF",
            "opening_balance": "1000000",
            "alert_threshold": "200000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account = treasury_response.get_json()["treasury_account"]
    treasury_account_id = treasury_account["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Fournisseur Materiaux SARL",
            "phone": "+237600000010",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    customer_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "customer",
            "legal_name": "Client Chantier SA",
            "phone": "+237600000011",
        },
    )
    assert customer_response.status_code == 201, customer_response.get_json()
    customer_id = customer_response.get_json()["partner"]["id"]

    budget_response = client.post(
        "/api/v1/finance/budgets",
        headers=headers,
        json={
            "project_id": project_id,
            "version_label": "Initial",
            "lines": [
                {
                    "category": "materials",
                    "label": "Achat materiaux",
                    "planned_amount": "600000",
                }
            ],
        },
    )
    assert budget_response.status_code == 201, budget_response.get_json()
    budget_id = budget_response.get_json()["budget"]["id"]

    approve_budget_response = client.post(
        f"/api/v1/finance/budgets/{budget_id}/approve",
        headers=headers,
        json={},
    )
    assert approve_budget_response.status_code == 200, approve_budget_response.get_json()
    approved_budget = approve_budget_response.get_json()["budget"]
    assert approved_budget["status"] == "approved"
    assert approved_budget["total_budget"] == 600000.0

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "250000",
            "tax_rate": "20",
            "currency": "XAF",
            "expense_date": "2026-02-10",
            "payment_method": "cash",
            "document_reference": "FAC-MAT-001",
            "approval_status": "pending",
            "description": "Achat ciment et acier",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()
    expense = expense_response.get_json()["expense"]
    assert expense["approval_status"] == "pending"
    assert expense["payment_status"] == "unpaid"

    approve_expense_response = client.post(
        f"/api/v1/finance/expenses/{expense['id']}/approve",
        headers=headers,
        json={},
    )
    assert approve_expense_response.status_code == 200, approve_expense_response.get_json()
    approved_expense = approve_expense_response.get_json()["expense"]
    assert approved_expense["approval_status"] == "approved"
    assert approved_expense["payment_status"] == "paid"
    assert approved_expense["paid_amount"] == 250000.0
    assert approved_expense["tax_rate"] == 20.0
    assert approved_expense["tax_amount"] == 41666.67

    revenue_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "project_id": project_id,
            "partner_id": customer_id,
            "treasury_account_id": treasury_account_id,
            "revenue_type": "advance",
            "amount": "400000",
            "tax_rate": "20",
            "currency": "XAF",
            "revenue_date": "2026-02-12",
            "payment_method": "cash",
            "reference": "ADV-CLI-001",
            "description": "Avance de demarrage",
        },
    )
    assert revenue_response.status_code == 201, revenue_response.get_json()
    revenue = revenue_response.get_json()["revenue"]
    assert revenue["collection_status"] == "collected"
    assert revenue["collected_amount"] == 400000.0
    assert revenue["tax_rate"] == 20.0
    assert revenue["tax_amount"] == 66666.67

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "project_id": project_id,
            "customer_id": customer_id,
            "issued_on": "2026-02-15",
            "due_on": "2026-03-01",
            "status": "sent",
            "tax_rate": "20",
            "lines": [
                {
                    "description": "Situation de travaux - lot 1",
                    "quantity": "1",
                    "unit_price": "500000",
                }
            ],
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice = invoice_response.get_json()["invoice"]
    assert invoice["invoice_number"].startswith("FAC-2026-")
    assert invoice["subtotal_amount"] == 500000.0
    assert invoice["tax_amount"] == 100000.0
    assert invoice["amount_total"] == 600000.0
    assert invoice["customer_name"] == "Client Chantier SA"

    dashboard_response = client.get("/api/v1/finance/reports/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["kpis"]["expenses"] == 250000.0
    assert dashboard["kpis"]["revenue"] == 400000.0
    assert dashboard["kpis"]["cash_balance"] == 1150000.0
    assert dashboard["kpis"]["overdue_receivables"] == 600000.0

    profitability_response = client.get("/api/v1/finance/reports/project-profitability", headers=headers)
    assert profitability_response.status_code == 200, profitability_response.get_json()
    profitability = profitability_response.get_json()["items"]
    assert len(profitability) == 1
    assert profitability[0]["project_id"] == project_id
    assert profitability[0]["expenses"] == 250000.0
    assert profitability[0]["revenues"] == 400000.0
    assert profitability[0]["margin"] == 150000.0

    budgets_response = client.get("/api/v1/finance/budgets", headers=headers)
    assert budgets_response.status_code == 200, budgets_response.get_json()
    budget_row = budgets_response.get_json()["items"][0]
    assert budget_row["actual_expenses"] == 250000.0
    assert budget_row["variance"] == 350000.0

    payments_response = client.get("/api/v1/finance/payments", headers=headers)
    assert payments_response.status_code == 200, payments_response.get_json()
    assert payments_response.get_json()["pagination"]["total"] == 2

    treasury_movements_response = client.get("/api/v1/finance/treasury-movements", headers=headers)
    assert treasury_movements_response.status_code == 200, treasury_movements_response.get_json()
    movements = treasury_movements_response.get_json()["items"]
    assert len(movements) == 2
    assert {row["direction"] for row in movements} == {"incoming", "outgoing"}

    overdue_response = client.get("/api/v1/finance/reports/overdue-invoices", headers=headers)
    assert overdue_response.status_code == 200, overdue_response.get_json()
    overdue_items = overdue_response.get_json()["items"]
    assert len(overdue_items) == 1
    assert overdue_items[0]["invoice_number"] == invoice["invoice_number"]

    tax_summary_response = client.get("/api/v1/finance/reports/tax-summary", headers=headers)
    assert tax_summary_response.status_code == 200, tax_summary_response.get_json()
    tax_summary = tax_summary_response.get_json()
    assert tax_summary["summary"]["input_vat_deductible"] == 41666.67
    assert tax_summary["summary"]["output_vat_invoiced"] == 100000.0
    assert tax_summary["summary"]["output_vat_collected"] == 66666.67
    assert tax_summary["summary"]["net_vat_payable"] == 58333.33
    assert tax_summary["summary"]["cash_vat_position"] == 25000.0

    notifications_response = client.get("/api/v1/finance/notifications", headers=headers)
    assert notifications_response.status_code == 200, notifications_response.get_json()
    notifications = notifications_response.get_json()["items"]
    notification_codes = {row["code"] for row in notifications}
    assert {"payment_received", "overdue_invoice", "vat_due"}.issubset(notification_codes)

    export_pdf_response = client.get("/api/v1/finance/exports?report=tax_summary&format=pdf", headers=headers)
    assert export_pdf_response.status_code == 200
    assert export_pdf_response.mimetype == "application/pdf"
    assert export_pdf_response.data.startswith(b"%PDF")

    export_xlsx_response = client.get("/api/v1/finance/exports?report=dashboard&format=xlsx", headers=headers)
    assert export_xlsx_response.status_code == 200
    assert export_xlsx_response.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert export_xlsx_response.data[:2] == b"PK"

    invoice_payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice['id']}/payments",
        headers=headers,
        json={
            "amount": "300000",
            "payment_date": "2026-03-20",
            "payment_method": "cash",
            "treasury_account_id": treasury_account_id,
            "reference": "REG-FAC-001",
        },
    )
    assert invoice_payment_response.status_code == 201, invoice_payment_response.get_json()

    accounting_csv_response = client.get(
        "/api/v1/finance/exports?report=accounting_journal&format=csv&date_from=2026-02-01&date_to=2026-02-28",
        headers=headers,
    )
    assert accounting_csv_response.status_code == 200
    assert accounting_csv_response.mimetype == "text/csv"
    accounting_csv_text = accounting_csv_response.data.decode("utf-8-sig")
    normalized_accounting_csv_text = accounting_csv_text.replace("\r\n", "\n")
    assert "Journal lines" in accounting_csv_text
    assert "FAC-2026-" in accounting_csv_text
    assert "TVA collectee" in accounting_csv_text
    assert "TVA deductible" in accounting_csv_text
    assert "REG-FAC-001" not in accounting_csv_text

    journal_lines_block = normalized_accounting_csv_text.split("Journal lines\n", 1)[1].split("\n\nSummary\n", 1)[0]
    journal_rows = list(csv.DictReader(StringIO(journal_lines_block)))
    assert journal_rows
    assert any(row["Journal"] == "ACH" for row in journal_rows)
    assert any(row["Journal"] == "VEN" for row in journal_rows)
    assert any(row["Account"] == "1200" and row["Debit"] == "600000.00" for row in journal_rows)
    assert any(row["Account"] == "6020" and row["Credit"] == "100000.00" for row in journal_rows)
    total_debit = sum(float(row["Debit"] or 0) for row in journal_rows)
    total_credit = sum(float(row["Credit"] or 0) for row in journal_rows)
    assert round(total_debit, 2) == round(total_credit, 2)

    accounting_xlsx_response = client.get(
        "/api/v1/finance/exports?report=accounting_journal&format=xlsx",
        headers=headers,
    )
    assert accounting_xlsx_response.status_code == 200
    assert accounting_xlsx_response.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert accounting_xlsx_response.data[:2] == b"PK"


def test_project_dashboard_uses_modern_finance_records(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PROJECT-FIN-001",
        company_email="contact@project-finance.example.com",
        admin_email="admin@project-finance.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "PRJ-FIN-001",
            "name": "Base logistique moderne",
            "status": "in_progress",
            "budget_amount": "800000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    treasury_response = client.post(
        "/api/v1/finance/treasury-accounts",
        headers=headers,
        json={
            "code": "BNQ-PRJ-001",
            "name": "Compte projet principal",
            "account_type": "bank",
            "currency": "XAF",
            "opening_balance": "500000",
            "alert_threshold": "100000",
        },
    )
    assert treasury_response.status_code == 201, treasury_response.get_json()
    treasury_account_id = treasury_response.get_json()["treasury_account"]["id"]

    supplier_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "supplier",
            "legal_name": "Beton Expert SARL",
        },
    )
    assert supplier_response.status_code == 201, supplier_response.get_json()
    supplier_id = supplier_response.get_json()["partner"]["id"]

    customer_response = client.post(
        "/api/v1/finance/partners",
        headers=headers,
        json={
            "partner_type": "customer",
            "legal_name": "Client Infrastructure SA",
        },
    )
    assert customer_response.status_code == 201, customer_response.get_json()
    customer_id = customer_response.get_json()["partner"]["id"]

    budget_response = client.post(
        "/api/v1/finance/budgets",
        headers=headers,
        json={
            "project_id": project_id,
            "version_label": "Initial",
            "lines": [
                {
                    "category": "gros_oeuvre",
                    "label": "Fondations et dalle",
                    "planned_amount": "600000",
                }
            ],
        },
    )
    assert budget_response.status_code == 201, budget_response.get_json()
    budget_id = budget_response.get_json()["budget"]["id"]

    approve_budget_response = client.post(
        f"/api/v1/finance/budgets/{budget_id}/approve",
        headers=headers,
        json={},
    )
    assert approve_budget_response.status_code == 200, approve_budget_response.get_json()

    expense_response = client.post(
        "/api/v1/finance/expenses",
        headers=headers,
        json={
            "project_id": project_id,
            "partner_id": supplier_id,
            "treasury_account_id": treasury_account_id,
            "category": "materials",
            "amount": "250000",
            "tax_rate": "0",
            "currency": "XAF",
            "expense_date": "2026-02-10",
            "payment_method": "bank_transfer",
            "document_reference": "FACT-EXP-001",
            "approval_status": "approved",
            "description": "Approvisionnement beton et acier",
        },
    )
    assert expense_response.status_code == 201, expense_response.get_json()

    revenue_response = client.post(
        "/api/v1/finance/revenues",
        headers=headers,
        json={
            "project_id": project_id,
            "partner_id": customer_id,
            "treasury_account_id": treasury_account_id,
            "revenue_type": "situation_travaux",
            "amount": "400000",
            "tax_rate": "0",
            "currency": "XAF",
            "revenue_date": "2026-02-12",
            "payment_method": "bank_transfer",
            "reference": "REV-PRJ-001",
            "description": "Situation de travaux fevrier",
        },
    )
    assert revenue_response.status_code == 201, revenue_response.get_json()

    invoice_response = client.post(
        "/api/v1/finance/invoices",
        headers=headers,
        json={
            "project_id": project_id,
            "customer_id": customer_id,
            "invoice_number": "FAC-PRJ-FIN-001",
            "issued_on": "2026-02-15",
            "due_on": "2026-03-01",
            "status": "sent",
            "tax_rate": "0",
            "lines": [
                {
                    "description": "Situation de travaux lot A",
                    "quantity": "1",
                    "unit_price": "600000",
                }
            ],
        },
    )
    assert invoice_response.status_code == 201, invoice_response.get_json()
    invoice_id = invoice_response.get_json()["invoice"]["id"]

    invoice_payment_response = client.post(
        f"/api/v1/finance/invoices/{invoice_id}/payments",
        headers=headers,
        json={
            "amount": "300000",
            "payment_date": "2026-02-20",
            "payment_method": "bank_transfer",
            "reference": "PAY-PRJ-001",
            "treasury_account_id": treasury_account_id,
        },
    )
    assert invoice_payment_response.status_code == 201, invoice_payment_response.get_json()

    document_response = client.post(
        f"/api/v1/projects/{project_id}/documents",
        headers=headers,
        json={
            "category": "pv",
            "title": "PV reception provisoire",
            "file_url": "https://example.test/pv-reception.pdf",
            "document_date": "2026-02-21",
        },
    )
    assert document_response.status_code == 201, document_response.get_json()

    change_order_response = client.post(
        f"/api/v1/projects/{project_id}/change-orders",
        headers=headers,
        json={
            "reference": "AV-PRJ-001",
            "title": "Avenant fondations",
            "status": "submitted",
            "amount_delta": "50000",
            "delay_delta_days": 5,
            "effective_date": "2026-02-22",
        },
    )
    assert change_order_response.status_code == 201, change_order_response.get_json()

    dashboard_response = client.get("/api/v1/projects/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["financials"]["expenses_total"] == 250000.0
    assert dashboard["financials"]["revenues_total"] == 400000.0
    assert dashboard["financials"]["margin_total"] == 150000.0
    item = next(row for row in dashboard["items"] if row["id"] == project_id)
    assert item["expenses"] == 250000.0
    assert item["revenues"] == 400000.0
    profitability_item = next(row for row in dashboard["cockpit"]["profitability"]["items"] if row["project_id"] == project_id)
    assert profitability_item["initial_budget"] == 800000.0
    assert profitability_item["actual_cost"] == 250000.0
    assert profitability_item["final_margin"] == 150000.0
    assert dashboard["cockpit"]["budget_progress_alerts"]["items"][0]["project_id"] == project_id
    validation_titles = {row["title"] for row in dashboard["cockpit"]["validation_queue"]["items"]}
    assert "PV reception provisoire" in validation_titles
    assert "Avenant fondations" in validation_titles

    workspace_response = client.get(f"/api/v1/projects/{project_id}/workspace", headers=headers)
    assert workspace_response.status_code == 200, workspace_response.get_json()
    workspace = workspace_response.get_json()
    assert workspace["finance"]["budget_amount"] == 600000.0
    assert workspace["finance"]["expenses"] == 250000.0
    assert workspace["finance"]["revenues"] == 400000.0
    assert workspace["finance"]["margin"] == 150000.0
    assert workspace["finance"]["invoiced"] == 600000.0
    assert workspace["finance"]["collected"] == 300000.0
    assert workspace["finance"]["outstanding"] == 300000.0


def test_super_admin_can_create_company_with_subscription_plan(client):
    super_admin = bootstrap_super_admin(client, email="platform-admin-create@example.com")
    plan = create_subscription_plan(
        client,
        super_admin["access_token"],
        code="pro-btp",
        name="Pro BTP",
        duration_days=90,
        price_amount="750000",
    )

    response = client.post(
        "/api/v1/admin/companies",
        headers=auth_headers(super_admin["access_token"]),
        json={
            "legal_name": "Batimax SARL",
            "trade_name": "Batimax",
            "acronym": "BTX",
            "registration_number": "REG-BATIMAX-001",
            "tax_number": "NIU-BATIMAX-001",
            "email": "contact@batimax.example.com",
            "phone": "+237600000001",
            "country_code": "CM",
            "country_name": "Cameroun",
            "city": "Douala",
            "address_line": "Bonanjo, Douala",
            "activity_domain": "BTP et marches publics",
            "admin_first_name": "Marie",
            "admin_last_name": "Ngono",
            "admin_email": "admin@batimax.example.com",
            "admin_password": "BatimaxPass123!",
            "admin_login_identifier": "batimax-admin",
            "subscription_plan_id": plan["id"],
            "subscription_status": "pending",
            "subscription_validation_status": "pending",
            "initial_review_decision": "approved",
            "currency": "XAF",
            "timezone": "Africa/Douala",
        },
    )

    assert response.status_code == 201, response.get_json()
    company = response.get_json()["company"]
    assert company["onboarding_status"] == "approved"
    assert company["account_status"] == "active"
    assert company["subscription_status"] == "active"
    assert company["current_subscription"]["plan"]["code"] == "pro-btp"
    assert company["primary_admin"]["is_primary_admin"] is True

    login_response = login(
        client,
        email="admin@batimax.example.com",
        password="BatimaxPass123!",
        company_id=company["id"],
    )
    assert login_response.status_code == 200, login_response.get_json()


def test_company_admin_can_manage_personnel_and_force_logout(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-HR-001",
        company_email="contact@hr-company.example.com",
        admin_email="admin@hr-company.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "employee@hr-company.example.com",
            "password": "EmployeePass123!",
            "first_name": "Paul",
            "last_name": "Essama",
            "login_identifier": "paul.essama",
            "user_type": "employee",
            "job_title": "Comptable",
            "department": "Finance",
            "employee_number": "EMP-001",
            "account_status": "active",
            "must_change_password": True,
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    created_user = create_response.get_json()["user"]

    employee_login = login(
        client,
        email="paul.essama",
        password="EmployeePass123!",
        company_id=company_id,
    )
    assert employee_login.status_code == 200, employee_login.get_json()
    employee_access_token = employee_login.get_json()["access_token"]

    reset_response = client.post(
        f"/api/v1/users/{created_user['id']}/reset-password",
        headers=headers,
        json={"new_password": "EmployeePass456!", "must_change_password": False},
    )
    assert reset_response.status_code == 200, reset_response.get_json()
    assert reset_response.get_json()["user"]["must_change_password"] is False

    force_logout_response = client.post(
        f"/api/v1/users/{created_user['id']}/force-logout",
        headers=headers,
        json={},
    )
    assert force_logout_response.status_code == 200, force_logout_response.get_json()

    revoked_me = client.get(
        "/api/v1/auth/me",
        headers=auth_headers(employee_access_token, tenant_id=company_id),
    )
    assert revoked_me.status_code == 401, revoked_me.get_json()
    assert revoked_me.get_json()["code"] == "token_revoked"

    dashboard_response = client.get("/api/v1/users/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["users"]["total"] >= 2

    activity_logs_response = client.get("/api/v1/users/activity-logs", headers=headers)
    assert activity_logs_response.status_code == 200, activity_logs_response.get_json()
    assert activity_logs_response.get_json()["count"] >= 3


def test_company_tokens_are_revoked_if_company_is_suspended(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-SUSPEND-001",
        company_email="contact@suspend-company.example.com",
        admin_email="admin@suspend-company.example.com",
    )
    company_id = context["company"]["company_id"]

    me_before = client.get(
        "/api/v1/auth/me",
        headers=auth_headers(context["company_access_token"], tenant_id=company_id),
    )
    assert me_before.status_code == 200, me_before.get_json()

    suspend_response = client.patch(
        f"/api/v1/admin/companies/{company_id}/status",
        headers=auth_headers(context["super_admin"]["access_token"]),
        json={"account_status": "suspended"},
    )
    assert suspend_response.status_code == 200, suspend_response.get_json()

    me_after = client.get(
        "/api/v1/auth/me",
        headers=auth_headers(context["company_access_token"], tenant_id=company_id),
    )
    assert me_after.status_code == 401, me_after.get_json()
    assert me_after.get_json()["code"] == "token_revoked"


def test_super_admin_can_delete_empty_company(client):
    super_admin = bootstrap_super_admin(client, email="platform-admin-delete@example.com")
    company = register_company(
        client,
        registration_number="REG-TEST-DELETE-001",
        company_email="contact@delete-company.example.com",
        admin_email="admin@delete-company.example.com",
    )

    delete_response = client.delete(
        f"/api/v1/admin/companies/{company['company_id']}",
        headers=auth_headers(super_admin["access_token"]),
    )
    assert delete_response.status_code == 200, delete_response.get_json()
    assert delete_response.get_json()["data"]["deleted"] is True

    login_response = login(
        client,
        email=company["admin_email"],
        password=company["admin_password"],
        company_id=company["company_id"],
    )
    assert login_response.status_code == 401, login_response.get_json()


def test_company_admin_can_consult_operational_profiles_and_create_user_from_profile(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-OPS-001",
        company_email="contact@ops-company.example.com",
        admin_email="admin@ops-company.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    catalog_response = client.get("/api/v1/users/operational-profiles", headers=headers)
    assert catalog_response.status_code == 200, catalog_response.get_json()
    catalog = catalog_response.get_json()
    expected_profiles = list_operational_profile_templates()
    assert catalog["count"] == len(expected_profiles)
    assert len(catalog["access_matrix"]) == len(list_operational_access_matrix())
    assert len(catalog["interactions"]) >= 8

    profiles_by_code = {row["code"]: row for row in catalog["items"]}
    assert {
        "directeur_general",
        "directeur_technique",
        "daf",
        "responsable_logistique",
        "assistant_administratif",
        "juriste",
        "controleur_externe",
        "candidat_job_seeker",
    }.issubset(profiles_by_code.keys())
    assert "pca" not in profiles_by_code
    assert "logisticien" not in profiles_by_code
    assert "chef_chantier" not in profiles_by_code
    comptable_profile = profiles_by_code["comptable"]
    assert comptable_profile["default_role_ids"]
    assert {role["code"] for role in comptable_profile["linked_roles"]} == {"comptable"}
    assert comptable_profile["default_organization_unit"]["code"] == "SRV-COMPTA"

    create_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "comptable@ops-company.example.com",
            "password": "ComptablePass123!",
            "first_name": "Nadia",
            "last_name": "Mvondo",
            "login_identifier": "nadia.mvondo",
            "user_type": "employee",
            "operational_profile_code": "comptable",
            "account_status": "active",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    created_user = create_response.get_json()["user"]
    assert created_user["job_title"] == "Comptable"
    assert created_user["department"] == "Finance et comptabilite"
    assert created_user["hierarchy_level"] == 3
    assert created_user["organization_unit"]["code"] == "SRV-COMPTA"
    assert {role["code"] for role in created_user["roles"]} == {"comptable"}

    comptable_login_response = login(
        client,
        email="comptable@ops-company.example.com",
        password="ComptablePass123!",
        company_id=company_id,
    )
    assert comptable_login_response.status_code == 200, comptable_login_response.get_json()
    comptable_access_token = comptable_login_response.get_json()["access_token"]

    me_response = client.get(
        "/api/v1/auth/me",
        headers=auth_headers(comptable_access_token, tenant_id=company_id),
    )
    assert me_response.status_code == 200, me_response.get_json()
    me_payload = me_response.get_json()
    assert me_payload["operational_profile_code"] == "comptable"
    assert me_payload["organization_unit"]["code"] == "SRV-COMPTA"


def test_inventory_operations_support_pending_validation_and_project_allocation(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-STOCK-OPS-001",
        company_email="contact@stock-ops.example.com",
        admin_email="admin@stock-ops.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    project_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "PRJ-STK-001",
            "name": "Chantier Stock",
            "status": "planned",
            "budget_amount": "35000000",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project_id = project_response.get_json()["project"]["id"]

    warehouse_response = client.post(
        "/api/v1/inventory/locations",
        headers=headers,
        json={"code": "WH-STK", "name": "Depot principal", "location_type": "warehouse"},
    )
    assert warehouse_response.status_code == 201, warehouse_response.get_json()
    warehouse_id = warehouse_response.get_json()["location"]["id"]

    site_response = client.post(
        "/api/v1/inventory/locations",
        headers=headers,
        json={
            "code": "SITE-001",
            "name": "Stock chantier",
            "location_type": "site",
            "project_id": project_id,
        },
    )
    assert site_response.status_code == 201, site_response.get_json()
    site_id = site_response.get_json()["location"]["id"]

    item_response = client.post(
        "/api/v1/inventory/items",
        headers=headers,
        json={
            "sku": "FER-001",
            "name": "Fer a beton",
            "unit": "tonne",
            "category": "material",
            "min_threshold": "20",
            "average_unit_cost": "550000",
            "preferred_supplier": "Acier Cameroun",
            "barcode": "FER-001-CM",
        },
    )
    assert item_response.status_code == 201, item_response.get_json()
    item_id = item_response.get_json()["item"]["id"]

    receipt_response = client.post(
        "/api/v1/inventory/operations",
        headers=headers,
        json={
            "operation_kind": "entry",
            "entry_type": "supplier_purchase",
            "operation_date": "2026-03-25",
            "destination_location_id": warehouse_id,
            "supplier_name": "Acier Cameroun",
            "delivery_note_number": "BL-2026-001",
            "invoice_reference": "FAC-2026-001",
            "validate_now": True,
            "lines": [
                {
                    "item_id": item_id,
                    "quantity": "120",
                    "unit_price": "550000",
                }
            ],
        },
    )
    assert receipt_response.status_code == 201, receipt_response.get_json()
    assert receipt_response.get_json()["operation"]["status"] == "validated"

    pending_issue_response = client.post(
        "/api/v1/inventory/operations",
        headers=headers,
        json={
            "operation_kind": "exit",
            "exit_type": "project_assignment",
            "operation_date": "2026-03-26",
            "source_location_id": warehouse_id,
            "destination_location_id": site_id,
            "project_id": project_id,
            "reference": "SORT-PRJ-001",
            "lines": [
                {
                    "item_id": item_id,
                    "quantity": "30",
                }
            ],
        },
    )
    assert pending_issue_response.status_code == 201, pending_issue_response.get_json()
    operation = pending_issue_response.get_json()["operation"]
    assert operation["status"] == "pending"

    stock_before_validation = client.get(
        f"/api/v1/inventory/items/{item_id}/stock?location_id={warehouse_id}",
        headers=headers,
    )
    assert stock_before_validation.status_code == 200, stock_before_validation.get_json()
    warehouse_stock_before = stock_before_validation.get_json()
    assert warehouse_stock_before["quantity"] == 120.0
    assert warehouse_stock_before["reserved_quantity"] == 30.0
    assert warehouse_stock_before["available_quantity"] == 90.0

    support_response = client.get("/api/v1/inventory/support-data", headers=headers)
    assert support_response.status_code == 200, support_response.get_json()
    support_data = support_response.get_json()
    assert any(location["id"] == site_id for location in support_data["locations"])
    assert "project_assignment" in support_data["enums"]["exit_types"]

    validate_response = client.post(
        f"/api/v1/inventory/operations/{operation['id']}/validate",
        headers=headers,
        json={},
    )
    assert validate_response.status_code == 200, validate_response.get_json()
    assert validate_response.get_json()["operation"]["status"] == "validated"

    warehouse_stock_after_response = client.get(
        f"/api/v1/inventory/items/{item_id}/stock?location_id={warehouse_id}",
        headers=headers,
    )
    assert warehouse_stock_after_response.status_code == 200, warehouse_stock_after_response.get_json()
    warehouse_stock_after = warehouse_stock_after_response.get_json()
    assert warehouse_stock_after["quantity"] == 90.0
    assert warehouse_stock_after["reserved_quantity"] == 0.0

    site_stock_response = client.get(
        f"/api/v1/inventory/items/{item_id}/stock?location_id={site_id}",
        headers=headers,
    )
    assert site_stock_response.status_code == 200, site_stock_response.get_json()
    assert site_stock_response.get_json()["quantity"] == 30.0

    allocations_response = client.get(
        f"/api/v1/inventory/allocations?project_id={project_id}",
        headers=headers,
    )
    assert allocations_response.status_code == 200, allocations_response.get_json()
    allocations = allocations_response.get_json()["items"]
    assert len(allocations) == 1
    assert allocations[0]["quantity_allocated"] == 30.0

    dashboard_response = client.get("/api/v1/inventory/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["summary"]["pending_validations"] == 0
    assert dashboard["summary"]["tracked_items"] == 1


def test_inventory_session_validation_adjusts_stock_and_logs_activity(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-STOCK-INV-001",
        company_email="contact@stock-inventory.example.com",
        admin_email="admin@stock-inventory.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    location_response = client.post(
        "/api/v1/inventory/locations",
        headers=headers,
        json={"code": "INV-001", "name": "Magasin inventaire", "location_type": "main_warehouse"},
    )
    assert location_response.status_code == 201, location_response.get_json()
    location_id = location_response.get_json()["location"]["id"]

    item_response = client.post(
        "/api/v1/inventory/items",
        headers=headers,
        json={
            "sku": "CIM-001",
            "name": "Ciment",
            "unit": "sac",
            "category": "material",
            "min_threshold": "10",
            "average_unit_cost": "6500",
            "max_threshold": "100",
        },
    )
    assert item_response.status_code == 201, item_response.get_json()
    item_id = item_response.get_json()["item"]["id"]

    inbound_response = client.post(
        "/api/v1/inventory/movements",
        headers=headers,
        json={
            "item_id": item_id,
            "movement_type": "in",
            "to_location_id": location_id,
            "quantity": "50",
            "reference": "IN-INV-001",
        },
    )
    assert inbound_response.status_code == 201, inbound_response.get_json()

    inventory_response = client.post(
        "/api/v1/inventory/inventories",
        headers=headers,
        json={
            "location_id": location_id,
            "inventory_type": "cycle",
            "inventory_date": "2026-03-27",
            "reference": "INV-CYCLE-001",
            "lines": [
                {
                    "item_id": item_id,
                    "counted_quantity": "44",
                    "observation": "6 sacs endommages",
                }
            ],
        },
    )
    assert inventory_response.status_code == 201, inventory_response.get_json()
    inventory = inventory_response.get_json()["inventory"]
    assert inventory["status"] == "draft"
    assert inventory["lines"][0]["difference_quantity"] == -6.0

    validate_response = client.post(
        f"/api/v1/inventory/inventories/{inventory['id']}/validate",
        headers=headers,
        json={},
    )
    assert validate_response.status_code == 200, validate_response.get_json()
    assert validate_response.get_json()["inventory"]["status"] == "validated"

    stock_response = client.get(
        f"/api/v1/inventory/items/{item_id}/stock?location_id={location_id}",
        headers=headers,
    )
    assert stock_response.status_code == 200, stock_response.get_json()
    stock = stock_response.get_json()
    assert stock["quantity"] == 44.0

    reports_response = client.get("/api/v1/inventory/reports/summary", headers=headers)
    assert reports_response.status_code == 200, reports_response.get_json()
    report = reports_response.get_json()
    assert report["inventories"][0]["id"] == inventory["id"]

    activity_response = client.get("/api/v1/inventory/activity", headers=headers)
    assert activity_response.status_code == 200, activity_response.get_json()
    activity_items = activity_response.get_json()["items"]
    assert any(entry["action"] == "inventory.validated" for entry in activity_items)


def test_inventory_mobile_scan_is_logged_for_offline_sync(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-STOCK-SCAN-001",
        company_email="contact@stock-scan.example.com",
        admin_email="admin@stock-scan.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    item_response = client.post(
        "/api/v1/inventory/items",
        headers=headers,
        json={
            "sku": "SCAN-001",
            "name": "Article scanne",
            "unit": "pcs",
            "category": "consumable",
            "barcode": "SCAN-001-BAR",
        },
    )
    assert item_response.status_code == 201, item_response.get_json()
    item_id = item_response.get_json()["item"]["id"]

    scan_response = client.post(
        "/api/v1/inventory/mobile-scans",
        headers=headers,
        json={
            "scanned_value": "SCAN-001-BAR",
            "matched_item_id": item_id,
            "matched_item_name": "Article scanne",
            "scan_target": "operation_line",
            "scan_mode": "camera",
            "captured_at": "2026-03-31T09:15:00Z",
            "device_label": "chantier-mobile",
            "offline_action_id": "offline-scan-001",
            "synced_from_offline": True,
        },
    )
    assert scan_response.status_code == 201, scan_response.get_json()
    scan_payload = scan_response.get_json()["scan"]
    assert scan_payload["action"] == "mobile_scan.logged"
    assert scan_payload["details"]["matched_item_id"] == item_id
    assert scan_payload["details"]["synced_from_offline"] is True

    activity_response = client.get("/api/v1/inventory/activity", headers=headers)
    assert activity_response.status_code == 200, activity_response.get_json()
    activity_items = activity_response.get_json()["items"]
    assert any(entry["action"] == "mobile_scan.logged" for entry in activity_items)
