"""Affiche l'état des affectations projets de tous les employés actifs."""
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from dotenv import load_dotenv
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.models.company import Company
from app.models.project import Project, ProjectAssignment
from app.models.user import User

COMPANY_REGISTRATION_NUMBER = os.getenv(
    "FULL_COMPANY_REGISTRATION_NUMBER", "DEMO-BTP-FULL-001"
).strip()

EXCLUDED_TITLES = ("directeur", "president")
EXCLUDED_DEPT = "ressources humaines"
EXCLUDED_TITLES_EXACT = ("responsable rh", "rh / recruteur")


def _is_excluded(u: User) -> bool:
    title = (u.job_title or "").lower()
    dept = (u.department or "").lower()
    return (
        u.user_type != "employee"
        or any(title.startswith(t) for t in EXCLUDED_TITLES)
        or title in EXCLUDED_TITLES_EXACT
        or dept == EXCLUDED_DEPT
    )


def main() -> int:
    app = create_app()
    with app.app_context():
        co = Company.query.filter_by(
            registration_number=COMPANY_REGISTRATION_NUMBER
        ).first()
        if co is None:
            print(f"[ERROR] Entreprise introuvable : {COMPANY_REGISTRATION_NUMBER}")
            return 1

        users = (
            User.query.filter_by(
                company_id=co.id, user_type="employee", account_status="active"
            )
            .filter(User.deleted_at.is_(None))
            .order_by(User.last_name)
            .all()
        )

        workers = [u for u in users if not _is_excluded(u)]
        excluded = [u for u in users if _is_excluded(u)]

        print(f"\n{'='*95}")
        print(f"  Entreprise : {co.legal_name}  |  Employés actifs : {len(users)}")
        print(f"{'='*95}")
        print(f"\n{'NOM':<28} {'POSTE':<35} {'PROJETS RATTACHÉS'}")
        print(f"{'-'*28} {'-'*35} {'-'*28}")

        missing = 0
        for u in workers:
            asgn = ProjectAssignment.query.filter_by(
                company_id=co.id, user_id=u.id
            ).all()
            project_ids = {a.project_id for a in asgn}
            projects_map = {
                p.id: p.code
                for p in Project.query.filter(Project.id.in_(project_ids)).all()
            } if project_ids else {}
            proj_codes = ", ".join(sorted(projects_map[pid] for pid in project_ids if pid in projects_map))
            label = "AUCUN PROJET ⚠" if not proj_codes else proj_codes
            if not proj_codes:
                missing += 1
            full_name = f"{u.first_name} {u.last_name}"
            print(f"{full_name:<28} {(u.job_title or ''):<35} {label}")

        print(f"\n  Travailleurs vérifiés : {len(workers)}")
        print(f"  Sans aucun projet     : {missing}")

        print(f"\n  --- Exclus (Directeurs, RH, non-employés) ---")
        for u in excluded:
            full_name = f"{u.first_name} {u.last_name}"
            print(f"    {full_name:<28} {u.job_title or ''}")

        print(f"\n{'='*95}\n")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
