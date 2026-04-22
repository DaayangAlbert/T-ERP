from app.extensions import db
from app.models.project import Project
from app.models.user import User
from app.modules.auth.service import hash_password


def bootstrap_super_admin(client, email="platform-attendance-admin@example.com", password="PlatformPass123!"):
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
    return response.get_json()


def register_company(
    client,
    *,
    registration_number="REG-ATTENDANCE-001",
    company_email="contact@attendance-company.example.com",
    admin_email="admin@attendance-company.example.com",
    admin_password="CompanyPass123!",
):
    response = client.post(
        "/api/v1/companies/register",
        json={
            "legal_name": "Attendance Company SARL",
            "registration_number": registration_number,
            "email": company_email,
            "country_code": "CM",
            "admin_first_name": "Alice",
            "admin_last_name": "Ngono",
            "admin_email": admin_email,
            "admin_password": admin_password,
            "currency": "XAF",
            "timezone": "Africa/Douala",
        },
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()["company"]


def auth_headers(access_token, tenant_id=None):
    headers = {"Authorization": f"Bearer {access_token}"}
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    return headers


def create_approved_company_context(client):
    super_admin = bootstrap_super_admin(client)
    company = register_company(client)

    review_response = client.patch(
        f"/api/v1/companies/{company['id']}/review",
        headers=auth_headers(super_admin["access_token"]),
        json={"decision": "approved"},
    )
    assert review_response.status_code == 200, review_response.get_json()

    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@attendance-company.example.com",
            "password": "CompanyPass123!",
            "company_id": company["id"],
        },
    )
    assert login_response.status_code == 200, login_response.get_json()

    payload = login_response.get_json()
    return {
        "company": company,
        "access_token": payload["access_token"],
        "user": payload["user"],
    }


def seed_employee(
    app,
    *,
    company_id: int,
    email="worker@attendance-company.example.com",
    employee_number="EMP-ATT-001",
    project_code="PRJ-ATT-001",
    project_name="Residence Palmier",
):
    with app.app_context():
        employee = User(
            company_id=company_id,
            email=email,
            password_hash=hash_password("WorkerPass123!"),
            first_name="Marcel",
            last_name="Etoa",
            user_type="employee",
            account_status="active",
            is_active=True,
            employee_number=employee_number,
            job_title="Macon",
            department="Chantier",
        )
        project = Project(
            company_id=company_id,
            code=project_code,
            name=project_name,
            status="in_progress",
        )
        db.session.add(employee)
        db.session.add(project)
        db.session.commit()
        return employee.id, project.id


def test_company_admin_can_manage_attendance_records(client, app):
    context = create_approved_company_context(client)
    assert "attendance.read" in context["user"]["permissions"]
    assert "attendance.manage" in context["user"]["permissions"]

    employee_id, project_id = seed_employee(app, company_id=context["company"]["id"])
    headers = auth_headers(context["access_token"], tenant_id=context["company"]["id"])

    create_response = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_id,
            "project_id": project_id,
            "attendance_date": "2026-04-08",
            "arrival_time": "07:55",
            "departure_time": "18:30",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    record = create_response.get_json()["record"]
    assert record["status"] == "overtime"
    assert record["minutes_late"] == 15
    assert record["overtime_minutes"] == 75

    list_response = client.get("/api/v1/attendance", headers=headers)
    assert list_response.status_code == 200, list_response.get_json()
    assert list_response.get_json()["count"] == 1

    summary_response = client.get("/api/v1/attendance/summary", headers=headers)
    assert summary_response.status_code == 200, summary_response.get_json()
    summary = summary_response.get_json()["summary"]
    assert summary["employees_tracked"] == 1
    assert summary["overtime_count"] == 1
    assert summary["late_minutes_total"] == 15
    assert summary["overtime_minutes_total"] == 75

    duplicate_response = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_id,
            "attendance_date": "2026-04-08",
            "arrival_time": "07:40",
        },
    )
    assert duplicate_response.status_code == 409, duplicate_response.get_json()
    assert duplicate_response.get_json()["code"] == "attendance_duplicate_record"


def test_attendance_policy_update_changes_record_calculation(client, app):
    context = create_approved_company_context(client)
    employee_id, _ = seed_employee(
        app,
        company_id=context["company"]["id"],
        email="worker-policy@attendance-company.example.com",
    )
    headers = auth_headers(context["access_token"], tenant_id=context["company"]["id"])

    policy_response = client.patch(
        "/api/v1/attendance/policy",
        headers=headers,
        json={
            "default_start_time": "08:00",
            "default_end_time": "17:00",
            "grace_minutes": 5,
            "overtime_threshold_minutes": 30,
            "timezone": "Africa/Douala",
        },
    )
    assert policy_response.status_code == 200, policy_response.get_json()
    policy = policy_response.get_json()["policy"]
    assert policy["default_start_time"] == "08:00"
    assert policy["overtime_threshold_minutes"] == 30

    create_response = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_id,
            "attendance_date": "2026-04-09",
            "arrival_time": "08:12",
            "departure_time": "17:40",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    record = create_response.get_json()["record"]
    assert record["status"] == "overtime"
    assert record["minutes_late"] == 7
    assert record["overtime_minutes"] == 40


def test_attendance_summary_groups_records_by_project_for_manager_views(client, app):
    context = create_approved_company_context(client)
    headers = auth_headers(context["access_token"], tenant_id=context["company"]["id"])

    employee_one_id, project_one_id = seed_employee(
        app,
        company_id=context["company"]["id"],
        email="worker-one@attendance-company.example.com",
        employee_number="EMP-ATT-101",
        project_code="PRJ-ATT-101",
        project_name="Residence Palmier",
    )
    employee_two_id, project_two_id = seed_employee(
        app,
        company_id=context["company"]["id"],
        email="worker-two@attendance-company.example.com",
        employee_number="EMP-ATT-102",
        project_code="PRJ-ATT-102",
        project_name="Depot Makepe",
    )

    first_record = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_one_id,
            "project_id": project_one_id,
            "attendance_date": "2026-04-08",
            "arrival_time": "07:45",
            "departure_time": "17:20",
        },
    )
    assert first_record.status_code == 201, first_record.get_json()

    second_record = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_one_id,
            "project_id": project_one_id,
            "attendance_date": "2026-04-09",
            "status": "absent",
            "notes": "Absence constatee sur chantier",
        },
    )
    assert second_record.status_code == 201, second_record.get_json()

    third_record = client.post(
        "/api/v1/attendance",
        headers=headers,
        json={
            "user_id": employee_two_id,
            "project_id": project_two_id,
            "attendance_date": "2026-04-09",
            "arrival_time": "08:05",
            "departure_time": "17:10",
        },
    )
    assert third_record.status_code == 201, third_record.get_json()

    summary_response = client.get("/api/v1/attendance/summary", headers=headers)
    assert summary_response.status_code == 200, summary_response.get_json()
    payload = summary_response.get_json()
    by_project = payload["by_project"]

    assert len(by_project) == 2

    project_one_bucket = next(item for item in by_project if item["project_id"] == project_one_id)
    assert project_one_bucket["project"]["name"] == "Residence Palmier"
    assert project_one_bucket["total_records"] == 2
    assert project_one_bucket["employees_tracked"] == 1
    assert project_one_bucket["late_count"] == 1
    assert project_one_bucket["absent_count"] == 1
    assert project_one_bucket["late_minutes_total"] == 5
    assert project_one_bucket["latest_attendance_date"] == "2026-04-09"
    assert len(project_one_bucket["recent_records"]) == 2
    assert project_one_bucket["recent_records"][0]["attendance_date"] == "2026-04-09"
    assert project_one_bucket["recent_records"][0]["user"]["full_name"] == "Marcel Etoa"

    filtered_response = client.get(
        f"/api/v1/attendance/summary?project_id={project_two_id}",
        headers=headers,
    )
    assert filtered_response.status_code == 200, filtered_response.get_json()
    filtered_payload = filtered_response.get_json()
    assert len(filtered_payload["by_project"]) == 1
    assert filtered_payload["by_project"][0]["project_id"] == project_two_id
    assert filtered_payload["summary"]["total_records"] == 1
