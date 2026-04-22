import os
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def _assert_status(response, expected_status: int, step_name: str) -> dict:
    if response.status_code != expected_status:
        raise AssertionError(
            f"{step_name} failed: expected {expected_status}, got {response.status_code}, body={response.get_json()}"
        )

    return response.get_json() or {}


def _auth_headers(access_token: str, tenant_id: int | None = None) -> dict[str, str]:
    headers = {"Authorization": f"Bearer {access_token}"}
    if tenant_id is not None:
        headers["X-Tenant-ID"] = str(tenant_id)
    return headers


def _assert_paginated_list(response, step_name: str) -> None:
    payload = _assert_status(response, 200, step_name)
    if not isinstance(payload.get("items"), list):
        raise AssertionError(f"{step_name} failed: expected 'items' list, got {payload}")
    if not isinstance(payload.get("pagination"), dict):
        raise AssertionError(f"{step_name} failed: expected 'pagination' object, got {payload}")


def main() -> int:
    smoke_root = BACKEND_DIR / ".smoke-tmp"
    smoke_root.mkdir(exist_ok=True)
    db_path = (smoke_root / "sprint_1_smoke.sqlite3").resolve()

    if db_path.exists():
        db_path.unlink()

    try:
        os.environ["FLASK_ENV"] = "development"
        os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
        os.environ["JWT_SECRET_KEY"] = "sprint-1-smoke-secret-key-2026-safe"

        from flask_migrate import upgrade

        from app import create_app
        from app.extensions import db

        app = create_app("development")

        with app.app_context():
            upgrade()

        client = app.test_client()

        super_admin_payload = {
            "email": "platform-admin@example.com",
            "password": "SmokePass123!",
            "first_name": "Platform",
            "last_name": "Admin",
        }
        bootstrap_data = _assert_status(
            client.post("/api/v1/auth/bootstrap-super-admin", json=super_admin_payload),
            201,
            "bootstrap super admin",
        )
        super_admin_token = bootstrap_data["access_token"]

        company_payload = {
            "legal_name": "Smoke Construction SARL",
            "registration_number": "SMOKE-REG-001",
            "email": "contact@smoke.example.com",
            "country_code": "CM",
            "admin_first_name": "Alice",
            "admin_last_name": "Builder",
            "admin_email": "alice@smoke.example.com",
            "admin_password": "CompanyPass123!",
        }
        company_data = _assert_status(
            client.post("/api/v1/companies/register", json=company_payload),
            201,
            "register company",
        )
        company_id = company_data["company"]["id"]

        admin_login_data = _assert_status(
            client.post(
                "/api/v1/auth/login",
                json={
                    "email": super_admin_payload["email"],
                    "password": super_admin_payload["password"],
                },
            ),
            200,
            "super admin login",
        )
        super_admin_token = admin_login_data["access_token"]

        pending_data = _assert_status(
            client.get("/api/v1/companies/pending", headers=_auth_headers(super_admin_token)),
            200,
            "list pending companies",
        )
        pending_ids = {item["id"] for item in pending_data["items"]}
        if company_id not in pending_ids:
            raise AssertionError(f"registered company {company_id} not found in pending companies")

        _assert_status(
            client.patch(
                f"/api/v1/companies/{company_id}/review",
                headers=_auth_headers(super_admin_token),
                json={"decision": "approved"},
            ),
            200,
            "approve company",
        )

        company_login_data = _assert_status(
            client.post(
                "/api/v1/auth/login",
                json={
                    "email": company_payload["admin_email"],
                    "password": company_payload["admin_password"],
                    "company_id": company_id,
                },
            ),
            200,
            "company admin login",
        )
        company_admin_token = company_login_data["access_token"]
        company_headers = _auth_headers(company_admin_token, tenant_id=company_id)

        me_data = _assert_status(
            client.get("/api/v1/auth/me", headers=company_headers),
            200,
            "fetch current user profile",
        )
        if me_data.get("company_id") != company_id:
            raise AssertionError(f"expected company_id {company_id} in /auth/me, got {me_data}")

        for route in [
            "/api/v1/companies/status",
            "/api/v1/projects/status",
            "/api/v1/finance/status",
            "/api/v1/inventory/status",
        ]:
            _assert_status(client.get(route, headers=company_headers), 200, f"module status {route}")

        for route in [
            "/api/v1/users",
            "/api/v1/projects",
            "/api/v1/finance/entries",
            "/api/v1/finance/invoices",
            "/api/v1/finance/payments",
            "/api/v1/inventory/items",
            "/api/v1/inventory/movements",
            "/api/v1/inventory/allocations",
        ]:
            _assert_paginated_list(client.get(route, headers=company_headers), f"paginated list {route}")

        print("Sprint 1 smoke test passed")
        print(f"- company_id: {company_id}")
        print(f"- company_admin_email: {company_payload['admin_email']}")
        print("- verified: register -> review -> login -> V1 dashboard module statuses")
        return 0
    finally:
        try:
            if "db" in locals():
                with app.app_context():
                    db.session.remove()
                    db.engine.dispose()
        except Exception:
            pass

        if db_path.exists():
            try:
                db_path.unlink()
            except PermissionError:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
