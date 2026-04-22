from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_job_seeker_can_manage_own_profile_and_apply_to_offer(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-CANDIDATE-001",
        company_email="contact@candidate-company.example.com",
        admin_email="admin@candidate-company.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    offer_response = client.post(
        "/api/v1/recruitment/job-offers",
        headers=admin_headers,
        json={
            "title": "Juriste marches",
            "description": "Controle des pieces, contrats et conformite DAO.",
            "contract_type": "CDI",
            "location": "Douala",
            "status": "published",
        },
    )
    assert offer_response.status_code == 201, offer_response.get_json()
    offer = offer_response.get_json()["job_offer"]

    candidate_response = client.post(
        "/api/v1/users",
        headers=admin_headers,
        json={
            "email": "candidate.selfservice@example.com",
            "password": "CandidatePass123!",
            "first_name": "Sarah",
            "last_name": "Meka",
            "user_type": "job_seeker",
            "operational_profile_code": "candidat_job_seeker",
            "account_status": "active",
        },
    )
    assert candidate_response.status_code == 201, candidate_response.get_json()
    candidate_user = candidate_response.get_json()["user"]
    assert candidate_user["operational_profile_code"] == "candidat_job_seeker"
    assert candidate_user["user_type"] == "job_seeker"

    login_response = login(
        client,
        email="candidate.selfservice@example.com",
        password="CandidatePass123!",
        company_id=company_id,
    )
    assert login_response.status_code == 200, login_response.get_json()
    candidate_payload = login_response.get_json()
    candidate_headers = auth_headers(candidate_payload["access_token"], tenant_id=company_id)

    me_response = client.get("/api/v1/auth/me", headers=candidate_headers)
    assert me_response.status_code == 200, me_response.get_json()
    me_payload = me_response.get_json()
    assert me_payload["operational_profile_code"] == "candidat_job_seeker"
    assert me_payload["user_type"] == "job_seeker"
    assert "recruitment.read" in me_payload["permissions"]
    assert "chat.read" in me_payload["permissions"]
    assert "chat.manage" in me_payload["permissions"]

    chat_status_response = client.get("/api/v1/chat/status", headers=candidate_headers)
    assert chat_status_response.status_code == 200, chat_status_response.get_json()
    assert chat_status_response.get_json()["module"] == "chat"

    my_profile_response = client.get("/api/v1/recruitment/candidate-profiles/me", headers=candidate_headers)
    assert my_profile_response.status_code == 200, my_profile_response.get_json()
    assert my_profile_response.get_json()["candidate"] is None

    save_profile_response = client.put(
        "/api/v1/recruitment/candidate-profiles/me",
        headers=candidate_headers,
        json={
            "desired_position": "Juriste marches",
            "years_experience": 5,
            "phone": "+237690001122",
            "city": "Douala",
            "availability_status": "immediate",
            "cv_url": "https://example.com/cv/sarah-meka.pdf",
            "skills_summary": "Conformite, contrats, preuves documentaires",
        },
    )
    assert save_profile_response.status_code == 200, save_profile_response.get_json()
    candidate_profile = save_profile_response.get_json()["candidate"]
    assert candidate_profile["desired_position"] == "Juriste marches"
    assert candidate_profile["years_experience"] == 5
    assert candidate_profile["profile_score"] > 0

    apply_response = client.post(
        f"/api/v1/recruitment/job-offers/{offer['id']}/apply",
        headers=candidate_headers,
        json={},
    )
    assert apply_response.status_code == 201, apply_response.get_json()
    application = apply_response.get_json()["application"]
    assert application["job_offer_id"] == offer["id"]
    assert application["status"] == "submitted"

    my_applications_response = client.get("/api/v1/recruitment/applications/me", headers=candidate_headers)
    assert my_applications_response.status_code == 200, my_applications_response.get_json()
    payload = my_applications_response.get_json()
    assert payload["pagination"]["total"] == 1
    assert payload["items"][0]["job_offer"]["id"] == offer["id"]
    assert payload["items"][0]["job_offer"]["title"] == "Juriste marches"
    assert payload["items"][0]["status"] == "submitted"
