import io
from datetime import date, datetime, timedelta, timezone

from app.extensions import db
from app.models.attendance import AttendanceRecord
from app.models.chat import ChatConversation, ChatMessage, ChatParticipant
from app.models.payroll import PayrollLeaveRequest, PayrollPeriod, PayrollRun, PayrollRunItem
from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_users_list_supports_personnel_filters(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-FILTERS-001",
        company_email="contact@users-filters.example.com",
        admin_email="admin@users-filters.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    first_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "adele.nga@example.com",
            "password": "SecurePass123!",
            "first_name": "Adele",
            "last_name": "Nga",
            "user_type": "employee",
            "employee_number": "EMP-001",
            "job_title": "Conducteur travaux",
            "department": "Direction technique",
            "contract_type": "CDI",
            "hire_date": "2026-03-10",
        },
    )
    assert first_response.status_code == 201, first_response.get_json()

    second_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "brice.eko@example.com",
            "password": "SecurePass123!",
            "first_name": "Brice",
            "last_name": "Eko",
            "user_type": "employee",
            "employee_number": "EMP-002",
            "job_title": "Comptable",
            "department": "Direction financiere",
            "contract_type": "CDD",
            "hire_date": "2026-02-01",
        },
    )
    assert second_response.status_code == 201, second_response.get_json()

    filtered_response = client.get(
        "/api/v1/users?include_inactive=true&department=Direction%20technique&contract_type=CDI",
        headers=headers,
    )
    assert filtered_response.status_code == 200, filtered_response.get_json()
    filtered_items = filtered_response.get_json()["items"]
    assert len(filtered_items) == 1
    assert filtered_items[0]["email"] == "adele.nga@example.com"
    assert filtered_items[0]["employee_number"] == "EMP-001"

    search_response = client.get(
        "/api/v1/users?include_inactive=true&search=EMP-002",
        headers=headers,
    )
    assert search_response.status_code == 200, search_response.get_json()
    search_items = search_response.get_json()["items"]
    assert len(search_items) == 1
    assert search_items[0]["email"] == "brice.eko@example.com"


def test_users_dashboard_returns_personnel_breakdowns(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-DASHBOARD-001",
        company_email="contact@users-dashboard.example.com",
        admin_email="admin@users-dashboard.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)
    admin_user_id = context["company_user"]["id"]

    created_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "celine.meya@example.com",
            "password": "SecurePass123!",
            "first_name": "Celine",
            "last_name": "Meya",
            "user_type": "employee",
            "employee_number": "EMP-100",
            "job_title": "Ingenieur travaux",
            "department": "Direction technique",
            "contract_type": "CDI",
            "hire_date": "2026-03-25",
            "hierarchy_level": 2,
        },
    )
    assert created_response.status_code == 201, created_response.get_json()
    created_user = created_response.get_json()["user"]

    incomplete_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "david.nouma@example.com",
            "password": "SecurePass123!",
            "first_name": "David",
            "last_name": "Nouma",
            "user_type": "employee",
        },
    )
    assert incomplete_response.status_code == 201, incomplete_response.get_json()

    project_urgent_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "PRJ-URGENT-001",
            "name": "Projet urgent lot A",
            "status": "in_progress",
            "progress_percent": 45,
            "end_date": (date.today() - timedelta(days=5)).isoformat(),
            "budget_amount": 18000000,
        },
    )
    assert project_urgent_response.status_code == 201, project_urgent_response.get_json()

    project_normal_response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "code": "PRJ-NORMAL-001",
            "name": "Projet standard lot B",
            "status": "in_progress",
            "progress_percent": 70,
            "end_date": (date.today() + timedelta(days=30)).isoformat(),
            "budget_amount": 9000000,
        },
    )
    assert project_normal_response.status_code == 201, project_normal_response.get_json()

    suspend_response = client.patch(
        f"/api/v1/users/{created_user['id']}/status",
        headers=headers,
        json={"account_status": "suspended", "reason": "Test suspension"},
    )
    assert suspend_response.status_code == 200, suspend_response.get_json()

    with client.application.app_context():
        db.session.add_all(
            [
                AttendanceRecord(
                    company_id=company_id,
                    user_id=created_user["id"],
                    attendance_date=date.today() - timedelta(days=2),
                    status="late",
                    minutes_late=45,
                    source="manager",
                    notes="Retard chantier nord",
                    created_by_user_id=admin_user_id,
                    updated_by_user_id=admin_user_id,
                    validated_by_user_id=admin_user_id,
                ),
                AttendanceRecord(
                    company_id=company_id,
                    user_id=created_user["id"],
                    attendance_date=date.today() - timedelta(days=1),
                    status="absent",
                    source="manager",
                    notes="Absence non justifiee",
                    created_by_user_id=admin_user_id,
                    updated_by_user_id=admin_user_id,
                    validated_by_user_id=admin_user_id,
                ),
                AttendanceRecord(
                    company_id=company_id,
                    user_id=created_user["id"],
                    attendance_date=date.today() - timedelta(days=4),
                    status="overtime",
                    overtime_minutes=120,
                    source="manager",
                    notes="Cloture de chantier",
                    created_by_user_id=admin_user_id,
                    updated_by_user_id=admin_user_id,
                    validated_by_user_id=admin_user_id,
                ),
            ]
        )
        db.session.add(
            PayrollLeaveRequest(
                company_id=company_id,
                user_id=created_user["id"],
                type="paid_leave",
                title="Conge equipe lot A",
                start_date=date.today() + timedelta(days=2),
                end_date=date.today() + timedelta(days=4),
                days_requested=3,
                reason="Repos apres intervention",
                status="in_review",
                reviewed_by_user_id=admin_user_id,
            )
        )
        db.session.add(
            PayrollLeaveRequest(
                company_id=company_id,
                user_id=created_user["id"],
                type="paid_leave",
                title="Conge valide mars",
                start_date=date.today() - timedelta(days=10),
                end_date=date.today() - timedelta(days=8),
                days_requested=3,
                reason="Conge approuve",
                status="approved",
                reviewed_by_user_id=admin_user_id,
                reviewed_at=datetime.now(timezone.utc) - timedelta(days=3),
            )
        )
        db.session.commit()

    dashboard_response = client.get("/api/v1/users/dashboard", headers=headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()

    assert dashboard["users"]["by_department"]["Direction technique"] == 1
    assert dashboard["users"]["by_contract_type"]["CDI"] == 1
    assert dashboard["users"]["by_account_status"]["suspended"] >= 1
    assert dashboard["personnel"]["managers"] >= 1
    assert dashboard["personnel"]["incomplete_profiles"] >= 1
    assert dashboard["projects"]["total"] >= 2
    assert dashboard["projects"]["in_progress"] >= 2
    assert dashboard["projects"]["delayed"] >= 1
    assert dashboard["projects"]["spotlight"]
    assert dashboard["projects"]["spotlight"][0]["code"] == "PRJ-URGENT-001"
    assert dashboard["projects"]["spotlight"][0]["is_delayed"] is True
    assert dashboard["projects"]["spotlight"][0]["days_to_deadline"] <= 0
    assert dashboard["attendance"]["tracked_records"] == 3
    assert dashboard["attendance"]["employees_tracked"] == 1
    assert dashboard["attendance"]["late_records"] == 1
    assert dashboard["attendance"]["unjustified_absent_records"] == 1
    assert dashboard["attendance"]["overtime_records"] == 1
    assert dashboard["leave_requests"]["pending_requests"] == 1
    assert dashboard["leave_requests"]["pending_days_total"] == 3.0
    assert dashboard["leave_requests"]["pending_by_type"]["paid_leave"] == 1
    assert dashboard["leave_requests"]["approved_last_30d"] == 1

    alert_types = {alert["type"] for alert in dashboard["alerts"]}
    assert "suspended_users" in alert_types
    assert "incomplete_profiles" in alert_types
    assert "pending_leave_requests" in alert_types
    assert "attendance_absences" in alert_types
    assert "attendance_lateness" in alert_types


def test_organization_units_are_seeded_from_operational_profiles(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-ORG-001",
        company_email="contact@users-organization.example.com",
        admin_email="admin@users-organization.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    response = client.get("/api/v1/users/organization-units", headers=headers)
    assert response.status_code == 200, response.get_json()
    payload = response.get_json()
    assert payload["count"] >= 8

    items_by_code = {row["code"]: row for row in payload["items"]}
    assert {"DIR-GEN", "DIR-TECH", "DIR-DAF", "DIR-LOG", "SRV-COMPTA", "SRV-STOCK"}.issubset(items_by_code.keys())
    assert items_by_code["DIR-TECH"]["parent_unit"]["code"] == "DIR-GEN"
    assert items_by_code["DIR-DAF"]["parent_unit"]["code"] == "DIR-GEN"
    assert items_by_code["SRV-COMPTA"]["parent_unit"]["code"] == "DIR-DAF"


def test_user_update_supports_primary_organization_assignment_changes(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-ORG-EDIT-001",
        company_email="contact@users-organization-edit.example.com",
        admin_email="admin@users-organization-edit.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    units_response = client.get("/api/v1/users/organization-units", headers=headers)
    assert units_response.status_code == 200, units_response.get_json()
    units_by_code = {row["code"]: row for row in units_response.get_json()["items"]}

    create_user_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "magasinier@users-organization-edit.example.com",
            "password": "SecurePass123!",
            "first_name": "Luc",
            "last_name": "Bika",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
        },
    )
    assert create_user_response.status_code == 201, create_user_response.get_json()
    created_user = create_user_response.get_json()["user"]
    assert created_user["organization_unit"]["code"] == "SRV-STOCK"

    create_unit_response = client.post(
        "/api/v1/users/organization-units",
        headers=headers,
        json={
            "code": "SRV-PARC",
            "name": "Parc et equipements",
            "unit_type": "service",
            "parent_unit_id": units_by_code["DIR-LOG"]["id"],
        },
    )
    assert create_unit_response.status_code == 201, create_unit_response.get_json()
    custom_unit = create_unit_response.get_json()["organization_unit"]

    update_user_response = client.patch(
        f"/api/v1/users/{created_user['id']}",
        headers=headers,
        json={
            "job_title": "Chef parc logistique",
            "organization_unit_id": custom_unit["id"],
        },
    )
    assert update_user_response.status_code == 200, update_user_response.get_json()
    updated_user = update_user_response.get_json()["user"]
    assert updated_user["job_title"] == "Chef parc logistique"
    assert updated_user["organization_unit"]["id"] == custom_unit["id"]
    assert updated_user["department"] == "Parc et equipements"

    filtered_response = client.get(
        f"/api/v1/users?include_inactive=true&organization_unit_id={custom_unit['id']}",
        headers=headers,
    )
    assert filtered_response.status_code == 200, filtered_response.get_json()
    filtered_items = filtered_response.get_json()["items"]
    assert len(filtered_items) == 1
    assert filtered_items[0]["id"] == created_user["id"]


def test_employee_can_update_self_service_profile_and_payroll_contact_fields(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-SELF-PROFILE-001",
        company_email="contact@users-self-profile.example.com",
        admin_email="admin@users-self-profile.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "paul.selfservice@example.com",
            "password": "SecurePass123!",
            "first_name": "Paul",
            "last_name": "Biko",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()

    employee_login = login(
        client,
        email="paul.selfservice@example.com",
        password="SecurePass123!",
        company_id=company_id,
    )
    assert employee_login.status_code == 200, employee_login.get_json()
    employee_headers = auth_headers(employee_login.get_json()["access_token"], tenant_id=company_id)

    update_response = client.patch(
        "/api/v1/users/me/profile",
        headers=employee_headers,
        json={
            "first_name": "Paulin",
            "last_name": "Bikoi",
            "phone": "+237699000111",
            "preferred_language": "en",
            "profile_photo_url": "https://example.com/photos/paulin.jpg",
            "identity_document_type": "cni",
            "identity_document_number": "CNI-123456",
            "identity_issue_date": "2024-06-18",
            "identity_document_url": "https://example.com/docs/cni-paulin.pdf",
            "taxpayer_number": "M012345678901A",
            "cv_url": "https://example.com/cv/paulin-bikoi.pdf",
            "chat_notifications_enabled": False,
            "payslip_notifications_enabled": True,
            "cnps_number": "CNPS-88991",
            "bank_account_number": "001122334455",
            "bank_name": "BICEC Douala Bonanjo",
        },
    )
    assert update_response.status_code == 200, update_response.get_json()

    profile_response = client.get("/api/v1/users/me/profile", headers=employee_headers)
    assert profile_response.status_code == 200, profile_response.get_json()
    profile_payload = profile_response.get_json()

    assert profile_payload["user"]["first_name"] == "Paulin"
    assert profile_payload["user"]["last_name"] == "Bikoi"
    assert profile_payload["user"]["phone"] == "+237699000111"
    assert profile_payload["user"]["preferred_language"] == "en"
    assert profile_payload["user"]["identity_document_type"] == "cni"
    assert profile_payload["user"]["identity_document_number"] == "CNI-123456"
    assert profile_payload["user"]["identity_issue_date"] == "2024-06-18"
    assert profile_payload["user"]["identity_document_url"] == "https://example.com/docs/cni-paulin.pdf"
    assert profile_payload["user"]["taxpayer_number"] == "M012345678901A"
    assert profile_payload["user"]["cv_url"] == "https://example.com/cv/paulin-bikoi.pdf"
    assert profile_payload["user"]["chat_notifications_enabled"] is False
    assert profile_payload["user"]["payslip_notifications_enabled"] is True
    assert profile_payload["payroll_profile"]["cnps_number"] == "CNPS-88991"
    assert profile_payload["payroll_profile"]["bank_account_number"] == "001122334455"
    assert profile_payload["payroll_profile"]["bank_name"] == "BICEC Douala Bonanjo"

    me_response = client.get("/api/v1/auth/me", headers=employee_headers)
    assert me_response.status_code == 200, me_response.get_json()
    me_payload = me_response.get_json()
    assert me_payload["first_name"] == "Paulin"
    assert me_payload["last_name"] == "Bikoi"
    assert me_payload["preferred_language"] == "en"


def test_employee_profile_update_accepts_blank_optional_fields(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-SELFSERVICE-BLANKS-001",
        company_email="contact@users-selfservice-blanks.example.com",
        admin_email="admin@users-selfservice-blanks.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "blank.profile@example.com",
            "password": "SecurePass123!",
            "first_name": "Blank",
            "last_name": "Profile",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()

    employee_login = login(
        client,
        email="blank.profile@example.com",
        password="SecurePass123!",
        company_id=company_id,
    )
    assert employee_login.status_code == 200, employee_login.get_json()
    employee_headers = auth_headers(employee_login.get_json()["access_token"], tenant_id=company_id)

    update_response = client.patch(
        "/api/v1/users/me/profile",
        headers=employee_headers,
        json={
            "gender": "",
            "birth_date": "",
            "address_line": "",
            "identity_document_number": "",
            "identity_issue_date": "",
            "taxpayer_number": "",
            "cnps_number": "",
            "bank_account_number": "",
            "bank_name": "",
            "payment_method": "",
        },
    )
    assert update_response.status_code == 200, update_response.get_json()

    payload = update_response.get_json()["data"]
    assert payload["user"]["gender"] is None
    assert payload["user"]["birth_date"] is None
    assert payload["user"]["address_line"] is None
    assert payload["user"]["identity_document_number"] is None
    assert payload["user"]["identity_issue_date"] is None
    assert payload["user"]["taxpayer_number"] is None
    assert payload["payroll_profile"]["cnps_number"] is None
    assert payload["payroll_profile"]["bank_account_number"] is None
    assert payload["payroll_profile"]["bank_name"] is None
    assert payload["payroll_profile"]["payment_method"] == "bank_transfer"


def test_company_admin_can_get_and_patch_allowed_self_profile_fields(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-ADMIN-PROFILE-001",
        company_email="contact@users-admin-profile.example.com",
        admin_email="admin@users-admin-profile.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    profile_response = client.get("/api/v1/users/me/profile", headers=headers)
    assert profile_response.status_code == 200, profile_response.get_json()
    profile_payload = profile_response.get_json()
    assert profile_payload["user"]["user_type"] == "company_admin"

    update_response = client.patch(
        "/api/v1/users/me/profile",
        headers=headers,
        json={
            "first_name": "Alice",
            "last_name": "Pilotage",
            "phone": "+237699001122",
            "address_line": "Bonanjo, Douala",
            "preferred_language": "en",
            "identity_document_type": "passport",
            "identity_document_number": "PA-778899",
            "identity_issue_date": "2024-04-18",
            "taxpayer_number": "M012345678901B",
            "chat_notifications_enabled": False,
            "payslip_notifications_enabled": True,
        },
    )
    assert update_response.status_code == 200, update_response.get_json()
    updated_payload = update_response.get_json()["data"]
    assert updated_payload["user"]["first_name"] == "Alice"
    assert updated_payload["user"]["last_name"] == "Pilotage"
    assert updated_payload["user"]["phone"] == "+237699001122"
    assert updated_payload["user"]["preferred_language"] == "en"
    assert updated_payload["user"]["identity_document_type"] == "passport"
    assert updated_payload["user"]["identity_document_number"] == "PA-778899"
    assert updated_payload["user"]["identity_issue_date"] == "2024-04-18"
    assert updated_payload["user"]["chat_notifications_enabled"] is False
    assert updated_payload["user"]["payslip_notifications_enabled"] is True


def test_company_admin_profile_update_rejects_payroll_fields(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-ADMIN-PROFILE-002",
        company_email="contact@users-admin-restricted.example.com",
        admin_email="admin@users-admin-restricted.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    response = client.patch(
        "/api/v1/users/me/profile",
        headers=headers,
        json={
            "cnps_number": "CNPS-ADMIN-001",
            "bank_account_number": "0011223344",
            "bank_name": "BICEC",
            "payment_method": "cash",
        },
    )
    assert response.status_code == 400, response.get_json()
    payload = response.get_json()
    assert "not editable for company_admin" in payload["message"]
    assert "cnps_number" in payload["message"]
    assert "bank_account_number" in payload["message"]
    assert "bank_name" in payload["message"]
    assert "payment_method" in payload["message"]


def test_company_admin_can_upload_and_download_self_profile_asset(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-ADMIN-PROFILE-003",
        company_email="contact@users-admin-assets.example.com",
        admin_email="admin@users-admin-assets.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    upload_response = client.post(
        "/api/v1/users/me/profile/uploads/profile_photo",
        headers=headers,
        data={"file": (io.BytesIO(b"\x89PNG\r\n\x1a\nadmin-photo"), "admin-photo.png")},
        content_type="multipart/form-data",
    )
    assert upload_response.status_code == 201, upload_response.get_json()
    upload_payload = upload_response.get_json()
    assert upload_payload["upload"]["asset_kind"] == "profile_photo"
    assert upload_payload["upload"]["filename"] == "admin-photo.png"
    assert upload_payload["upload"]["download_url"] == "/api/v1/users/me/profile/assets/profile_photo"
    assert upload_payload["data"]["uploads"]["profile_photo"]["available"] is True

    download_response = client.get("/api/v1/users/me/profile/assets/profile_photo", headers=headers)
    assert download_response.status_code == 200
    assert download_response.headers["Content-Type"].startswith("image/")


def test_user_update_supports_sensitive_hr_lifecycle_fields(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-HR-FILE-001",
        company_email="contact@users-hr-file.example.com",
        admin_email="admin@users-hr-file.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "hr.file.employee@example.com",
            "password": "SecurePass123!",
            "first_name": "Nadine",
            "last_name": "Mbida",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
            "employee_number": "EMP-HR-001",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    employee = create_response.get_json()["user"]

    update_response = client.patch(
        f"/api/v1/users/{employee['id']}",
        headers=headers,
        json={
            "hire_date": "2026-03-12",
            "contract_type": "CDI",
            "base_salary": "325000",
            "hierarchy_level": 2,
            "employment_end_date": "2026-12-31",
            "exit_reason": "Fin de mission chantier",
            "identity_document_type": "cni",
            "identity_document_number": "CNI-HR-7788",
            "identity_issue_date": "2024-01-20",
            "taxpayer_number": "M012345678900X",
            "identity_document_url": "https://example.com/hr/cni.pdf",
            "cv_url": "https://example.com/hr/cv.pdf",
        },
    )
    assert update_response.status_code == 200, update_response.get_json()
    updated_user = update_response.get_json()["user"]
    assert updated_user["hire_date"] == "2026-03-12"
    assert updated_user["contract_type"] == "CDI"
    assert updated_user["base_salary"] == 325000.0
    assert updated_user["hierarchy_level"] == 2
    assert updated_user["employment_end_date"] == "2026-12-31"
    assert updated_user["exit_reason"] == "Fin de mission chantier"
    assert updated_user["identity_document_type"] == "cni"
    assert updated_user["identity_document_number"] == "CNI-HR-7788"
    assert updated_user["identity_issue_date"] == "2024-01-20"
    assert updated_user["taxpayer_number"] == "M012345678900X"
    assert updated_user["identity_document_url"] == "https://example.com/hr/cni.pdf"
    assert updated_user["cv_url"] == "https://example.com/hr/cv.pdf"


def test_admin_can_upload_and_download_collaborator_hr_assets(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-HR-ASSET-001",
        company_email="contact@users-hr-assets.example.com",
        admin_email="admin@users-hr-assets.example.com",
    )
    company_id = context["company"]["company_id"]
    headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=headers,
        json={
            "email": "hr.asset.employee@example.com",
            "password": "SecurePass123!",
            "first_name": "Samuel",
            "last_name": "Ntep",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
            "employee_number": "EMP-HR-002",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    employee = create_response.get_json()["user"]

    upload_response = client.post(
        f"/api/v1/users/{employee['id']}/profile-assets/identity_document",
        headers=headers,
        data={"file": (io.BytesIO(b"%PDF-1.4 hr identity"), "identity.pdf")},
        content_type="multipart/form-data",
    )
    assert upload_response.status_code == 201, upload_response.get_json()
    upload_payload = upload_response.get_json()
    assert upload_payload["upload"]["asset_kind"] == "identity_document"
    assert upload_payload["upload"]["filename"] == "identity.pdf"
    assert upload_payload["upload"]["download_url"] == f"/api/v1/users/{employee['id']}/profile-assets/identity_document"
    assert upload_payload["user"]["identity_document_url"]

    download_response = client.get(
        f"/api/v1/users/{employee['id']}/profile-assets/identity_document",
        headers=headers,
    )
    assert download_response.status_code == 200
    assert download_response.headers["Content-Type"].startswith("application/pdf")


def test_employee_notification_feed_includes_unread_messages_and_new_payslips(client, app):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-USERS-NOTIFS-001",
        company_email="contact@users-notifications.example.com",
        admin_email="admin@users-notifications.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_user_id = context["company_user"]["id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    create_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "marie.notifications@example.com",
            "password": "SecurePass123!",
            "first_name": "Marie",
            "last_name": "Nkoa",
            "user_type": "employee",
            "operational_profile_code": "magasinier",
            "employee_number": "EMP-NOTIF-001",
        },
    )
    assert create_response.status_code == 201, create_response.get_json()
    employee = create_response.get_json()["user"]

    with app.app_context():
        conversation = ChatConversation(company_id=company_id, type="private", created_by_user_id=admin_user_id)
        db.session.add(conversation)
        db.session.flush()

        db.session.add(ChatParticipant(company_id=company_id, conversation_id=conversation.id, user_id=admin_user_id))
        db.session.add(ChatParticipant(company_id=company_id, conversation_id=conversation.id, user_id=employee["id"]))
        db.session.add(
            ChatMessage(
                company_id=company_id,
                conversation_id=conversation.id,
                sender_user_id=admin_user_id,
                message_type="text",
                content="Nouveau message pour vous",
            )
        )

        payroll_period = PayrollPeriod(
            company_id=company_id,
            period_key="2026-04",
            label="Avril 2026",
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
            payment_date=date(2026, 4, 30),
            status="generated",
            created_by_user_id=admin_user_id,
        )
        db.session.add(payroll_period)
        db.session.flush()

        payroll_run = PayrollRun(
            company_id=company_id,
            payroll_period_id=payroll_period.id,
            generated_by_user_id=admin_user_id,
            run_reference="PAY-2026-04-TEST",
            employee_count=1,
            total_brut=500000,
            total_net=420000,
            total_patronal=80000,
            status="generated",
        )
        db.session.add(payroll_run)
        db.session.flush()

        db.session.add(
            PayrollRunItem(
                company_id=company_id,
                payroll_run_id=payroll_run.id,
                user_id=employee["id"],
                employee_number="EMP-NOTIF-001",
                employee_name="Marie Nkoa",
                period_key="2026-04",
                salaire_brut=500000,
                total_retenues=80000,
                total_patronal=80000,
                net_a_payer=420000,
                pdf_path="app/modules/payroll/output/companies/1/bulletins/2026-04/bulletin_EMP-NOTIF-001_2026_04.pdf",
            )
        )
        db.session.commit()

    employee_login = login(
        client,
        email="marie.notifications@example.com",
        password="SecurePass123!",
        company_id=company_id,
    )
    assert employee_login.status_code == 200, employee_login.get_json()
    employee_headers = auth_headers(employee_login.get_json()["access_token"], tenant_id=company_id)

    notifications_response = client.get("/api/v1/users/me/notifications", headers=employee_headers)
    assert notifications_response.status_code == 200, notifications_response.get_json()
    notifications_payload = notifications_response.get_json()

    assert notifications_payload["chat"]["total_unread"] == 1
    assert notifications_payload["payslips"]["new_count"] == 1
    assert notifications_payload["total_active"] == 2
    assert {item["kind"] for item in notifications_payload["items"]} == {"chat_message", "payslip"}

    mark_seen_response = client.post(
        "/api/v1/users/me/notifications/mark-seen",
        headers=employee_headers,
        json={"categories": ["payslips"]},
    )
    assert mark_seen_response.status_code == 200, mark_seen_response.get_json()
    mark_seen_payload = mark_seen_response.get_json()["data"]
    assert mark_seen_payload["chat"]["total_unread"] == 1
    assert mark_seen_payload["payslips"]["new_count"] == 0
    assert mark_seen_payload["total_active"] == 1
