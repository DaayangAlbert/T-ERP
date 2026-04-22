import os
import sys
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from seed_default_profiles import seed as seed_default_profiles
from seed_super_admin import seed as seed_super_admin


def main() -> int:
    print("[seed] Synchronizing platform permissions and role catalog...")
    seed_default_profiles()

    super_admin_email = os.getenv("SUPER_ADMIN_EMAIL", "").strip()
    super_admin_password = os.getenv("SUPER_ADMIN_PASSWORD", "").strip()

    if super_admin_email and super_admin_password:
        print("[seed] Synchronizing platform super admin...")
        seed_super_admin()
    else:
        print("[seed] Skipped super admin seed: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not configured.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
