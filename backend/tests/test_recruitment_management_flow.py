from test_v1_critical_flows import auth_headers, create_approved_company_context, login


def test_company_can_review_applications_and_matches_with_candidate_context(client):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-RECRUITMENT-REVIEW-001",
        company_email="contact@recruitment-review.example.com",
        admin_email="admin@recruitment-review.example.com",
    )
    company_id = context["company"]["company_id"]
    admin_headers = auth_headers(context["company_access_token"], tenant_id=company_id)

    offer_response = client.post(
        "/api/v1/recruitment/job-offers",
        headers=admin_headers,
        json={
            "title": "Conducteur travaux",
            "description": "Suivi chantier, coordination sous-traitants et reporting.",
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
            "email": "candidate.review@example.com",
            "password": "CandidatePass123!",
            "first_name": "Sarah",
            "last_name": "Meka",
            "user_type": "job_seeker",
            "operational_profile_code": "candidat_job_seeker",
            "account_status": "active",
        },
    )
    assert candidate_response.status_code == 201, candidate_response.get_json()

    login_response = login(
        client,
        email="candidate.review@example.com",
        password="CandidatePass123!",
        company_id=company_id,
    )
    assert login_response.status_code == 200, login_response.get_json()
    candidate_headers = auth_headers(login_response.get_json()["access_token"], tenant_id=company_id)

    save_profile_response = client.put(
        "/api/v1/recruitment/candidate-profiles/me",
        headers=candidate_headers,
        json={
            "desired_position": "Conducteur travaux",
            "years_experience": 6,
            "phone": "+237690001122",
            "city": "Douala",
            "availability_status": "immediate",
            "cv_url": "https://example.com/cv/sarah-meka.pdf",
            "skills_summary": "Coordination chantier, suivi budget et conformite execution",
        },
    )
    assert save_profile_response.status_code == 200, save_profile_response.get_json()
    candidate_profile = save_profile_response.get_json()["candidate"]

    apply_response = client.post(
        f"/api/v1/recruitment/job-offers/{offer['id']}/apply",
        headers=candidate_headers,
        json={},
    )
    assert apply_response.status_code == 201, apply_response.get_json()
    application = apply_response.get_json()["application"]

    applications_response = client.get(
        f"/api/v1/recruitment/applications?job_offer_id={offer['id']}",
        headers=admin_headers,
    )
    assert applications_response.status_code == 200, applications_response.get_json()
    applications_payload = applications_response.get_json()
    assert applications_payload["pagination"]["total"] == 1
    application_row = applications_payload["items"][0]
    assert application_row["id"] == application["id"]
    assert application_row["candidate"]["id"] == candidate_profile["id"]
    assert application_row["candidate"]["first_name"] == "Sarah"
    assert application_row["candidate"]["desired_position"] == "Conducteur travaux"
    assert application_row["job_offer"]["id"] == offer["id"]
    assert application_row["job_offer"]["title"] == "Conducteur travaux"

    generate_matches_response = client.post(
        f"/api/v1/recruitment/job-offers/{offer['id']}/matches/generate",
        headers=admin_headers,
        json={"limit": 10},
    )
    assert generate_matches_response.status_code == 200, generate_matches_response.get_json()
    matches_payload = generate_matches_response.get_json()
    assert matches_payload["count"] >= 1
    assert any(
        item["candidate"]["id"] == candidate_profile["id"] and item["job_offer"]["id"] == offer["id"]
        for item in matches_payload["items"]
    )

    update_application_response = client.patch(
        f"/api/v1/recruitment/applications/{application['id']}",
        headers=admin_headers,
        json={
            "status": "shortlisted",
            "score": 88,
            "notes": "Profil retenu pour entretien chantier",
        },
    )
    assert update_application_response.status_code == 200, update_application_response.get_json()
    updated_application = update_application_response.get_json()["application"]
    assert updated_application["status"] == "shortlisted"
    assert updated_application["score"] == 88.0
    assert updated_application["notes"] == "Profil retenu pour entretien chantier"
