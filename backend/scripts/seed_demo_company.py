import os
import sys
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.core.default_profiles import DEFAULT_PERMISSION_CODES, ensure_company_admin_role, ensure_permissions_exist
from app.extensions import db
from app.models.company import Company
from app.models.user import User
from app.modules.companies.service import register_company, review_company


DEMO_COMPANY_LEGAL_NAME = os.getenv("DEMO_COMPANY_LEGAL_NAME", "Demo Construction SARL").strip()
DEMO_COMPANY_REGISTRATION_NUMBER = os.getenv("DEMO_COMPANY_REGISTRATION_NUMBER", "DEMO-BTP-001").strip()
DEMO_COMPANY_EMAIL = os.getenv("DEMO_COMPANY_EMAIL", "contact@demo.local").strip().lower()
DEMO_COMPANY_COUNTRY_CODE = os.getenv("DEMO_COMPANY_COUNTRY_CODE", "CM").strip().upper()
DEMO_COMPANY_DEFAULT_LANGUAGE = os.getenv("DEMO_COMPANY_DEFAULT_LANGUAGE", "fr").strip().lower()
DEMO_COMPANY_CURRENCY = os.getenv("DEMO_COMPANY_CURRENCY", "XAF").strip().upper()
DEMO_COMPANY_TIMEZONE = os.getenv("DEMO_COMPANY_TIMEZONE", "Africa/Douala").strip()
DEMO_ADMIN_FIRST_NAME = os.getenv("DEMO_ADMIN_FIRST_NAME", "Demo").strip()
DEMO_ADMIN_LAST_NAME = os.getenv("DEMO_ADMIN_LAST_NAME", "Admin").strip()
DEMO_ADMIN_EMAIL = os.getenv("DEMO_ADMIN_EMAIL", "admin@demo.local").strip().lower()
DEMO_ADMIN_PASSWORD = os.getenv("DEMO_ADMIN_PASSWORD", "DemoPass123!").strip()


def _demo_payload() -> dict[str, str]:
    return {
        "legal_name": DEMO_COMPANY_LEGAL_NAME,
        "registration_number": DEMO_COMPANY_REGISTRATION_NUMBER,
        "email": DEMO_COMPANY_EMAIL,
        "country_code": DEMO_COMPANY_COUNTRY_CODE,
        "default_language": DEMO_COMPANY_DEFAULT_LANGUAGE,
        "currency": DEMO_COMPANY_CURRENCY,
        "timezone": DEMO_COMPANY_TIMEZONE,
        "admin_first_name": DEMO_ADMIN_FIRST_NAME,
        "admin_last_name": DEMO_ADMIN_LAST_NAME,
        "admin_email": DEMO_ADMIN_EMAIL,
        "admin_password": DEMO_ADMIN_PASSWORD,
    }


def main() -> int:
    app = create_app()
    with app.app_context():
        ensure_permissions_exist(DEFAULT_PERMISSION_CODES)

        company = Company.query.filter_by(registration_number=DEMO_COMPANY_REGISTRATION_NUMBER).first()
        action = "reused"

        if company is None:
            result = register_company(_demo_payload())
            company = Company.query.filter_by(id=result["id"]).first()
            action = "created"

        ensure_company_admin_role(company.id)

        if company.onboarding_status != "approved" or not company.is_active:
            review_company(company.id, "approved")

        db.session.commit()

        admin_user = User.query.filter_by(company_id=company.id, email=DEMO_ADMIN_EMAIL).first()

        print(f"[seed] Demo company {action} successfully.")
        print(f"       company_id : {company.id}")
        print(f"       legal_name : {company.legal_name}")
        print(f"       admin_email: {DEMO_ADMIN_EMAIL}")
        if admin_user is not None:
            print(f"       admin_id   : {admin_user.id}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
