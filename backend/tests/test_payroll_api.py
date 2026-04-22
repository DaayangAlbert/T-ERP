import re
from datetime import date, timedelta
from pathlib import Path

import pytest

from test_v1_critical_flows import auth_headers, create_approved_company_context, login


BACKEND_DIR = Path(__file__).resolve().parents[1]


def _cleanup_generated_file(generated_file: Path) -> None:
    try:
        generated_file.unlink(missing_ok=True)
    except PermissionError:
        return

    period_dir = generated_file.parent
    company_dir = period_dir.parent.parent
    if period_dir.exists() and not any(period_dir.iterdir()):
        period_dir.rmdir()
    bulletins_dir = company_dir / "bulletins"
    if bulletins_dir.exists() and not any(bulletins_dir.iterdir()):
        bulletins_dir.rmdir()
    if company_dir.exists() and not any(company_dir.iterdir()):
        company_dir.rmdir()


def _pdf_page_count(generated_file: Path) -> int:
    return len(re.findall(rb"/Type\s*/Page\b", generated_file.read_bytes()))


def _create_employee(
    client,
    headers,
    *,
    email,
    login_identifier,
    employee_number,
    first_name,
    last_name,
    base_salary,
    operational_profile_code=None,
):
    payload = {
        "email": email,
        "password": "EmployeePass123!",
        "first_name": first_name,
        "last_name": last_name,
        "login_identifier": login_identifier,
        "user_type": "employee",
        "job_title": "Employe de bureau",
        "department": "Administration",
        "employee_number": employee_number,
        "account_status": "active",
        "hire_date": "2024-01-15",
        "base_salary": str(base_salary),
    }
    if operational_profile_code:
        payload["operational_profile_code"] = operational_profile_code

    response = client.post(
        "/api/v1/users",
        headers=headers,
        json=payload,
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["user"]


def _employee_headers(client, *, company_id, login_identifier, password="EmployeePass123!"):
    login_response = login(
        client,
        email=login_identifier,
        password=password,
        company_id=company_id,
    )
    assert login_response.status_code == 200, login_response.get_json()
    access_token = login_response.get_json()["access_token"]
    return auth_headers(access_token, tenant_id=company_id)


def test_payroll_status_endpoint_is_available(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-STATUS-001",
        company_email="contact@payroll-status.example.com",
        admin_email="admin@payroll-status.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    response = client.get("/api/v1/payroll/status", headers=headers)

    assert response.status_code == 200, response.get_json()
    payload = response.get_json()
    assert payload["module"] == "payroll"
    assert payload["status"] == "ready"
    assert payload["tenant_id"] == company_id
    assert payload["cnps_ceiling"] == 750000.0


def test_company_admin_can_generate_and_download_payslip_via_api(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-API-001",
        company_email="contact@payroll-api.example.com",
        admin_email="admin@payroll-api.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    response = client.post(
        "/api/v1/payroll/payslips/generate",
        headers=headers,
        json={
            "source_type": "inline",
            "include_lines": True,
            "employees": [
                {
                    "employee_id": "EMP-API-001",
                    "nom": "MEBENGA",
                    "prenom": "JEAN JACQUES",
                    "matricule": "22-031",
                    "categorie": "",
                    "echelon": "",
                    "anciennete_mois": 49,
                    "cnps_number": "",
                    "convention_collective": "",
                    "emploi": "Employe de bureau",
                    "departement": "",
                    "date_embauche": "2022-02-07",
                    "horaire": "",
                    "situation_famille": "",
                    "numero_compte": "",
                    "domiciliation": "",
                    "jours_payes": 28,
                    "salaire_base_mensuel": 200000,
                    "indemn_transport": 42000,
                    "autres_gains": 0,
                    "mode_paiement": "EN ESPECE",
                    "date_debut_periode": "2025-02-01",
                    "date_fin_periode": "2025-02-28",
                    "date_paiement": "2025-02-28",
                    "brut_imposable": 200000,
                    "irpp": 20000,
                    "cac": 2000,
                    "tc": 1500,
                    "rav": 1950,
                    "cfs": 2000,
                    "observation": "Generation API",
                }
            ],
        },
    )

    assert response.status_code == 200, response.get_json()
    payload = response.get_json()
    assert payload["count"] == 1
    assert payload["dry_run"] is False
    item = payload["items"][0]
    assert item["employee_id"] == "EMP-API-001"
    assert item["net_a_payer"] == 206150.0
    assert item["pdf_generated"] is True
    assert item["download_path"]
    assert item["lines"][0]["code"] == "A001"

    generated_file = BACKEND_DIR / Path(item["output_path"])
    assert generated_file.exists()
    assert _pdf_page_count(generated_file) == 1

    download_response = client.get(item["download_path"], headers=headers)
    assert download_response.status_code == 200
    assert download_response.mimetype == "application/pdf"
    assert download_response.data.startswith(b"%PDF")
    download_response.close()

    _cleanup_generated_file(generated_file)


def test_payroll_database_employees_and_monthly_generation_are_available(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-DB-001",
        company_email="contact@payroll-db.example.com",
        admin_email="admin@payroll-db.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        headers,
        email="employee-payroll-db@example.com",
        login_identifier="employee.payroll.db",
        employee_number="EMP-PAY-001",
        first_name="Jean",
        last_name="Mebenga",
        base_salary=200000,
    )

    employees_response = client.get("/api/v1/payroll/employees", headers=headers)
    assert employees_response.status_code == 200, employees_response.get_json()
    employees_payload = employees_response.get_json()
    assert employees_payload["count"] >= 1
    employee_row = next((row for row in employees_payload["items"] if row["id"] == employee["id"]), None)
    assert employee_row is not None
    assert employee_row["employee_number"] == "EMP-PAY-001"
    assert employee_row["base_salary"] == 200000.0

    generate_response = client.post(
        "/api/v1/payroll/periods/generate",
        headers=headers,
        json={
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
            "payment_date": "2026-03-31",
            "label": "Mars 2026",
            "include_lines": True,
            "employee_ids": [employee["id"]],
            "employee_inputs": [
                {
                    "user_id": employee["id"],
                    "days_paid": 31,
                    "transport_allowance": 42000,
                    "other_gains": 0,
                    "brut_imposable": 200000,
                    "irpp": 20000,
                    "cac": 2000,
                    "tc": 1500,
                    "rav": 1950,
                    "cfs": 2000,
                    "payment_method": "cash",
                    "observation": "Cloture mensuelle",
                }
            ],
        },
    )
    assert generate_response.status_code == 200, generate_response.get_json()
    payload = generate_response.get_json()
    assert payload["count"] == 1
    assert payload["period"]["period_key"] == "2026-03"
    assert payload["period"]["status"] == "generated"
    assert payload["run"] is not None
    assert payload["run"]["employee_count"] == 1

    item = payload["items"][0]
    assert item["employee_id"] == str(employee["id"])
    assert item["matricule"] == "EMP-PAY-001"
    assert item["net_a_payer"] == 206150.0
    assert item["pdf_generated"] is True
    assert item["download_path"]

    runs_response = client.get("/api/v1/payroll/runs", headers=headers)
    assert runs_response.status_code == 200, runs_response.get_json()
    runs_payload = runs_response.get_json()
    assert runs_payload["count"] >= 1
    assert any(run["run_reference"] == payload["run"]["run_reference"] for run in runs_payload["items"])

    generated_file = BACKEND_DIR / Path(item["output_path"])
    assert generated_file.exists()
    assert _pdf_page_count(generated_file) == 1

    download_response = client.get(item["download_path"], headers=headers)
    assert download_response.status_code == 200
    assert download_response.mimetype == "application/pdf"
    assert download_response.data.startswith(b"%PDF")
    download_response.close()

    _cleanup_generated_file(generated_file)


def test_payroll_employee_profile_crud_updates_persistent_defaults(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-PROFILE-001",
        company_email="contact@payroll-profile.example.com",
        admin_email="admin@payroll-profile.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        headers,
        email="employee-payroll-profile@example.com",
        login_identifier="employee.payroll.profile",
        employee_number="EMP-PROFILE-001",
        first_name="Jacques",
        last_name="Mebenga",
        base_salary=200000,
    )

    save_response = client.patch(
        f"/api/v1/payroll/employees/{employee['id']}/profile",
        headers=headers,
        json={
            "category": "5A",
            "echelon": "2",
            "cnps_number": "CNPS-7788",
            "employment_label": "Employe de bureau",
            "family_status": "Marie",
            "bank_account_number": "100200300",
            "bank_domiciliation": "BICEC Yaounde",
            "payment_method": "cash",
            "transport_allowance": 42000,
            "other_fixed_gains": 5000,
            "payroll_notes": "Profil paie persistant",
            "is_payroll_enabled": True,
        },
    )
    assert save_response.status_code == 200, save_response.get_json()
    saved_payload = save_response.get_json()["data"]
    assert saved_payload["exists"] is True
    assert saved_payload["profile"]["cnps_number"] == "CNPS-7788"
    assert saved_payload["profile"]["transport_allowance"] == 42000.0
    assert saved_payload["profile"]["other_fixed_gains"] == 5000.0
    assert saved_payload["profile"]["payment_method"] == "cash"

    get_response = client.get(f"/api/v1/payroll/employees/{employee['id']}/profile", headers=headers)
    assert get_response.status_code == 200, get_response.get_json()
    get_payload = get_response.get_json()
    assert get_payload["exists"] is True
    assert get_payload["profile"]["bank_account_number"] == "100200300"

    employees_response = client.get("/api/v1/payroll/employees", headers=headers)
    assert employees_response.status_code == 200, employees_response.get_json()
    employee_row = next((row for row in employees_response.get_json()["items"] if row["id"] == employee["id"]), None)
    assert employee_row is not None
    assert employee_row["payroll_enabled"] is True
    assert employee_row["payment_method"] == "cash"
    assert employee_row["profile"]["transport_allowance"] == 42000.0
    assert employee_row["profile"]["other_fixed_gains"] == 5000.0

    generate_response = client.post(
        "/api/v1/payroll/periods/generate",
        headers=headers,
        json={
            "start_date": "2026-03-01",
            "end_date": "2026-03-31",
            "payment_date": "2026-03-31",
            "employee_ids": [employee["id"]],
            "employee_inputs": [
                {
                    "user_id": employee["id"],
                    "brut_imposable": 200000,
                    "irpp": 20000,
                    "cac": 2000,
                    "tc": 1500,
                    "rav": 1950,
                    "cfs": 2000,
                }
            ],
        },
    )
    assert generate_response.status_code == 200, generate_response.get_json()
    generation_payload = generate_response.get_json()
    item = generation_payload["items"][0]
    assert item["net_a_payer"] == 211150.0
    generated_file = BACKEND_DIR / Path(item["output_path"])
    assert generated_file.exists()
    _cleanup_generated_file(generated_file)

    delete_response = client.delete(f"/api/v1/payroll/employees/{employee['id']}/profile", headers=headers)
    assert delete_response.status_code == 200, delete_response.get_json()
    deleted_payload = delete_response.get_json()["data"]
    assert deleted_payload["exists"] is False
    assert deleted_payload["profile"]["transport_allowance"] == 0.0
    assert deleted_payload["profile"]["payment_method"] == "bank_transfer"

    get_after_delete = client.get(f"/api/v1/payroll/employees/{employee['id']}/profile", headers=headers)
    assert get_after_delete.status_code == 200, get_after_delete.get_json()
    assert get_after_delete.get_json()["exists"] is False


def test_payroll_period_inputs_crud_supports_month_preparation_before_generation(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-PERIOD-CRUD-001",
        company_email="contact@payroll-period-crud.example.com",
        admin_email="admin@payroll-period-crud.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        headers,
        email="employee-payroll-period@example.com",
        login_identifier="employee.payroll.period",
        employee_number="EMP-PERIOD-001",
        first_name="Paul",
        last_name="Essama",
        base_salary=200000,
    )

    period_create = client.post(
        "/api/v1/payroll/periods",
        headers=headers,
        json={
            "period_key": "2026-04",
            "label": "Avril 2026",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "payment_date": "2026-04-30",
            "notes": "Preparation avant generation",
        },
    )
    assert period_create.status_code == 201, period_create.get_json()
    period_payload = period_create.get_json()["data"]
    period_id = period_payload["id"]
    assert period_payload["period_key"] == "2026-04"
    assert period_payload["status"] == "draft"

    periods_response = client.get("/api/v1/payroll/periods", headers=headers)
    assert periods_response.status_code == 200, periods_response.get_json()
    periods_payload = periods_response.get_json()
    assert any(item["id"] == period_id for item in periods_payload["items"])

    save_inputs = client.put(
        f"/api/v1/payroll/periods/{period_id}/inputs",
        headers=headers,
        json={
            "employee_inputs": [
                {
                    "user_id": employee["id"],
                    "days_paid": 30,
                    "transport_allowance": 42000,
                    "other_gains": 5000,
                    "brut_imposable": 200000,
                    "irpp": 20000,
                    "cac": 2000,
                    "tc": 1500,
                    "rav": 1950,
                    "cfs": 2000,
                    "payment_method": "cash",
                    "observation": "Brouillon mensuel",
                }
            ]
        },
    )
    assert save_inputs.status_code == 200, save_inputs.get_json()
    saved_inputs_payload = save_inputs.get_json()["data"]
    assert saved_inputs_payload["period"]["id"] == period_id
    saved_row = next((row for row in saved_inputs_payload["items"] if row["employee"]["id"] == employee["id"]), None)
    assert saved_row is not None
    assert saved_row["input"]["exists"] is True

    get_inputs = client.get(f"/api/v1/payroll/periods/{period_id}/inputs", headers=headers)
    assert get_inputs.status_code == 200, get_inputs.get_json()
    input_row = next((row for row in get_inputs.get_json()["items"] if row["employee"]["id"] == employee["id"]), None)
    assert input_row is not None
    assert input_row["input"]["transport_allowance"] == 42000.0
    assert input_row["input"]["other_gains"] == 5000.0
    assert input_row["input"]["payment_method"] == "cash"

    generate_response = client.post(
        "/api/v1/payroll/periods/generate",
        headers=headers,
        json={
            "payroll_period_id": period_id,
            "employee_ids": [employee["id"]],
        },
    )
    assert generate_response.status_code == 200, generate_response.get_json()
    generated_payload = generate_response.get_json()
    assert generated_payload["period"]["id"] == period_id
    assert generated_payload["period"]["status"] == "generated"
    generated_item = generated_payload["items"][0]
    assert generated_item["net_a_payer"] == 211150.0
    generated_file = BACKEND_DIR / Path(generated_item["output_path"])
    assert generated_file.exists()
    _cleanup_generated_file(generated_file)

    delete_input = client.delete(f"/api/v1/payroll/periods/{period_id}/inputs/{employee['id']}", headers=headers)
    assert delete_input.status_code == 200, delete_input.get_json()
    refreshed_row = next((row for row in delete_input.get_json()["data"]["items"] if row["employee"]["id"] == employee["id"]), None)
    assert refreshed_row is not None
    assert refreshed_row["input"]["exists"] is False


def test_payroll_period_inputs_include_attendance_recommendations(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-ATT-PERIOD-001",
        company_email="contact@payroll-attendance-period.example.com",
        admin_email="admin@payroll-attendance-period.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        headers,
        email="employee-payroll-attendance-period@example.com",
        login_identifier="employee.payroll.attendance.period",
        employee_number="EMP-ATT-PERIOD-001",
        first_name="Serge",
        last_name="Obam",
        base_salary=200000,
    )

    period_create = client.post(
        "/api/v1/payroll/periods",
        headers=headers,
        json={
            "period_key": "2026-04",
            "label": "Avril 2026",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
            "payment_date": "2026-04-30",
        },
    )
    assert period_create.status_code == 201, period_create.get_json()
    period_id = period_create.get_json()["data"]["id"]

    attendance_payloads = [
        {
            "user_id": employee["id"],
            "attendance_date": "2026-04-01",
            "arrival_time": "07:30",
            "departure_time": "17:15",
        },
        {
            "user_id": employee["id"],
            "attendance_date": "2026-04-02",
            "arrival_time": "07:50",
            "departure_time": "17:15",
        },
        {
            "user_id": employee["id"],
            "attendance_date": "2026-04-03",
            "arrival_time": "07:25",
            "departure_time": "18:20",
        },
        {
            "user_id": employee["id"],
            "attendance_date": "2026-04-04",
            "status": "absent",
            "notes": "Absence constatee sur chantier",
        },
    ]
    for payload in attendance_payloads:
        response = client.post("/api/v1/attendance", headers=headers, json=payload)
        assert response.status_code == 201, response.get_json()

    get_inputs = client.get(f"/api/v1/payroll/periods/{period_id}/inputs", headers=headers)
    assert get_inputs.status_code == 200, get_inputs.get_json()
    input_row = next((row for row in get_inputs.get_json()["items"] if row["employee"]["id"] == employee["id"]), None)
    assert input_row is not None
    assert input_row["input"]["defaults"]["days_paid"] == 3.0
    assert input_row["input"]["defaults"]["late_hours"] == 0.17
    assert input_row["input"]["attendance_summary"]["tracked_days"] == 4
    assert input_row["input"]["attendance_summary"]["tracked_presence_days"] == 3
    assert input_row["input"]["attendance_summary"]["unjustified_absence_days"] == 1
    assert "absence(s) non couverte(s)" in (input_row["input"]["defaults"]["observation"] or "")


def test_payroll_generation_uses_attendance_recommended_days_when_period_input_is_blank(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-ATT-GEN-001",
        company_email="contact@payroll-attendance-generation.example.com",
        admin_email="admin@payroll-attendance-generation.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        headers,
        email="employee-payroll-attendance-generation@example.com",
        login_identifier="employee.payroll.attendance.generation",
        employee_number="EMP-ATT-GEN-001",
        first_name="Nadine",
        last_name="Eyenga",
        base_salary=200000,
    )

    for payload in [
        {
            "user_id": employee["id"],
            "attendance_date": "2026-03-01",
            "arrival_time": "07:30",
            "departure_time": "17:15",
        },
        {
            "user_id": employee["id"],
            "attendance_date": "2026-03-02",
            "arrival_time": "07:35",
            "departure_time": "17:15",
        },
        {
            "user_id": employee["id"],
            "attendance_date": "2026-03-03",
            "status": "absent",
            "notes": "Absence non couverte",
        },
    ]:
        response = client.post("/api/v1/attendance", headers=headers, json=payload)
        assert response.status_code == 201, response.get_json()

    generate_response = client.post(
        "/api/v1/payroll/periods/generate",
        headers=headers,
        json={
            "period_key": "2026-03",
            "label": "Mars 2026 - attendance",
            "start_date": "2026-03-01",
            "end_date": "2026-03-03",
            "payment_date": "2026-03-03",
            "include_lines": True,
            "employee_ids": [employee["id"]],
            "employee_inputs": [
                {
                    "user_id": employee["id"],
                    "brut_imposable": 200000,
                    "irpp": 20000,
                    "cac": 2000,
                    "tc": 1500,
                    "rav": 1950,
                    "cfs": 2000,
                }
            ],
        },
    )
    assert generate_response.status_code == 200, generate_response.get_json()
    generated_item = generate_response.get_json()["items"][0]
    salary_base_line = generated_item["lines"][0]
    assert salary_base_line["nombre"] == 2.0
    assert salary_base_line["base"] == 100000.0

    generated_file = BACKEND_DIR / Path(generated_item["output_path"])
    assert generated_file.exists()
    _cleanup_generated_file(generated_file)


def test_payroll_employee_can_submit_and_list_self_service_leave_requests(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-LEAVE-001",
        company_email="contact@payroll-leave.example.com",
        admin_email="admin@payroll-leave.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    _create_employee(
        client,
        admin_headers,
        email="employee-payroll-leave@example.com",
        login_identifier="employee.payroll.leave",
        employee_number="EMP-LEAVE-001",
        first_name="Marc",
        last_name="Mvondo",
        base_salary=180000,
        operational_profile_code="logisticien",
    )
    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.leave")

    initial_response = client.get("/api/v1/payroll/me/leave-requests", headers=employee_headers)
    assert initial_response.status_code == 200, initial_response.get_json()
    assert initial_response.get_json()["count"] == 0

    create_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-local-001",
            "type": "paid_leave",
            "start_date": "2026-04-14",
            "end_date": "2026-04-16",
            "reason": "Conge familial",
            "contact": "+237600000001",
            "handover_note": "Passation envoyee a l'equipe finance",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    created_item = create_response.get_json()["data"]
    assert created_item["type"] == "paid_leave"
    assert created_item["days_requested"] == 3.0
    assert created_item["status"] == "submitted"
    assert created_item["source"] == "api"
    assert created_item["client_request_id"] == "leave-local-001"
    assert created_item["reason"] == "Conge familial"

    list_response = client.get("/api/v1/payroll/me/leave-requests", headers=employee_headers)
    assert list_response.status_code == 200, list_response.get_json()
    payload = list_response.get_json()
    assert payload["count"] == 1
    assert payload["items"][0]["id"] == created_item["id"]
    assert payload["items"][0]["backup_contact"] == "+237600000001"


def test_payroll_leave_request_submission_is_idempotent_with_client_request_id(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-LEAVE-002",
        company_email="contact@payroll-leave-sync.example.com",
        admin_email="admin@payroll-leave-sync.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    _create_employee(
        client,
        admin_headers,
        email="employee-payroll-leave-sync@example.com",
        login_identifier="employee.payroll.leave.sync",
        employee_number="EMP-LEAVE-002",
        first_name="Nadia",
        last_name="Abena",
        base_salary=190000,
        operational_profile_code="logisticien",
    )
    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.leave.sync")

    payload = {
        "client_request_id": "leave-local-sync-001",
        "type": "permission",
        "title": "Permission du 2026-04-08",
        "start_date": "2026-04-08",
        "end_date": "2026-04-08",
        "days_requested": 1,
        "reason": "Demarche administrative",
    }

    first_response = client.post("/api/v1/payroll/me/leave-requests", headers=employee_headers, json=payload)
    assert first_response.status_code == 201, first_response.get_json()

    second_response = client.post("/api/v1/payroll/me/leave-requests", headers=employee_headers, json=payload)
    assert second_response.status_code == 201, second_response.get_json()

    first_item = first_response.get_json()["data"]
    second_item = second_response.get_json()["data"]
    assert second_item["id"] == first_item["id"]

    list_response = client.get("/api/v1/payroll/me/leave-requests", headers=employee_headers)
    assert list_response.status_code == 200, list_response.get_json()
    assert list_response.get_json()["count"] == 1


@pytest.mark.parametrize(
    (
        "registration_number",
        "company_email",
        "admin_email",
        "manager_email",
        "manager_login_identifier",
        "manager_employee_number",
        "manager_first_name",
        "manager_last_name",
        "manager_profile_code",
    ),
    [
        (
            "REG-TEST-PAYROLL-LEAVE-RH-001",
            "contact@payroll-leave-rh.example.com",
            "admin@payroll-leave-rh.example.com",
            "responsable-rh-payroll@example.com",
            "responsable.rh.payroll",
            "EMP-RH-001",
            "Claire",
            "Ngo",
            "responsable_rh",
        ),
        (
            "REG-TEST-PAYROLL-LEAVE-RH-002",
            "contact@payroll-leave-recruteur.example.com",
            "admin@payroll-leave-recruteur.example.com",
            "recruteur-payroll@example.com",
            "rh.recruteur.payroll",
            "EMP-RH-002",
            "Nora",
            "Meka",
            "rh_recruteur",
        ),
    ],
)
def test_payroll_hr_profiles_can_manage_leave_history_and_counters(
    client,
    registration_number,
    company_email,
    admin_email,
    manager_email,
    manager_login_identifier,
    manager_employee_number,
    manager_first_name,
    manager_last_name,
    manager_profile_code,
):
    context = create_approved_company_context(
        client,
        registration_number=registration_number,
        company_email=company_email,
        admin_email=admin_email,
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        admin_headers,
        email="employee-payroll-leave-rh@example.com",
        login_identifier="employee.payroll.leave.rh",
        employee_number="EMP-LEAVE-RH-001",
        first_name="Luc",
        last_name="Mballa",
        base_salary=175000,
        operational_profile_code="logisticien",
    )
    _create_employee(
        client,
        admin_headers,
        email=manager_email,
        login_identifier=manager_login_identifier,
        employee_number=manager_employee_number,
        first_name=manager_first_name,
        last_name=manager_last_name,
        base_salary=240000,
        operational_profile_code=manager_profile_code,
    )

    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.leave.rh")
    rh_headers = _employee_headers(client, company_id=company_id, login_identifier=manager_login_identifier)

    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-rh-control-001",
            "type": "paid_leave",
            "start_date": "2026-05-04",
            "end_date": "2026-05-07",
            "reason": "Repos annuel",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]

    rh_list_response = client.get("/api/v1/payroll/leave-requests", headers=rh_headers)
    assert rh_list_response.status_code == 200, rh_list_response.get_json()
    rh_payload = rh_list_response.get_json()
    assert rh_payload["summary"]["total_requests"] == 1
    assert rh_payload["summary"]["pending_requests"] == 1
    managed_item = next((item for item in rh_payload["items"] if item["id"] == leave_request["id"]), None)
    assert managed_item is not None
    assert managed_item["employee"]["id"] == employee["id"]
    assert managed_item["employee_leave_summary"]["pending_days_total"] == 4.0

    approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=rh_headers,
        json={"status": "approved"},
    )
    assert approve_response.status_code == 200, approve_response.get_json()
    approved_item = approve_response.get_json()["data"]
    assert approved_item["status"] == "approved"
    assert approved_item["employee_leave_summary"]["approved_days_total"] == 4.0

    employees_response = client.get("/api/v1/payroll/employees", headers=rh_headers)
    assert employees_response.status_code == 200, employees_response.get_json()
    employee_row = next((row for row in employees_response.get_json()["items"] if row["id"] == employee["id"]), None)
    assert employee_row is not None
    assert employee_row["leave_summary"]["approved_days_total"] == 4.0
    assert employee_row["leave_summary"]["pending_requests"] == 0

    employee_summary_response = client.get("/api/v1/payroll/me/summary", headers=employee_headers)
    assert employee_summary_response.status_code == 200, employee_summary_response.get_json()
    assert employee_summary_response.get_json()["leave_summary"]["approved_days_total"] == 4.0

    employee_history_response = client.get("/api/v1/payroll/me/leave-requests", headers=employee_headers)
    assert employee_history_response.status_code == 200, employee_history_response.get_json()
    assert employee_history_response.get_json()["summary"]["approved_days_total"] == 4.0


def test_payroll_approved_leave_request_syncs_attendance_and_self_summary(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-ATT-001",
        company_email="contact@payroll-attendance.example.com",
        admin_email="admin@payroll-attendance.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        admin_headers,
        email="employee-payroll-attendance@example.com",
        login_identifier="employee.payroll.attendance",
        employee_number="EMP-ATT-PAY-001",
        first_name="Joel",
        last_name="Minko",
        base_salary=185000,
        operational_profile_code="logisticien",
    )
    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.attendance")

    start_date = date.today().replace(day=4)
    end_date = start_date + timedelta(days=2)

    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-attendance-sync-001",
            "type": "paid_leave",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": "Conge familial",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]

    approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_response.status_code == 200, approve_response.get_json()
    approved_item = approve_response.get_json()["data"]
    assert approved_item["attendance_sync"]["applied_days"] == 3
    assert approved_item["attendance_sync"]["conflict_days"] == 0

    attendance_response = client.get(
        f"/api/v1/attendance?user_id={employee['id']}&date_from={start_date.isoformat()}&date_to={end_date.isoformat()}",
        headers=admin_headers,
    )
    assert attendance_response.status_code == 200, attendance_response.get_json()
    attendance_payload = attendance_response.get_json()
    assert attendance_payload["count"] == 3
    assert all(item["status"] == "absent" for item in attendance_payload["items"])

    self_summary_response = client.get("/api/v1/payroll/me/summary", headers=employee_headers)
    assert self_summary_response.status_code == 200, self_summary_response.get_json()
    attendance_summary = self_summary_response.get_json()["attendance"]
    assert attendance_summary["source"] == "attendance_records"
    assert attendance_summary["absence_days"] == 3
    assert attendance_summary["approved_leave_days"] == 3
    assert attendance_summary["unjustified_absence_days"] == 0


def test_reverting_leave_approval_removes_synced_attendance_records(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-ATT-002",
        company_email="contact@payroll-attendance-revert.example.com",
        admin_email="admin@payroll-attendance-revert.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        admin_headers,
        email="employee-payroll-attendance-revert@example.com",
        login_identifier="employee.payroll.attendance.revert",
        employee_number="EMP-ATT-PAY-002",
        first_name="Sonia",
        last_name="Abega",
        base_salary=192000,
        operational_profile_code="logisticien",
    )
    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.attendance.revert")

    start_date = date.today().replace(day=8)
    end_date = start_date + timedelta(days=1)
    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-attendance-sync-002",
            "type": "sick_leave",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": "Arret maladie",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]

    approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=admin_headers,
        json={"status": "approved"},
    )
    assert approve_response.status_code == 200, approve_response.get_json()
    assert approve_response.get_json()["data"]["attendance_sync"]["applied_days"] == 2

    revert_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=admin_headers,
        json={"status": "rejected"},
    )
    assert revert_response.status_code == 200, revert_response.get_json()
    reverted_item = revert_response.get_json()["data"]
    assert reverted_item["attendance_sync"]["removed_days"] == 2

    attendance_response = client.get(
        f"/api/v1/attendance?user_id={employee['id']}&date_from={start_date.isoformat()}&date_to={end_date.isoformat()}",
        headers=admin_headers,
    )
    assert attendance_response.status_code == 200, attendance_response.get_json()
    assert attendance_response.get_json()["count"] == 0


def test_leave_workflow_requires_manager_then_hr_for_standard_leave(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-WF-001",
        company_email="contact@payroll-workflow-short.example.com",
        admin_email="admin@payroll-workflow-short.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        admin_headers,
        email="employee-payroll-workflow-short@example.com",
        login_identifier="employee.payroll.workflow.short",
        employee_number="EMP-WF-001",
        first_name="Aude",
        last_name="Ela",
        base_salary=188000,
        operational_profile_code="logisticien",
    )
    _create_employee(
        client,
        admin_headers,
        email="manager-payroll-workflow-short@example.com",
        login_identifier="manager.payroll.workflow.short",
        employee_number="EMP-WF-M-001",
        first_name="Brice",
        last_name="Nkoa",
        base_salary=245000,
        operational_profile_code="chef_chantier",
    )
    _create_employee(
        client,
        admin_headers,
        email="rh-payroll-workflow-short@example.com",
        login_identifier="rh.payroll.workflow.short",
        employee_number="EMP-WF-RH-001",
        first_name="Claire",
        last_name="Mvele",
        base_salary=255000,
        operational_profile_code="responsable_rh",
    )

    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.workflow.short")
    manager_headers = _employee_headers(client, company_id=company_id, login_identifier="manager.payroll.workflow.short")
    rh_headers = _employee_headers(client, company_id=company_id, login_identifier="rh.payroll.workflow.short")

    start_date = date.today().replace(day=10)
    end_date = start_date + timedelta(days=1)
    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-wf-short-001",
            "type": "paid_leave",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": "Repos annuel",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]
    assert leave_request["workflow"]["current_stage_code"] == "manager_review"

    manager_list_response = client.get("/api/v1/payroll/leave-requests", headers=manager_headers)
    assert manager_list_response.status_code == 200, manager_list_response.get_json()
    assert manager_list_response.get_json()["count"] == 1

    manager_approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=manager_headers,
        json={"action": "approve", "decision_note": "Equipe de remplacement disponible"},
    )
    assert manager_approve_response.status_code == 200, manager_approve_response.get_json()
    manager_item = manager_approve_response.get_json()["data"]
    assert manager_item["status"] == "received"
    assert manager_item["attendance_sync"]["applied_days"] == 0
    assert manager_item["workflow"]["current_stage_code"] == "hr_review"

    hr_list_response = client.get("/api/v1/payroll/leave-requests", headers=rh_headers)
    assert hr_list_response.status_code == 200, hr_list_response.get_json()
    assert hr_list_response.get_json()["count"] == 1

    hr_approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=rh_headers,
        json={"action": "approve", "decision_note": "Validation RH finale"},
    )
    assert hr_approve_response.status_code == 200, hr_approve_response.get_json()
    hr_item = hr_approve_response.get_json()["data"]
    assert hr_item["status"] == "approved"
    assert hr_item["attendance_sync"]["applied_days"] == 2
    assert hr_item["workflow"]["is_final"] is True


def test_leave_workflow_escalates_long_leave_to_direction(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-WF-002",
        company_email="contact@payroll-workflow-long.example.com",
        admin_email="admin@payroll-workflow-long.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee = _create_employee(
        client,
        admin_headers,
        email="employee-payroll-workflow-long@example.com",
        login_identifier="employee.payroll.workflow.long",
        employee_number="EMP-WF-002",
        first_name="Noel",
        last_name="Abena",
        base_salary=201000,
        operational_profile_code="logisticien",
    )
    _create_employee(
        client,
        admin_headers,
        email="manager-payroll-workflow-long@example.com",
        login_identifier="manager.payroll.workflow.long",
        employee_number="EMP-WF-M-002",
        first_name="Joel",
        last_name="Meka",
        base_salary=248000,
        operational_profile_code="chef_projet",
    )
    _create_employee(
        client,
        admin_headers,
        email="rh-payroll-workflow-long@example.com",
        login_identifier="rh.payroll.workflow.long",
        employee_number="EMP-WF-RH-002",
        first_name="Nora",
        last_name="Essomba",
        base_salary=259000,
        operational_profile_code="responsable_rh",
    )
    _create_employee(
        client,
        admin_headers,
        email="direction-payroll-workflow-long@example.com",
        login_identifier="direction.payroll.workflow.long",
        employee_number="EMP-WF-DIR-001",
        first_name="Paul",
        last_name="Nde",
        base_salary=320000,
        operational_profile_code="directeur_general",
    )

    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.workflow.long")
    manager_headers = _employee_headers(client, company_id=company_id, login_identifier="manager.payroll.workflow.long")
    rh_headers = _employee_headers(client, company_id=company_id, login_identifier="rh.payroll.workflow.long")
    direction_headers = _employee_headers(client, company_id=company_id, login_identifier="direction.payroll.workflow.long")

    start_date = date.today().replace(day=14)
    end_date = start_date + timedelta(days=5)
    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-wf-long-001",
            "type": "paid_leave",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "reason": "Conge annuel long",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]
    assert leave_request["workflow"]["required_stage_codes"] == ["manager_review", "hr_review", "direction_review"]

    manager_approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=manager_headers,
        json={"action": "approve", "decision_note": "Planning chantier ajuste"},
    )
    assert manager_approve_response.status_code == 200, manager_approve_response.get_json()
    assert manager_approve_response.get_json()["data"]["workflow"]["current_stage_code"] == "hr_review"

    hr_approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=rh_headers,
        json={"action": "approve", "decision_note": "Dossier RH conforme"},
    )
    assert hr_approve_response.status_code == 200, hr_approve_response.get_json()
    hr_item = hr_approve_response.get_json()["data"]
    assert hr_item["status"] == "processing"
    assert hr_item["attendance_sync"]["applied_days"] == 0
    assert hr_item["workflow"]["current_stage_code"] == "direction_review"

    direction_list_response = client.get("/api/v1/payroll/leave-requests", headers=direction_headers)
    assert direction_list_response.status_code == 200, direction_list_response.get_json()
    assert direction_list_response.get_json()["count"] == 1

    direction_approve_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=direction_headers,
        json={"action": "approve", "decision_note": "Validation direction generale"},
    )
    assert direction_approve_response.status_code == 200, direction_approve_response.get_json()
    direction_item = direction_approve_response.get_json()["data"]
    assert direction_item["status"] == "approved"
    assert direction_item["attendance_sync"]["applied_days"] == 6
    assert direction_item["workflow"]["is_final"] is True

    attendance_response = client.get(
        f"/api/v1/attendance?user_id={employee['id']}&date_from={start_date.isoformat()}&date_to={end_date.isoformat()}",
        headers=admin_headers,
    )
    assert attendance_response.status_code == 200, attendance_response.get_json()
    assert attendance_response.get_json()["count"] == 6


def test_leave_workflow_forbids_non_approver_actions(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PAYROLL-WF-003",
        company_email="contact@payroll-workflow-forbidden.example.com",
        admin_email="admin@payroll-workflow-forbidden.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    _create_employee(
        client,
        admin_headers,
        email="employee-payroll-workflow-forbidden@example.com",
        login_identifier="employee.payroll.workflow.forbidden",
        employee_number="EMP-WF-003",
        first_name="Mireille",
        last_name="Nkoe",
        base_salary=182000,
        operational_profile_code="logisticien",
    )
    _create_employee(
        client,
        admin_headers,
        email="employee-payroll-workflow-colleague@example.com",
        login_identifier="employee.payroll.workflow.colleague",
        employee_number="EMP-WF-004",
        first_name="Lucie",
        last_name="Ewane",
        base_salary=181000,
        operational_profile_code="logisticien",
    )

    employee_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.workflow.forbidden")
    colleague_headers = _employee_headers(client, company_id=company_id, login_identifier="employee.payroll.workflow.colleague")

    submit_response = client.post(
        "/api/v1/payroll/me/leave-requests",
        headers=employee_headers,
        json={
            "client_request_id": "leave-wf-forbidden-001",
            "type": "permission",
            "start_date": date.today().replace(day=18).isoformat(),
            "end_date": date.today().replace(day=18).isoformat(),
            "reason": "Demarche personnelle",
        },
    )
    assert submit_response.status_code == 201, submit_response.get_json()
    leave_request = submit_response.get_json()["data"]

    forbidden_response = client.patch(
        f"/api/v1/payroll/leave-requests/{leave_request['id']}",
        headers=colleague_headers,
        json={"action": "approve"},
    )
    assert forbidden_response.status_code == 403, forbidden_response.get_json()
    assert forbidden_response.get_json()["code"] == "leave_workflow_stage_forbidden"
