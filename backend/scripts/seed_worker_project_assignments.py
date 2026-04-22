"""
Assigne tous les travailleurs (hors directeurs et RH) à au moins un projet actif.
Ce script est idempotent : il ne crée pas de doublon si l'affectation existe déjà.

Exclusions :
  - job_title commence par "Directeur" ou "President"
  - department == "Ressources humaines"
  - user_type != "employee"

Règle d'affectation :
  - Distribution en round-robin sur les projets actifs (in_progress, awarded, preparation)
  - Si un utilisateur a déjà au moins une affectation, il est ignoré
"""

import os
import sys
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.extensions import db
from app.models.company import Company
from app.models.project import Project, ProjectAssignment
from app.models.user import User
from app.modules.projects.service import create_project_assignment

COMPANY_REGISTRATION_NUMBER = os.getenv(
    "FULL_COMPANY_REGISTRATION_NUMBER", "DEMO-BTP-FULL-001"
).strip()

# Rôle par défaut selon le job_title (insensible à la casse, correspondance partielle)
PROFILE_ROLE_MAP = [
    ("chef de projet", "Chef de projet"),
    ("conducteur de travaux", "Conducteur de travaux"),
    ("chef de chantier", "Chef de chantier"),
    ("collaborateur terrain", "Collaborateur terrain"),
    ("ouvrier", "Ouvrier"),
    ("responsable logistique", "Responsable logistique"),
    ("logisticien", "Logisticien"),
    ("acheteur", "Acheteur"),
    ("magasinier", "Gestionnaire stock"),
    ("comptable", "Suivi financier"),
    ("controleur de gestion", "Controleur de gestion"),
    ("juriste", "Juriste projet"),
    ("assistant administratif", "Charge administratif"),
]

ACTIVE_STATUSES = {"in_progress", "awarded", "preparation", "submitted"}


def _project_role_for(job_title: str) -> str:
    title_lower = (job_title or "").lower()
    for keyword, role in PROFILE_ROLE_MAP:
        if keyword in title_lower:
            return role
    return "Collaborateur projet"


def _is_excluded(user: User) -> bool:
    title = (user.job_title or "").lower()
    dept = (user.department or "").lower()
    return (
        user.user_type != "employee"
        or title.startswith("directeur")
        or title.startswith("president")
        or dept == "ressources humaines"
        or title == "responsable rh"
        or title == "rh / recruteur"
    )


def main() -> int:
    app = create_app()
    with app.app_context():
        company = Company.query.filter_by(
            registration_number=COMPANY_REGISTRATION_NUMBER
        ).first()

        if company is None:
            print(f"[ERROR] Entreprise introuvable : {COMPANY_REGISTRATION_NUMBER}")
            return 1

        # Récupère tous les projets actifs
        active_projects = (
            Project.query.filter(
                Project.company_id == company.id,
                Project.status.in_(ACTIVE_STATUSES),
                Project.deleted_at.is_(None),
            )
            .order_by(Project.id)
            .all()
        )

        if not active_projects:
            print("[ERROR] Aucun projet actif trouvé.")
            return 1

        # Récupère tous les employés actifs non exclus
        employees = (
            User.query.filter(
                User.company_id == company.id,
                User.user_type == "employee",
                User.account_status == "active",
                User.deleted_at.is_(None),
            )
            .order_by(User.id)
            .all()
        )

        workers = [u for u in employees if not _is_excluded(u)]
        print(f"[seed] Entreprise       : {company.legal_name} (id={company.id})")
        print(f"[seed] Projets actifs   : {len(active_projects)}")
        print(f"[seed] Travailleurs     : {len(workers)}")

        created = 0
        skipped = 0
        project_index = 0

        for worker in workers:
            # Vérifie si déjà affecté à au moins un projet
            existing = ProjectAssignment.query.filter_by(
                company_id=company.id, user_id=worker.id
            ).first()

            if existing is not None:
                skipped += 1
                continue

            # Choisit le projet en round-robin
            project = active_projects[project_index % len(active_projects)]
            project_index += 1

            project_role = _project_role_for(worker.job_title)

            # Évite doublon sur (company, project, user, role)
            already = ProjectAssignment.query.filter_by(
                company_id=company.id,
                project_id=project.id,
                user_id=worker.id,
                project_role=project_role,
            ).first()

            if already is not None:
                skipped += 1
                continue

            create_project_assignment(
                company.id,
                project.id,
                {
                    "user_id": worker.id,
                    "project_role": project_role,
                    "assignment_mode": "immediate",
                    "start_date": str(project.start_date or date(2026, 1, 1)),
                    "responsibility": (
                        f"Contribution projet {project.code} – {project_role}"
                    ),
                    "is_active": True,
                },
            )

            print(
                f"  [+] {worker.first_name} {worker.last_name} ({worker.job_title})"
                f"  →  {project.code} ({project_role})"
            )
            created += 1

        print(
            f"\n[seed] Terminé : {created} affectation(s) créée(s), "
            f"{skipped} ignorée(s) (déjà assigné ou exclu)."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
