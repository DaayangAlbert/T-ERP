def test_cors_preflight_is_handled_for_profile_endpoints(client):
    upload_response = client.options(
        "/api/v1/users/me/profile/uploads/profile_photo",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type,x-tenant-id",
        },
    )

    assert upload_response.status_code == 204
    assert upload_response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert "OPTIONS" in upload_response.headers["Access-Control-Allow-Methods"]
    assert "Authorization" in upload_response.headers["Access-Control-Allow-Headers"]

    profile_response = client.options(
        "/api/v1/users/me/profile",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,x-tenant-id",
        },
    )

    assert profile_response.status_code == 204
    assert profile_response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
