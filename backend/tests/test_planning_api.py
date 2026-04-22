from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_employee_can_manage_agenda_and_complete_own_project_tasks(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PLANNING-EMPLOYEE-001",
        company_email="contact@planning-employee.example.com",
        admin_email="admin@planning-employee.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    employee_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "planning.employee@example.com",
            "password": "EmployeePass123!",
            "first_name": "Noah",
            "last_name": "Essomba",
            "user_type": "employee",
            "employee_number": "EMP-PLAN-001",
            "job_title": "Technicien chantier",
            "department": "Operations",
            "account_status": "active",
            "operational_profile_code": "ouvrier",
        },
    )
    assert employee_response.status_code == 201, employee_response.get_json()
    employee = employee_response.get_json()["user"]

    project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-PLAN-001",
            "name": "Base vie Bonamoussadi",
            "status": "in_progress",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
        },
    )
    assert project_response.status_code == 201, project_response.get_json()
    project = project_response.get_json()["project"]

    assignment_response = client.post(
        f"/api/v1/projects/{project['id']}/assignments",
        headers=admin_headers,
        json={
            "user_id": employee["id"],
            "project_role": "Electricien",
            "assignment_mode": "immediate",
            "start_date": "2026-04-01",
        },
    )
    assert assignment_response.status_code == 201, assignment_response.get_json()

    task_response = client.post(
        f"/api/v1/projects/{project['id']}/tasks",
        headers=admin_headers,
        json={
            "title": "Poser le reseau principal",
            "description": "Installation du reseau avant controle technique",
            "assigned_to_user_id": employee["id"],
            "responsible_user_id": employee["id"],
            "start_date": "2026-04-06",
            "due_date": "2026-04-08",
            "priority": "high",
            "status": "in_progress",
        },
    )
    assert task_response.status_code == 201, task_response.get_json()
    task = task_response.get_json()["task"]

    employee_login = login(
        client,
        email="planning.employee@example.com",
        password="EmployeePass123!",
        company_id=company_id,
    )
    assert employee_login.status_code == 200, employee_login.get_json()
    employee_headers = auth_headers(employee_login.get_json()["access_token"], tenant_id=company_id)

    status_response = client.get("/api/v1/planning/status", headers=employee_headers)
    assert status_response.status_code == 200, status_response.get_json()
    assert status_response.get_json()["module"] == "planning"

    overview_response = client.get("/api/v1/planning/overview", headers=employee_headers)
    assert overview_response.status_code == 200, overview_response.get_json()
    overview = overview_response.get_json()
    assert overview["permissions"]["can_read_projects"] is True
    assert overview["permissions"]["can_manage_projects"] is False
    assert len(overview["my_tasks"]) == 1
    assert overview["my_tasks"][0]["id"] == task["id"]
    assert overview["my_tasks"][0]["can_update"] is True
    assert len(overview["projects"]) == 1
    assert overview["projects"][0]["open_task_count"] >= 1

    create_entry_response = client.post(
        "/api/v1/planning/agenda",
        headers=employee_headers,
        json={
            "title": "Point equipe chantier",
            "category": "meeting",
            "location": "Base vie",
            "description": "Preparation du point journalier",
            "start_at": "2026-04-06T07:30:00+00:00",
            "end_at": "2026-04-06T08:00:00+00:00",
        },
    )
    assert create_entry_response.status_code == 201, create_entry_response.get_json()
    entry = create_entry_response.get_json()["entry"]
    assert entry["title"] == "Point equipe chantier"
    assert entry["category"] == "meeting"

    list_entry_response = client.get("/api/v1/planning/agenda", headers=employee_headers)
    assert list_entry_response.status_code == 200, list_entry_response.get_json()
    assert list_entry_response.get_json()["count"] == 1

    update_entry_response = client.patch(
        f"/api/v1/planning/agenda/{entry['id']}",
        headers=employee_headers,
        json={
            "is_completed": True,
            "location": "Salle de coordination",
        },
    )
    assert update_entry_response.status_code == 200, update_entry_response.get_json()
    updated_entry = update_entry_response.get_json()["entry"]
    assert updated_entry["is_completed"] is True
    assert updated_entry["location"] == "Salle de coordination"

    complete_task_response = client.patch(
        f"/api/v1/planning/tasks/{task['id']}/status",
        headers=employee_headers,
        json={"status": "completed"},
    )
    assert complete_task_response.status_code == 200, complete_task_response.get_json()
    completed_task = complete_task_response.get_json()["task"]
    assert completed_task["status"] == "completed"
    assert completed_task["progress_percent"] == 100.0

    delete_entry_response = client.delete(f"/api/v1/planning/agenda/{entry['id']}", headers=employee_headers)
    assert delete_entry_response.status_code == 200, delete_entry_response.get_json()


def test_job_seeker_can_use_personal_agenda_even_without_project_permissions(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PLANNING-CANDIDATE-001",
        company_email="contact@planning-candidate.example.com",
        admin_email="admin@planning-candidate.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    candidate_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "planning.candidate@example.com",
            "password": "CandidatePass123!",
            "first_name": "Mireille",
            "last_name": "Nkoa",
            "user_type": "job_seeker",
            "account_status": "active",
            "operational_profile_code": "candidat_job_seeker",
        },
    )
    assert candidate_response.status_code == 201, candidate_response.get_json()

    candidate_login = login(
        client,
        email="planning.candidate@example.com",
        password="CandidatePass123!",
        company_id=company_id,
    )
    assert candidate_login.status_code == 200, candidate_login.get_json()
    candidate_headers = auth_headers(candidate_login.get_json()["access_token"], tenant_id=company_id)

    overview_response = client.get("/api/v1/planning/overview", headers=candidate_headers)
    assert overview_response.status_code == 200, overview_response.get_json()
    overview = overview_response.get_json()
    assert overview["permissions"]["can_read_projects"] is False
    assert overview["my_tasks"] == []
    assert overview["projects"] == []

    create_entry_response = client.post(
        "/api/v1/planning/agenda",
        headers=candidate_headers,
        json={
            "title": "Relance candidature",
            "category": "follow_up",
            "start_at": "2026-04-10T09:00:00+00:00",
            "end_at": "2026-04-10T09:30:00+00:00",
            "description": "Appel de suivi RH",
        },
    )
    assert create_entry_response.status_code == 201, create_entry_response.get_json()
    entry = create_entry_response.get_json()["entry"]
    assert entry["title"] == "Relance candidature"

    agenda_response = client.get("/api/v1/planning/agenda", headers=candidate_headers)
    assert agenda_response.status_code == 200, agenda_response.get_json()
    assert agenda_response.get_json()["count"] == 1
