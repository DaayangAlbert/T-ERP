import sys
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.extensions import db
from app.models.company import Company
from app.models.inventory import InventoryItem, ProjectStockAllocation
from app.models.project import Project
from app.models.user import User


SEED_ITEMS = [
    {
        "sku": "SEED-CEMENT-25",
        "name": "Ciment CPJ 42.5 (sac 25kg)",
        "category": "material",
        "unit": "sac",
        "avg_cost": Decimal("6200.00"),
        "qty": Decimal("3"),
    },
    {
        "sku": "SEED-STEEL-10",
        "name": "Acier HA10",
        "category": "material",
        "unit": "barre",
        "avg_cost": Decimal("4800.00"),
        "qty": Decimal("5"),
    },
    {
        "sku": "SEED-GLOVES-01",
        "name": "Gants de securite",
        "category": "consumable",
        "unit": "paire",
        "avg_cost": Decimal("1500.00"),
        "qty": Decimal("4"),
    },
]


def _get_or_create_item(company_id: int, row: dict) -> InventoryItem:
    item = InventoryItem.query.filter_by(company_id=company_id, sku=row["sku"]).first()
    if item:
        return item

    item = InventoryItem(
        company_id=company_id,
        sku=row["sku"],
        name=row["name"],
        unit=row["unit"],
        category=row["category"],
        min_threshold=Decimal("5"),
        max_threshold=Decimal("30"),
        average_unit_cost=row["avg_cost"],
    )
    db.session.add(item)
    db.session.flush()
    return item


def main() -> int:
    app = create_app()
    with app.app_context():
        companies = Company.query.filter_by(is_active=True).all()
        if not companies:
            print("[seed-stock] No active company found.")
            return 0

        total_allocations = 0
        total_projects = 0

        for company in companies:
            actor = User.query.filter_by(company_id=company.id, is_active=True).order_by(User.id.asc()).first()
            if actor is None:
                continue

            projects = (
                Project.query.filter_by(company_id=company.id)
                .filter(Project.deleted_at.is_(None))
                .filter(Project.status != "archived")
                .order_by(Project.id.asc())
                .limit(8)
                .all()
            )

            if not projects:
                continue

            created_for_company = 0

            for project in projects:
                existing = (
                    ProjectStockAllocation.query.filter_by(company_id=company.id, project_id=project.id)
                    .limit(1)
                    .first()
                )
                if existing:
                    continue

                for seed_row in SEED_ITEMS:
                    item = _get_or_create_item(company.id, seed_row)
                    allocation = ProjectStockAllocation(
                        company_id=company.id,
                        project_id=project.id,
                        item_id=item.id,
                        quantity_allocated=seed_row["qty"],
                        allocated_by_user_id=actor.id,
                        responsible_user_id=actor.id,
                    )
                    db.session.add(allocation)
                    total_allocations += 1
                    created_for_company += 1

                total_projects += 1

            if created_for_company:
                print(
                    f"[seed-stock] Company {company.id} -> {created_for_company} allocations added across projects."
                )

        db.session.commit()
        print(f"[seed-stock] Done. Projects updated: {total_projects}, allocations added: {total_allocations}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
