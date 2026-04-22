import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app import create_app
from app.models.company import Company
from app.models.user import User


def main() -> int:
    app = create_app()
    with app.app_context():
        nadines = User.query.filter(
            User.first_name == "Nadine",
            User.deleted_at.is_(None),
        ).all()
        print(f"Nadine users: {len(nadines)}")
        for u in nadines:
            c = Company.query.filter_by(id=u.company_id).first()
            print(
                f"user_id={u.id} email={u.email} company_id={u.company_id} "
                f"company={c.legal_name if c else None} reg={c.registration_number if c else None}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
