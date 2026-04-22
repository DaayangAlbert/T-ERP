"""
Seed script: create and normalize inventory history for project TERP-KRI-2026-01.

Goals:
- ensure each KRI item exists
- ensure each item has stock in warehouse
- ensure project entry history exists via allocation
- ensure project exit history exists only when stock is available
- ensure supply requests exist with treated / non-treated statuses
- backfill stock_before / stock_after snapshots for persisted movements

Usage:
    cd backend
    python scripts/seed_kri_project_stock.py
"""

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
from app.models.inventory import InventoryItem, ProjectStockAllocation, StockLocation, StockMovement, StockSupplyRequest
from app.models.project import Project
from app.models.user import User
from app.modules.inventory.service import create_movement, create_supply_request, update_supply_request

PROJECT_CODE = "TERP-KRI-2026-01"
SEED_REF = "SEED-KRI-STOCK"
EXIT_REF_PREFIX = "SEED-KRI-OUT"
REQUEST_REF_PREFIX = "SEED-KRI-REQ"

SEED_ITEMS = [
    {"sku": "KRI-MAT-CIM-CPJ42", "name": "Ciment CPJ 42.5 (sac 50 kg)", "category": "material", "unit": "sac", "avg_cost": Decimal("7900.00"), "min_threshold": Decimal("20"), "max_threshold": Decimal("300"), "qty_stock": Decimal("150"), "qty_alloc": Decimal("80"), "qty_exit": Decimal("12"), "request_qty": Decimal("25"), "request_status": "fulfilled", "urgency": "high"},
    {"sku": "KRI-MAT-SABLE-05", "name": "Sable 0/5 lave", "category": "material", "unit": "m3", "avg_cost": Decimal("32500.00"), "min_threshold": Decimal("5"), "max_threshold": Decimal("100"), "qty_stock": Decimal("40"), "qty_alloc": Decimal("25"), "qty_exit": Decimal("4"), "request_qty": Decimal("8"), "request_status": "pending", "urgency": "normal"},
    {"sku": "KRI-MAT-GRAVILLON", "name": "Gravillon 10/20", "category": "material", "unit": "m3", "avg_cost": Decimal("28000.00"), "min_threshold": Decimal("5"), "max_threshold": Decimal("80"), "qty_stock": Decimal("30"), "qty_alloc": Decimal("20"), "qty_exit": Decimal("3"), "request_qty": Decimal("6"), "request_status": "transmitted", "urgency": "high"},
    {"sku": "KRI-MAT-ACIER-HA12", "name": "Acier HA O12 mm (barre 12 m)", "category": "material", "unit": "barre", "avg_cost": Decimal("4200.00"), "min_threshold": Decimal("50"), "max_threshold": Decimal("500"), "qty_stock": Decimal("200"), "qty_alloc": Decimal("100"), "qty_exit": Decimal("18"), "request_qty": Decimal("30"), "request_status": "fulfilled", "urgency": "urgent"},
    {"sku": "KRI-MAT-BOIS-COFF", "name": "Bois de coffrage (planche 27 mm)", "category": "material", "unit": "ml", "avg_cost": Decimal("850.00"), "min_threshold": Decimal("100"), "max_threshold": Decimal("2000"), "qty_stock": Decimal("500"), "qty_alloc": Decimal("300"), "qty_exit": Decimal("40"), "request_qty": Decimal("60"), "request_status": "pending", "urgency": "normal"},
    {"sku": "KRI-MAT-PARPAING-20", "name": "Parpaing creux 20x20x40", "category": "material", "unit": "u", "avg_cost": Decimal("180.00"), "min_threshold": Decimal("500"), "max_threshold": Decimal("10000"), "qty_stock": Decimal("3000"), "qty_alloc": Decimal("2000"), "qty_exit": Decimal("250"), "request_qty": Decimal("500"), "request_status": "approved", "urgency": "high"},
    {"sku": "KRI-EQP-BETO-350L", "name": "Betonniere thermique 350 L", "category": "equipment", "unit": "u", "avg_cost": Decimal("985000.00"), "min_threshold": Decimal("1"), "max_threshold": Decimal("5"), "qty_stock": Decimal("3"), "qty_alloc": Decimal("2"), "qty_exit": Decimal("1"), "request_qty": Decimal("1"), "request_status": "pending", "urgency": "high"},
    {"sku": "KRI-EQP-COMPAC-60", "name": "Plaque vibrante compacteur 60 cm", "category": "equipment", "unit": "u", "avg_cost": Decimal("650000.00"), "min_threshold": Decimal("1"), "max_threshold": Decimal("4"), "qty_stock": Decimal("2"), "qty_alloc": Decimal("1"), "qty_exit": Decimal("0"), "request_qty": Decimal("1"), "request_status": "fulfilled", "urgency": "normal"},
    {"sku": "KRI-EQP-ECHAF-TUBE", "name": "Lot d'echafaudage tubulaire (set 20 m2)", "category": "equipment", "unit": "set", "avg_cost": Decimal("480000.00"), "min_threshold": Decimal("2"), "max_threshold": Decimal("20"), "qty_stock": Decimal("6"), "qty_alloc": Decimal("4"), "qty_exit": Decimal("1"), "request_qty": Decimal("2"), "request_status": "transmitted", "urgency": "normal"},
    {"sku": "KRI-EQP-NIVLASER", "name": "Niveau laser rotatif", "category": "equipment", "unit": "u", "avg_cost": Decimal("320000.00"), "min_threshold": Decimal("1"), "max_threshold": Decimal("6"), "qty_stock": Decimal("2"), "qty_alloc": Decimal("1"), "qty_exit": Decimal("0"), "request_qty": Decimal("1"), "request_status": "approved", "urgency": "low"},
    {"sku": "KRI-CON-GANT-NITR", "name": "Gants de protection nitrile", "category": "consumable", "unit": "paire", "avg_cost": Decimal("2200.00"), "min_threshold": Decimal("50"), "max_threshold": Decimal("500"), "qty_stock": Decimal("200"), "qty_alloc": Decimal("100"), "qty_exit": Decimal("24"), "request_qty": Decimal("60"), "request_status": "fulfilled", "urgency": "urgent"},
    {"sku": "KRI-CON-CASQUE-A3", "name": "Casque de chantier classe A", "category": "consumable", "unit": "u", "avg_cost": Decimal("3500.00"), "min_threshold": Decimal("20"), "max_threshold": Decimal("200"), "qty_stock": Decimal("60"), "qty_alloc": Decimal("30"), "qty_exit": Decimal("6"), "request_qty": Decimal("12"), "request_status": "pending", "urgency": "high"},
    {"sku": "KRI-CON-DISQ-230", "name": "Disque diamant meuleuse 230 mm", "category": "consumable", "unit": "u", "avg_cost": Decimal("14500.00"), "min_threshold": Decimal("10"), "max_threshold": Decimal("100"), "qty_stock": Decimal("40"), "qty_alloc": Decimal("20"), "qty_exit": Decimal("5"), "request_qty": Decimal("10"), "request_status": "fulfilled", "urgency": "normal"},
    {"sku": "KRI-CON-VIS-TC6", "name": "Vis tete cylindrique M6x40 (boite 100)", "category": "consumable", "unit": "boite", "avg_cost": Decimal("1800.00"), "min_threshold": Decimal("10"), "max_threshold": Decimal("200"), "qty_stock": Decimal("50"), "qty_alloc": Decimal("25"), "qty_exit": Decimal("4"), "request_qty": Decimal("8"), "request_status": "approved", "urgency": "normal"},
    {"sku": "KRI-CON-CHEV-8-50", "name": "Cheville Fischer 8x50 (boite 100)", "category": "consumable", "unit": "boite", "avg_cost": Decimal("2800.00"), "min_threshold": Decimal("10"), "max_threshold": Decimal("150"), "qty_stock": Decimal("40"), "qty_alloc": Decimal("20"), "qty_exit": Decimal("3"), "request_qty": Decimal("8"), "request_status": "transmitted", "urgency": "high"},
]


def _get_actor(company_id: int) -> User | None:
    return (
        User.query.filter_by(company_id=company_id, is_active=True)
        .filter(User.deleted_at.is_(None))
        .order_by(User.id.asc())
        .first()
    )


def _get_or_create_warehouse(company_id: int) -> StockLocation:
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
        description="Cree par seed_kri_project_stock",
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
            preferred_supplier="Fournisseur KRI",
            notes="Article seede pour projet TERP-KRI-2026-01",
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
    item.preferred_supplier = item.preferred_supplier or "Fournisseur KRI"
    return item


def _find_movement(company_id: int, item_id: int, reference: str) -> StockMovement | None:
    return StockMovement.query.filter_by(company_id=company_id, item_id=item_id, reference=reference).first()


def _find_request(company_id: int, project_id: int, item_id: int, note_token: str) -> StockSupplyRequest | None:
    return (
        StockSupplyRequest.query.filter_by(company_id=company_id, project_id=project_id, item_id=item_id)
        .filter(StockSupplyRequest.notes == note_token)
        .first()
    )


def _get_available_qty(company_id: int, item_id: int, location_id: int) -> Decimal:
    inflow = Decimal("0.00")
    outflow = Decimal("0.00")
    rows = StockMovement.query.filter_by(company_id=company_id, item_id=item_id).all()
    for row in rows:
        quantity = Decimal(str(row.quantity or 0))
        if row.to_location_id == location_id:
            inflow += quantity
        if row.from_location_id == location_id:
            outflow += quantity
    return inflow - outflow


def _backfill_stock_snapshots(company_id: int) -> int:
    rows = (
        StockMovement.query.filter_by(company_id=company_id)
        .order_by(StockMovement.created_at.asc(), StockMovement.id.asc())
        .all()
    )
    balances: dict[tuple[int, int], Decimal] = {}
    updated = 0

    for row in rows:
        anchor_location_id = row.from_location_id if row.from_location_id is not None else row.to_location_id
        if anchor_location_id is None:
            continue

        key = (row.item_id, anchor_location_id)
        before_qty = balances.get(key, Decimal("0.00"))
        quantity = Decimal(str(row.quantity or 0))
        delta = -quantity if row.from_location_id is not None else quantity
        after_qty = before_qty + delta

        current_before = Decimal(str(row.stock_before)) if row.stock_before is not None else None
        current_after = Decimal(str(row.stock_after)) if row.stock_after is not None else None
        if current_before != before_qty or current_after != after_qty:
            row.stock_before = before_qty
            row.stock_after = after_qty
            updated += 1

        balances[key] = after_qty

    return updated


def _ensure_initial_stock(company_id: int, actor_id: int, location_id: int, item: InventoryItem, row: dict) -> bool:
    if _find_movement(company_id=company_id, item_id=item.id, reference=SEED_REF):
        return False

    create_movement(
        company_id=company_id,
        performed_by_user_id=actor_id,
        payload={
            "item_id": item.id,
            "movement_type": "in",
            "to_location_id": location_id,
            "quantity": row["qty_stock"],
            "unit_cost": row["avg_cost"],
            "reference": SEED_REF,
            "notes": f"Stock initial KRI pour {PROJECT_CODE}",
        },
    )
    return True


def _ensure_allocation(company_id: int, actor_id: int, project_id: int, location_id: int, item: InventoryItem, row: dict) -> bool:
    existing = ProjectStockAllocation.query.filter_by(company_id=company_id, project_id=project_id, item_id=item.id).first()
    if existing is not None:
        return False

    create_movement(
        company_id=company_id,
        performed_by_user_id=actor_id,
        payload={
            "item_id": item.id,
            "movement_type": "allocation",
            "from_location_id": location_id,
            "project_id": project_id,
            "quantity": row["qty_alloc"],
            "unit_cost": row["avg_cost"],
            "reference": f"{SEED_REF}-ALLOC",
            "notes": f"Entree stock projet {PROJECT_CODE}",
        },
    )
    return True


def _ensure_exit(company_id: int, actor_id: int, project_id: int, location_id: int, item: InventoryItem, row: dict) -> bool:
    qty_exit = Decimal(str(row.get("qty_exit") or 0))
    if qty_exit <= Decimal("0"):
        return False

    reference = f"{EXIT_REF_PREFIX}-{item.sku}"
    if _find_movement(company_id=company_id, item_id=item.id, reference=reference):
        return False

    available_qty = _get_available_qty(company_id=company_id, item_id=item.id, location_id=location_id)
    if available_qty <= Decimal("0") or available_qty < qty_exit:
        print(
            f"   -> sortie ignoree pour {item.sku}: stock insuffisant "
            f"(disponible={available_qty}, sortie={qty_exit})."
        )
        return False

    create_movement(
        company_id=company_id,
        performed_by_user_id=actor_id,
        payload={
            "item_id": item.id,
            "movement_type": "out",
            "from_location_id": location_id,
            "project_id": project_id,
            "quantity": qty_exit,
            "unit_cost": row["avg_cost"],
            "reference": reference,
            "notes": f"Sortie chantier projet {PROJECT_CODE}",
        },
    )
    return True


def _ensure_supply_request(company_id: int, actor_id: int, project_id: int, item: InventoryItem, row: dict) -> str:
    note_token = f"{REQUEST_REF_PREFIX}-{item.sku}"
    existing = _find_request(company_id=company_id, project_id=project_id, item_id=item.id, note_token=note_token)
    action = "existing"

    if existing is None:
        created = create_supply_request(
            company_id=company_id,
            requester_user_id=actor_id,
            payload={
                "project_id": project_id,
                "item_id": item.id,
                "requested_quantity": row["request_qty"],
                "reason": f"Besoin de reapprovisionnement {item.name}",
                "urgency": row.get("urgency") or "normal",
                "notes": note_token,
            },
        )
        existing = StockSupplyRequest.query.filter_by(company_id=company_id, id=created["id"]).first()
        action = "created"

    target_status = row.get("request_status") or "pending"
    if existing is not None and existing.status != target_status:
        update_supply_request(
            company_id=company_id,
            request_id=existing.id,
            actor_user_id=actor_id,
            payload={
                "status": target_status,
                "notes": note_token,
            },
        )
        return f"{action}+status:{target_status}"
    return action


def main() -> int:
    app = create_app()
    with app.app_context():
        companies = Company.query.filter_by(is_active=True).all()
        if not companies:
            print("[seed-kri] No active company found.")
            return 1

        seeded = 0

        for company in companies:
            project = (
                Project.query.filter_by(company_id=company.id, code=PROJECT_CODE)
                .filter(Project.deleted_at.is_(None))
                .first()
            )
            if project is None:
                print(f"[seed-kri] Company {company.id}: project {PROJECT_CODE} not found, skipping.")
                continue

            actor = _get_actor(company.id)
            if actor is None:
                print(f"[seed-kri] Company {company.id}: no active user found, skipping.")
                continue

            warehouse = _get_or_create_warehouse(company.id)
            print(
                f"[seed-kri] Company {company.id} | Project id={project.id} code={project.code} "
                f"| Warehouse id={warehouse.id} | Actor id={actor.id}"
            )

            items_created = 0
            entries_created = 0
            allocations_created = 0
            exits_created = 0
            requests_touched = 0

            for row in SEED_ITEMS:
                is_new = InventoryItem.query.filter_by(company_id=company.id, sku=row["sku"]).first() is None
                item = _get_or_create_item(company.id, row)
                if is_new:
                    items_created += 1

                created_entry = _ensure_initial_stock(company.id, actor.id, warehouse.id, item, row)
                created_allocation = _ensure_allocation(company.id, actor.id, project.id, warehouse.id, item, row)
                created_exit = _ensure_exit(company.id, actor.id, project.id, warehouse.id, item, row)
                request_action = _ensure_supply_request(company.id, actor.id, project.id, item, row)

                entries_created += int(created_entry)
                allocations_created += int(created_allocation)
                exits_created += int(created_exit)
                requests_touched += 1

                print(
                    f"   {item.sku} | item={'NEW' if is_new else 'EXISTING'} | "
                    f"entree={'ok' if created_entry else 'exists'} | "
                    f"allocation={'ok' if created_allocation else 'exists'} | "
                    f"sortie={'ok' if created_exit else 'skip'} | "
                    f"request={request_action}"
                )

            snapshots_updated = _backfill_stock_snapshots(company.id)
            db.session.commit()

            print(
                f"[seed-kri] Company {company.id}: items_created={items_created}, entries_created={entries_created}, "
                f"allocations_created={allocations_created}, exits_created={exits_created}, "
                f"requests_touched={requests_touched}, snapshots_updated={snapshots_updated}. DONE."
            )
            seeded += 1

        if seeded == 0:
            print(f"[seed-kri] Project {PROJECT_CODE} was not found in any company.")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
