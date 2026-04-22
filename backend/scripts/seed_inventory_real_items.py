import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.extensions import db
from app.models.company import Company
from app.models.inventory import InventoryItem, StockLocation, StockMovement
from app.models.user import User

SEED_ITEMS = [
    {
        "sku": "REAL-CIM-CPJ42-50",
        "name": "Ciment CPJ 42.5 (sac 50kg)",
        "category": "material",
        "unit": "sac",
        "avg_cost": Decimal("7900.00"),
        "min_threshold": Decimal("20"),
        "max_threshold": Decimal("200"),
        "qty": Decimal("80"),
    },
    {
        "sku": "REAL-AGR-SABLE-0-5",
        "name": "Sable 0/5 lavé",
        "category": "material",
        "unit": "m3",
        "avg_cost": Decimal("32500.00"),
        "min_threshold": Decimal("8"),
        "max_threshold": Decimal("90"),
        "qty": Decimal("22"),
    },
    {
        "sku": "REAL-EQP-BETO-350L",
        "name": "Bétonnière thermique 350L",
        "category": "equipment",
        "unit": "u",
        "avg_cost": Decimal("985000.00"),
        "min_threshold": Decimal("1"),
        "max_threshold": Decimal("6"),
        "qty": Decimal("2"),
    },
    {
        "sku": "REAL-EQP-VIBR-38",
        "name": "Aiguille vibrante Ø38",
        "category": "equipment",
        "unit": "u",
        "avg_cost": Decimal("248000.00"),
        "min_threshold": Decimal("1"),
        "max_threshold": Decimal("10"),
        "qty": Decimal("4"),
    },
    {
        "sku": "REAL-CON-GANT-NITR",
        "name": "Gants nitrile chantier",
        "category": "consumable",
        "unit": "paire",
        "avg_cost": Decimal("2200.00"),
        "min_threshold": Decimal("30"),
        "max_threshold": Decimal("300"),
        "qty": Decimal("120"),
    },
    {
        "sku": "REAL-CON-DISQ-230",
        "name": "Disque diamant 230 mm",
        "category": "consumable",
        "unit": "u",
        "avg_cost": Decimal("14500.00"),
        "min_threshold": Decimal("10"),
        "max_threshold": Decimal("80"),
        "qty": Decimal("36"),
    },
]


def _get_actor(company_id: int) -> User | None:
    return (
        User.query.filter_by(company_id=company_id, is_active=True)
        .filter(User.deleted_at.is_(None))
        .order_by(User.id.asc())
        .first()
    )


def _get_or_create_location(company_id: int) -> StockLocation:
    location = (
        StockLocation.query.filter_by(company_id=company_id)
        .filter(StockLocation.deleted_at.is_(None))
        .order_by(StockLocation.id.asc())
        .first()
    )
    if location:
        return location

    location = StockLocation(
        company_id=company_id,
        code="MAG-PRINCIPAL",
        name="Magasin principal",
        location_type="main_warehouse",
        address="Depot central",
        description="Emplacement cree par seed inventory real items",
    )
    db.session.add(location)
    db.session.flush()
    return location


def _get_or_create_item(company_id: int, row: dict) -> InventoryItem:
    item = InventoryItem.query.filter_by(company_id=company_id, sku=row["sku"]).first()
    if item is None:
        item = InventoryItem(
            company_id=company_id,
            sku=row["sku"],
            name=row["name"],
            category=row["category"],
            unit=row["unit"],
            min_threshold=row["min_threshold"],
            max_threshold=row["max_threshold"],
            average_unit_cost=row["avg_cost"],
            preferred_supplier="Fournisseur chantier",
            notes="Article seedé pour démonstration stock réel",
        )
        db.session.add(item)
        db.session.flush()
        return item

    item.name = row["name"]
    item.category = row["category"]
    item.unit = row["unit"]
    item.min_threshold = row["min_threshold"]
    item.max_threshold = row["max_threshold"]
    item.average_unit_cost = row["avg_cost"]
    item.preferred_supplier = item.preferred_supplier or "Fournisseur chantier"
    return item


def _has_seed_stock(company_id: int, item_id: int) -> bool:
    return (
        StockMovement.query.filter_by(company_id=company_id, item_id=item_id, reference="SEED-REAL-STOCK")
        .limit(1)
        .first()
        is not None
    )


def _add_initial_stock(company_id: int, actor_id: int, location_id: int, item: InventoryItem, quantity: Decimal) -> None:
    if _has_seed_stock(company_id=company_id, item_id=item.id):
        return

    movement = StockMovement(
        company_id=company_id,
        item_id=item.id,
        movement_type="in",
        quantity=quantity,
        from_location_id=None,
        to_location_id=location_id,
        performed_by_user_id=actor_id,
        unit_cost=item.average_unit_cost,
        total_cost=(Decimal(str(item.average_unit_cost or 0)) * quantity),
        reference="SEED-REAL-STOCK",
        notes=f"Stock initial seed du {date.today().isoformat()}",
    )
    db.session.add(movement)


def main() -> int:
    app = create_app()
    with app.app_context():
        companies = Company.query.filter_by(is_active=True).all()
        if not companies:
            print("[seed-inventory-real] No active company found.")
            return 0

        total_items = 0
        total_movements = 0

        for company in companies:
            actor = _get_actor(company.id)
            if actor is None:
                print(f"[seed-inventory-real] Company {company.id}: skipped (no active user).")
                continue

            location = _get_or_create_location(company.id)
            created_for_company = 0
            moved_for_company = 0

            for row in SEED_ITEMS:
                existing = InventoryItem.query.filter_by(company_id=company.id, sku=row["sku"]).first()
                item = _get_or_create_item(company.id, row)
                if existing is None:
                    created_for_company += 1
                    total_items += 1

                had_stock = _has_seed_stock(company.id, item.id)
                _add_initial_stock(company.id, actor.id, location.id, item, row["qty"])
                if not had_stock:
                    moved_for_company += 1
                    total_movements += 1

            print(
                f"[seed-inventory-real] Company {company.id}: items added={created_for_company}, initial stock movements={moved_for_company}."
            )

        db.session.commit()
        print(
            f"[seed-inventory-real] Done. New items={total_items}, new stock movements={total_movements}."
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
