from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_worker_only_sees_latest_active_project_scope(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-PROJECT-WORKER-001",
        company_email="contact@worker-project.example.com",
        admin_email="admin@worker-project.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    worker_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "worker.scope@example.com",
            "password": "WorkerScopePass123!",
            "first_name": "Joel",
            "last_name": "Meka",
            "user_type": "employee",
            "employee_number": "EMP-WORKER-SCOPE-001",
            "job_title": "Ouvrier coffrage",
            "department": "Chantier",
            "account_status": "active",
            "operational_profile_code": "ouvrier",
        },
    )
    assert worker_response.status_code == 201, worker_response.get_json()
    worker = worker_response.get_json()["user"]

    first_project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-WORKER-A",
            "name": "Atelier prefabrique A",
            "status": "in_progress",
            "start_date": "2026-04-01",
            "end_date": "2026-05-15",
        },
    )
    assert first_project_response.status_code == 201, first_project_response.get_json()
    first_project = first_project_response.get_json()["project"]

    second_project_response = client.post(
        "/api/v1/projects",
        headers=admin_headers,
        json={
            "code": "PRJ-WORKER-B",
            "name": "Base vie B",
            "status": "in_progress",
            "start_date": "2026-04-10",
            "end_date": "2026-06-10",
        },
    )
    assert second_project_response.status_code == 201, second_project_response.get_json()
    second_project = second_project_response.get_json()["project"]

    first_assignment_response = client.post(
        f"/api/v1/projects/{first_project['id']}/assignments",
        headers=admin_headers,
        json={
            "user_id": worker["id"],
            "project_role": "Coffrage",
            "assignment_mode": "immediate",
            "start_date": "2026-04-01",
        },
    )
    assert first_assignment_response.status_code == 201, first_assignment_response.get_json()

    second_assignment_response = client.post(
        f"/api/v1/projects/{second_project['id']}/assignments",
        headers=admin_headers,
        json={
            "user_id": worker["id"],
            "project_role": "Coffrage",
            "assignment_mode": "immediate",
            "start_date": "2026-04-10",
        },
    )
    assert second_assignment_response.status_code == 201, second_assignment_response.get_json()

    assignments_check_response = client.get(
        f"/api/v1/projects/{first_project['id']}/assignments",
        headers=admin_headers,
    )
    assert assignments_check_response.status_code == 200, assignments_check_response.get_json()
    first_assignment = assignments_check_response.get_json()["items"][0]
    assert first_assignment["is_active"] is False

    worker_login = login(
        client,
        email="worker.scope@example.com",
        password="WorkerScopePass123!",
        company_id=company_id,
    )
    assert worker_login.status_code == 200, worker_login.get_json()
    worker_headers = auth_headers(worker_login.get_json()["access_token"], tenant_id=company_id)

    projects_response = client.get("/api/v1/projects", headers=worker_headers)
    assert projects_response.status_code == 200, projects_response.get_json()
    projects_payload = projects_response.get_json()
    assert projects_payload["pagination"]["total"] == 1
    assert projects_payload["items"][0]["id"] == second_project["id"]

    dashboard_response = client.get("/api/v1/projects/dashboard", headers=worker_headers)
    assert dashboard_response.status_code == 200, dashboard_response.get_json()
    dashboard = dashboard_response.get_json()
    assert dashboard["counts"]["projects_total"] == 1
    assert dashboard["items"][0]["id"] == second_project["id"]

    blocked_workspace_response = client.get(
        f"/api/v1/projects/{first_project['id']}/workspace",
        headers=worker_headers,
    )
    assert blocked_workspace_response.status_code == 403, blocked_workspace_response.get_json()

    allowed_workspace_response = client.get(
        f"/api/v1/projects/{second_project['id']}/workspace",
        headers=worker_headers,
    )
    assert allowed_workspace_response.status_code == 200, allowed_workspace_response.get_json()
    assert allowed_workspace_response.get_json()["project"]["id"] == second_project["id"]
