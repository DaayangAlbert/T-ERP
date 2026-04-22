from flask_jwt_extended import create_access_token, create_refresh_token, decode_token

from tests.test_v1_critical_flows import auth_headers, create_approved_company_context


def _issue_legacy_tokens(app, user_payload):
    legacy_claims = {
        "user_type": user_payload["user_type"],
        "preferred_language": user_payload["preferred_language"],
        "roles": user_payload["roles"],
        "permissions": user_payload["permissions"],
        "token_version": 1,
    }

    with app.app_context():
        access_token = create_access_token(identity=str(user_payload["id"]), additional_claims=legacy_claims)
        refresh_token = create_refresh_token(identity=str(user_payload["id"]), additional_claims=legacy_claims)

    return access_token, refresh_token


def test_company_routes_fallback_to_authenticated_company_for_legacy_tokens(client, app):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-LEGACY-TOKEN-001",
        company_email="contact@legacy-token.example.com",
        admin_email="admin@legacy-token.example.com",
    )
    access_token, _ = _issue_legacy_tokens(app, context["company_user"])

    response = client.get("/api/v1/projects/dashboard", headers=auth_headers(access_token))

    assert response.status_code == 200, response.get_json()
    payload = response.get_json()
    assert payload["counts"]["projects_total"] == 0


def test_legacy_company_tokens_still_enforce_tenant_mismatch(client, app):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-LEGACY-TOKEN-002",
        company_email="contact@legacy-mismatch.example.com",
        admin_email="admin@legacy-mismatch.example.com",
    )
    access_token, _ = _issue_legacy_tokens(app, context["company_user"])

    response = client.get("/api/v1/projects/dashboard", headers=auth_headers(access_token, tenant_id=999999))

    assert response.status_code == 403, response.get_json()
    payload = response.get_json()
    assert payload["code"] == "tenant_mismatch"


def test_auth_endpoints_backfill_company_scope_for_legacy_tokens(client, app):
    context = create_approved_company_context(
        client,
        registration_number="REG-TEST-LEGACY-TOKEN-003",
        company_email="contact@legacy-refresh.example.com",
        admin_email="admin@legacy-refresh.example.com",
    )
    access_token, refresh_token = _issue_legacy_tokens(app, context["company_user"])

    me_response = client.get("/api/v1/auth/me", headers=auth_headers(access_token))

    assert me_response.status_code == 200, me_response.get_json()
    me_payload = me_response.get_json()
    assert me_payload["company_id"] == context["company"]["company_id"]

    refresh_response = client.post("/api/v1/auth/refresh", headers=auth_headers(refresh_token))

    assert refresh_response.status_code == 200, refresh_response.get_json()
    with app.app_context():
        decoded = decode_token(refresh_response.get_json()["access_token"])

    assert decoded["company_id"] == context["company"]["company_id"]
