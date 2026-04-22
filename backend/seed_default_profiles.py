"""
Seed script: ensure the default user profiles (roles) exist across the platform.

Usage (from backend/):
    python seed_default_profiles.py

The script is idempotent:
- creates the global role catalog if missing
- updates role labels/descriptions on rerun
- ensures each existing company has its default company admin role
"""

import os
import sys

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

from app import create_app
from app.core.default_profiles import ensure_company_admin_role, ensure_default_global_profiles, ensure_permissions_exist
from app.extensions import db
from app.models.company import Company


def seed() -> None:
    app = create_app()
    with app.app_context():
        ensure_permissions_exist()

        global_profiles = ensure_default_global_profiles()
        company_roles = []

        for company in Company.query.order_by(Company.id.asc()).all():
            role, created = ensure_company_admin_role(company.id)
            company_roles.append(
                {
                    "company_id": company.id,
                    "code": role.code,
                    "created": created,
                }
            )

        db.session.commit()

        print("[seed] Default user profiles synchronized successfully.")
        print(f"       global profiles : {len(global_profiles)}")
        print(f"       company profiles: {len(company_roles)}")
        for profile in global_profiles:
            status = "created" if profile["created"] else "updated"
            print(f"       - {profile['code']}: {status}")
        for role in company_roles:
            status = "created" if role["created"] else "updated"
            print(f"       - company {role['company_id']} / {role['code']}: {status}")


if __name__ == "__main__":
    seed()
