import sys
from calendar import monthrange
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.core.operational_profiles import infer_operational_profile_code
from app.extensions import db
from app.models.company import Company
from app.models.finance import (
    AccountingAccount,
    AccountingJournal,
    BusinessPartner,
    ExpenseRecord,
    FinanceEntry,
    Invoice,
    InvoicePayment,
    Payment,
    ProjectBudget,
    RevenueRecord,
    TreasuryMovement,
    TreasuryAccount,
)
from app.models.payroll import EmployeePayrollProfile, PayrollLeaveRequest, PayrollPeriod, PayrollRun
from app.models.project import Project, ProjectReport
from app.models.user import Role, User, UserRole
from app.modules.finance.service import (
    _ensure_finance_reference_data,
    _recompute_treasury_account_balances,
    approve_expense_record,
    approve_project_budget,
    create_business_partner,
    create_expense_record,
    create_finance_entry,
    create_invoice,
    create_project_budget,
    create_revenue_record,
    create_treasury_account,
    record_expense_payment,
    record_invoice_payment,
    record_revenue_collection,
)
from app.modules.payroll.service import generate_monthly_payslips_via_db, upsert_payroll_employee_profile
from app.modules.projects.service import create_project, create_project_report


DEFAULT_MONTHS = 8
DEFAULT_MIN_PROJECTS = 5
MONEY_STEP = Decimal("1000")

WORKBENCH_TREASURY_SPECS = [
    {
        "code": "WB-BNK-001",
        "name": "Banque workbench BTP",
        "account_type": "bank",
        "currency": "XAF",
        "opening_balance": "25000000000",
        "alert_threshold": "250000000",
    },
    {
        "code": "WB-BNK-002",
        "name": "Compte avances chantiers",
        "account_type": "bank",
        "currency": "XAF",
        "opening_balance": "6000000000",
        "alert_threshold": "150000000",
    },
    {
        "code": "WB-MOMO-003",
        "name": "Mobile money terrain",
        "account_type": "mobile_money",
        "currency": "XAF",
        "opening_balance": "180000000",
        "alert_threshold": "15000000",
    },
]

WORKBENCH_PARTNER_SPECS = [
    {
        "code": "WB-CLI-001",
        "partner_type": "customer",
        "legal_name": "Communaute urbaine - portefeuille BTP",
        "contact_name": "Direction des infrastructures",
        "phone": "+237233000101",
        "address_line": "Douala",
        "currency": "XAF",
    },
    {
        "code": "WB-CLI-002",
        "partner_type": "customer",
        "legal_name": "Agence routiere regionale",
        "contact_name": "Direction technique",
        "phone": "+237233000102",
        "address_line": "Yaounde",
        "currency": "XAF",
    },
    {
        "code": "WB-CLI-003",
        "partner_type": "customer",
        "legal_name": "Portefeuille hydraulique public",
        "contact_name": "Direction des operations",
        "phone": "+237233000103",
        "address_line": "Bafoussam",
        "currency": "XAF",
    },
    {
        "code": "WB-CLI-004",
        "partner_type": "customer",
        "legal_name": "Societe agro industrielle regionale",
        "contact_name": "Direction industrielle",
        "phone": "+237233000104",
        "address_line": "Mbandjock",
        "currency": "XAF",
    },
    {
        "code": "WB-CLI-005",
        "partner_type": "customer",
        "legal_name": "Programme logement et VRD",
        "contact_name": "Direction des projets",
        "phone": "+237233000105",
        "address_line": "Garoua",
        "currency": "XAF",
    },
    {
        "code": "WB-FOU-001",
        "partner_type": "supplier",
        "legal_name": "Centrale beton et granulats",
        "contact_name": "Grands comptes",
        "phone": "+237233100201",
        "address_line": "Douala",
        "currency": "XAF",
    },
    {
        "code": "WB-FOU-002",
        "partner_type": "supplier",
        "legal_name": "Fournitures metalliques industrielles",
        "contact_name": "Pole structures",
        "phone": "+237233100202",
        "address_line": "Douala",
        "currency": "XAF",
    },
    {
        "code": "WB-FOU-003",
        "partner_type": "supplier",
        "legal_name": "Location engins et maintenance",
        "contact_name": "Service exploitation",
        "phone": "+237233100203",
        "address_line": "Douala",
        "currency": "XAF",
    },
    {
        "code": "WB-FOU-004",
        "partner_type": "supplier",
        "legal_name": "Sous-traitance genie civil",
        "contact_name": "Direction chantier",
        "phone": "+237233100204",
        "address_line": "Kribi",
        "currency": "XAF",
    },
    {
        "code": "WB-FOU-005",
        "partner_type": "supplier",
        "legal_name": "Transit et logistique chantier",
        "contact_name": "Coordination appro",
        "phone": "+237233100205",
        "address_line": "Douala",
        "currency": "XAF",
    },
]

WORKBENCH_PROJECT_BLUEPRINTS = [
    {
        "suffix": "VRD",
        "name": "VRD et drainage zone industrielle",
        "project_type": "public_market",
        "location": "Douala",
        "client_index": 0,
        "budget": Decimal("1450000000"),
        "contract": Decimal("1760000000"),
        "progress": Decimal("62"),
        "physical_progress": Decimal("66"),
        "financial_progress": Decimal("58"),
    },
    {
        "suffix": "HYD",
        "name": "Extension reseau hydraulique",
        "project_type": "public_market",
        "location": "Bafoussam",
        "client_index": 2,
        "budget": Decimal("980000000"),
        "contract": Decimal("1190000000"),
        "progress": Decimal("49"),
        "physical_progress": Decimal("45"),
        "financial_progress": Decimal("42"),
    },
    {
        "suffix": "MET",
        "name": "Hall metallique et plateforme logistique",
        "project_type": "private_market",
        "location": "Kribi",
        "client_index": 1,
        "budget": Decimal("1880000000"),
        "contract": Decimal("2270000000"),
        "progress": Decimal("71"),
        "physical_progress": Decimal("74"),
        "financial_progress": Decimal("69"),
    },
    {
        "suffix": "ENE",
        "name": "Electrification et solaire de site",
        "project_type": "private_market",
        "location": "Mbandjock",
        "client_index": 3,
        "budget": Decimal("1120000000"),
        "contract": Decimal("1340000000"),
        "progress": Decimal("88"),
        "physical_progress": Decimal("90"),
        "financial_progress": Decimal("84"),
    },
    {
        "suffix": "LOG",
        "name": "Plateforme de stockage et voiries",
        "project_type": "public_market",
        "location": "Garoua",
        "client_index": 4,
        "budget": Decimal("760000000"),
        "contract": Decimal("910000000"),
        "progress": Decimal("37"),
        "physical_progress": Decimal("32"),
        "financial_progress": Decimal("29"),
    },
]

PAYROLL_PERIOD_OFFSETS = [6, 5, 4, 3, 2, 1]
LEAVE_TYPES = ["paid_leave", "permission", "sick_leave", "exceptional_leave"]
LEAVE_STATUSES = ["approved", "submitted", "rejected", "resolved"]


@dataclass
class ActorSet:
    primary: User
    finance: User
    approver: User
    payroll: User
    project: User
    site: User


def qmoney(value: Decimal | int | float | str) -> Decimal:
    amount = Decimal(str(value))
    return amount.quantize(MONEY_STEP, rounding=ROUND_HALF_UP)


def qamount(value: Decimal | int | float | str) -> Decimal:
    amount = Decimal(str(value))
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def money_text(value: Decimal | int | float | str) -> str:
    return str(qmoney(value).quantize(Decimal("1")))


def amount_text(value: Decimal | int | float | str) -> str:
    return str(qamount(value))


def end_of_month(month_start: date) -> date:
    return date(month_start.year, month_start.month, monthrange(month_start.year, month_start.month)[1])


def add_months(anchor: date, months: int) -> date:
    year = anchor.year + ((anchor.month - 1 + months) // 12)
    month = ((anchor.month - 1 + months) % 12) + 1
    return date(year, month, 1)


def first_day_previous_months(reference: date, offset: int) -> date:
    this_month = date(reference.year, reference.month, 1)
    return add_months(this_month, -offset)


def role_codes_for(company_id: int, user_id: int) -> set[str]:
    rows = (
        db.session.query(Role.code)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.company_id == company_id, UserRole.user_id == user_id)
        .all()
    )
    return {str(code).strip().lower() for (code,) in rows if code}


def operational_profile_for(user: User) -> str | None:
    return infer_operational_profile_code(
        role_codes=role_codes_for(user.company_id, user.id),
        job_title=user.job_title,
        department=user.department,
    )


def pick_user(users: list[User], profile_codes: list[str], fallback: User) -> User:
    for profile_code in profile_codes:
        for user in users:
            if operational_profile_for(user) == profile_code:
                return user
    return fallback


def resolve_actors(company_id: int) -> ActorSet:
    users = (
        User.query.filter(User.company_id == company_id, User.deleted_at.is_(None), User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )
    if not users:
        raise RuntimeError(f"No active users found for company {company_id}")

    primary = next((user for user in users if user.user_type == "company_admin"), users[0])
    finance = pick_user(users, ["comptable", "controleur_gestion", "daf"], primary)
    approver = pick_user(users, ["daf", "directeur_administratif", "directeur_general"], primary)
    payroll = pick_user(users, ["responsable_rh", "rh_recruteur", "daf"], approver)
    project = pick_user(users, ["chef_projet", "directeur_technique", "company_admin"], primary)
    site = pick_user(users, ["conducteur_travaux", "chef_chantier", "chef_projet"], project)
    return ActorSet(
        primary=primary,
        finance=finance,
        approver=approver,
        payroll=payroll,
        project=project,
        site=site,
    )


def company_slug(company: Company) -> str:
    base = (company.acronym or company.trade_name or company.legal_name or f"C{company.id}").upper()
    letters = [char for char in base if char.isalnum()]
    return "".join(letters[:6]) or f"C{company.id}"


def ensure_user_salary_defaults(company_id: int) -> int:
    updated = 0
    users = (
        User.query.filter(User.company_id == company_id, User.deleted_at.is_(None), User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )
    for index, user in enumerate(users, start=1):
        profile = operational_profile_for(user)
        if user.base_salary is None:
            salary = {
                "directeur_general": Decimal("1800000"),
                "daf": Decimal("1450000"),
                "directeur_technique": Decimal("1350000"),
                "chef_projet": Decimal("980000"),
                "conducteur_travaux": Decimal("720000"),
                "chef_chantier": Decimal("540000"),
                "comptable": Decimal("520000"),
                "responsable_rh": Decimal("650000"),
                "assistant_administratif": Decimal("280000"),
                "ouvrier": Decimal("145000"),
            }.get(profile, Decimal("240000") + Decimal(index * 10000))
            user.base_salary = qmoney(salary)
            updated += 1
        if user.hire_date is None:
            user.hire_date = date(2024, 1, 1) + timedelta(days=index * 11)
            updated += 1
    if updated:
        db.session.commit()
    return updated


def cleanup_workbench_invoice_payment_duplicates(company_id: int) -> int:
    duplicate_groups: dict[tuple[int, str], list[Payment]] = {}
    rows = (
        Payment.query.filter(
            Payment.company_id == company_id,
            Payment.invoice_id.isnot(None),
            Payment.external_reference.like("WB-REG%"),
        )
        .order_by(Payment.invoice_id.asc(), Payment.external_reference.asc(), Payment.id.asc())
        .all()
    )
    for row in rows:
        duplicate_groups.setdefault((int(row.invoice_id), row.external_reference), []).append(row)

    removed = 0
    touched_treasury_ids: set[int] = set()
    touched_invoice_ids: set[int] = set()

    for (invoice_id, reference), payments in duplicate_groups.items():
        if len(payments) <= 1:
            continue
        for payment in payments[1:]:
            if payment.treasury_account_id is not None:
                touched_treasury_ids.add(int(payment.treasury_account_id))
            touched_invoice_ids.add(invoice_id)
            TreasuryMovement.query.filter_by(company_id=company_id, payment_id=payment.id).delete(synchronize_session=False)
            db.session.delete(payment)
            duplicate_invoice_payments = (
                InvoicePayment.query.filter_by(company_id=company_id, invoice_id=invoice_id, reference=reference)
                .order_by(InvoicePayment.id.asc())
                .all()
            )
            for invoice_payment in duplicate_invoice_payments[1:]:
                db.session.delete(invoice_payment)
            removed += 1

    if not removed:
        return 0

    db.session.flush()
    for invoice_id in touched_invoice_ids:
        invoice = Invoice.query.filter_by(company_id=company_id, id=invoice_id).first()
        if invoice is None:
            continue
        payments_total = sum(
            (Decimal(row.amount or 0) for row in InvoicePayment.query.filter_by(company_id=company_id, invoice_id=invoice_id).all()),
            Decimal("0.00"),
        )
        invoice.amount_paid = payments_total
        if payments_total >= Decimal(invoice.amount_total or 0):
            invoice.status = "paid"
            last_payment = (
                InvoicePayment.query.filter_by(company_id=company_id, invoice_id=invoice_id)
                .order_by(InvoicePayment.payment_date.desc(), InvoicePayment.id.desc())
                .first()
            )
            invoice.paid_on = last_payment.payment_date if last_payment is not None else invoice.paid_on
        elif payments_total > 0:
            invoice.status = "partially_paid"
            invoice.paid_on = None
        elif invoice.status not in {"draft", "cancelled"}:
            invoice.status = "sent"
            invoice.paid_on = None
    db.session.flush()

    for treasury_account_id in touched_treasury_ids:
        _recompute_treasury_account_balances(company_id, treasury_account_id)
    db.session.commit()
    return removed


def ensure_reference_data(company_id: int) -> tuple[dict[str, TreasuryAccount], dict[str, BusinessPartner]]:
    _ensure_finance_reference_data(company_id)

    treasury_by_code: dict[str, TreasuryAccount] = {
        row.code: row
        for row in TreasuryAccount.query.filter(
            TreasuryAccount.company_id == company_id,
            TreasuryAccount.deleted_at.is_(None),
        ).all()
    }
    for payload in WORKBENCH_TREASURY_SPECS:
        if payload["code"] in treasury_by_code:
            continue
        create_treasury_account(company_id, payload)
        treasury_by_code[payload["code"]] = TreasuryAccount.query.filter_by(company_id=company_id, code=payload["code"]).first()

    partner_by_code: dict[str, BusinessPartner] = {
        row.code: row
        for row in BusinessPartner.query.filter(
            BusinessPartner.company_id == company_id,
            BusinessPartner.deleted_at.is_(None),
        ).all()
    }
    for payload in WORKBENCH_PARTNER_SPECS:
        if payload["code"] in partner_by_code:
            continue
        create_business_partner(company_id, payload)
        partner_by_code[payload["code"]] = BusinessPartner.query.filter_by(company_id=company_id, code=payload["code"]).first()

    return treasury_by_code, partner_by_code


def ensure_projects(company: Company, minimum_count: int = DEFAULT_MIN_PROJECTS) -> list[Project]:
    existing_projects = (
        Project.query.filter(Project.company_id == company.id, Project.deleted_at.is_(None))
        .order_by(Project.id.asc())
        .all()
    )
    if len(existing_projects) >= minimum_count:
        return existing_projects

    customer_partners = (
        BusinessPartner.query.filter(
            BusinessPartner.company_id == company.id,
            BusinessPartner.deleted_at.is_(None),
            BusinessPartner.partner_type.in_(("customer", "both")),
        )
        .order_by(BusinessPartner.id.asc())
        .all()
    )
    if not customer_partners:
        raise RuntimeError(f"No customer partners found for company {company.id}")

    slug = company_slug(company)
    created = 0
    for blueprint in WORKBENCH_PROJECT_BLUEPRINTS:
        if len(existing_projects) + created >= minimum_count:
            break
        project_code = f"{slug}-{blueprint['suffix']}-{company.id:02d}"
        if Project.query.filter(Project.company_id == company.id, Project.code == project_code, Project.deleted_at.is_(None)).first():
            continue
        client = customer_partners[blueprint["client_index"] % len(customer_partners)]
        start_date = date(2025, 8, 1) + timedelta(days=created * 17)
        end_date = start_date + timedelta(days=320 + created * 21)
        create_project(
            company.id,
            {
                "code": project_code,
                "name": f"{blueprint['name']} - {company.trade_name or company.legal_name}",
                "market_reference": f"WB/{slug}/{created + 1:03d}/2026",
                "project_type": blueprint["project_type"],
                "description": f"Projet seed workbench pour densifier le pilotage finance et chantier sur {blueprint['location']}.",
                "location": blueprint["location"],
                "client_name": client.legal_name,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "estimated_duration_days": (end_date - start_date).days,
                "status": "in_progress",
                "budget_amount": money_text(blueprint["budget"]),
                "contract_amount": money_text(blueprint["contract"]),
                "progress_percent": str(blueprint["progress"]),
                "physical_progress_percent": str(blueprint["physical_progress"]),
                "financial_progress_percent": str(blueprint["financial_progress"]),
                "dao_number": f"DAO-{slug}-{created + 1:03d}",
                "contracting_authority": client.legal_name,
                "publication_date": (start_date - timedelta(days=120)).isoformat(),
                "submission_date": (start_date - timedelta(days=75)).isoformat(),
                "award_date": (start_date - timedelta(days=35)).isoformat(),
                "contract_duration_days": (end_date - start_date).days,
                "funding_source": "Portefeuille investissement BTP",
            },
        )
        created += 1

    return (
        Project.query.filter(Project.company_id == company.id, Project.deleted_at.is_(None))
        .order_by(Project.id.asc())
        .all()
    )


def budget_lines_for(project: Project, total_budget: Decimal) -> list[dict[str, str]]:
    material = qmoney(total_budget * Decimal("0.34"))
    labor = qmoney(total_budget * Decimal("0.26"))
    equipment = qmoney(total_budget * Decimal("0.18"))
    supervision = qmoney(total_budget - material - labor - equipment)
    return [
        {"category": "materials", "label": f"Materiaux structurants - {project.location or project.name}", "planned_amount": money_text(material)},
        {"category": "labor", "label": "Main d'oeuvre et sous-traitance", "planned_amount": money_text(labor)},
        {"category": "equipment", "label": "Materiel, engins et maintenance", "planned_amount": money_text(equipment)},
        {"category": "supervision", "label": "Pilotage, HSE et coordination", "planned_amount": money_text(supervision)},
    ]


def ensure_budgets(company_id: int, project: Project, approver_user_id: int) -> int:
    base_budget = qmoney(project.budget_amount or project.contract_amount or Decimal("480000000"))
    versions = [
        ("Budget initial 2026", qmoney(base_budget * Decimal("0.97")), "approved"),
        ("Reforecast T2 2026", qmoney(base_budget * Decimal("1.03")), "approved"),
        ("Scenario prudent T3 2026", qmoney(base_budget * Decimal("1.08")), "draft"),
    ]
    created = 0
    for label, total_budget, status in versions:
        existing = ProjectBudget.query.filter_by(company_id=company_id, project_id=project.id, version_label=label).first()
        if existing is None:
            create_project_budget(
                company_id,
                {
                    "project_id": project.id,
                    "version_label": label,
                    "status": "draft",
                    "notes": f"Version de travail generee pour {project.code}.",
                    "lines": budget_lines_for(project, total_budget),
                },
            )
            created += 1
            existing = ProjectBudget.query.filter_by(company_id=company_id, project_id=project.id, version_label=label).first()
        if status == "approved" and existing is not None and existing.status != "approved":
            approve_project_budget(company_id, existing.id, approver_user_id)
    return created


def ensure_general_entries(company_id: int, actor_user_id: int, months: int) -> int:
    created = 0
    for offset in range(months, 0, -1):
        month_start = first_day_previous_months(date.today(), offset)
        expense_reference = f"WB-ENTRY-EXP-{month_start.strftime('%Y%m')}"
        revenue_reference = f"WB-ENTRY-REV-{month_start.strftime('%Y%m')}"

        if not FinanceEntry.query.filter_by(company_id=company_id, reference=expense_reference).first():
            create_finance_entry(
                company_id,
                actor_user_id,
                {
                    "entry_type": "expense",
                    "category": "frais_generaux",
                    "amount": money_text(Decimal("4500000") + Decimal(offset * 350000)),
                    "currency": "XAF",
                    "entry_date": (month_start + timedelta(days=4)).isoformat(),
                    "payment_method": "bank_transfer",
                    "vendor_name": "Services bancaires et administratifs",
                    "reference": expense_reference,
                    "description": "Frais generaux et charges administratives workbench.",
                },
            )
            created += 1

        if not FinanceEntry.query.filter_by(company_id=company_id, reference=revenue_reference).first():
            create_finance_entry(
                company_id,
                actor_user_id,
                {
                    "entry_type": "revenue",
                    "category": "produits_divers",
                    "amount": money_text(Decimal("6200000") + Decimal(offset * 280000)),
                    "currency": "XAF",
                    "entry_date": (month_start + timedelta(days=8)).isoformat(),
                    "payment_method": "bank_transfer",
                    "vendor_name": "Produits annexes et remboursements",
                    "reference": revenue_reference,
                    "description": "Produits divers, refacturations et reprises.",
                },
            )
            created += 1
    return created


def revenue_amounts(project: Project, month_offset: int, slot_index: int) -> Decimal:
    base = Decimal(project.contract_amount or project.budget_amount or Decimal("500000000"))
    factor = Decimal("0.017") + Decimal(month_offset) * Decimal("0.0014") + Decimal(slot_index) * Decimal("0.002")
    return qmoney(base * factor)


def expense_amounts(project: Project, month_offset: int, slot_index: int) -> Decimal:
    base = Decimal(project.budget_amount or project.contract_amount or Decimal("420000000"))
    factor = Decimal("0.012") + Decimal(month_offset) * Decimal("0.0011") + Decimal(slot_index) * Decimal("0.0015")
    return qmoney(base * factor)


def customer_and_supplier(project_index: int, customers: list[BusinessPartner], suppliers: list[BusinessPartner]) -> tuple[BusinessPartner, BusinessPartner]:
    customer = customers[project_index % len(customers)]
    supplier = suppliers[project_index % len(suppliers)]
    return customer, supplier


def payment_exists(
    company_id: int,
    *,
    external_reference: str,
    invoice_id: int | None = None,
    expense_id: int | None = None,
    revenue_id: int | None = None,
) -> bool:
    return (
        Payment.query.filter_by(
            company_id=company_id,
            invoice_id=invoice_id,
            expense_id=expense_id,
            revenue_id=revenue_id,
            external_reference=external_reference,
        ).first()
        is not None
    )


def ensure_project_activity(
    company_id: int,
    project: Project,
    project_index: int,
    actors: ActorSet,
    treasury: dict[str, TreasuryAccount],
    partners: dict[str, BusinessPartner],
    months: int,
) -> dict[str, int]:
    customers = [row for row in partners.values() if row.partner_type in {"customer", "both"}]
    suppliers = [row for row in partners.values() if row.partner_type in {"supplier", "both"}]
    if not customers or not suppliers:
        raise RuntimeError(f"Partners are incomplete for company {company_id}")

    main_bank = treasury["WB-BNK-001"]
    secondary_bank = treasury["WB-BNK-002"]
    mobile_account = treasury["WB-MOMO-003"]
    customer, supplier = customer_and_supplier(project_index, customers, suppliers)
    created = {"expenses": 0, "revenues": 0, "invoices": 0, "payments": 0, "reports": 0}

    for offset in range(months, 0, -1):
        month_start = first_day_previous_months(date.today(), offset)
        issue_date = month_start + timedelta(days=11 + (project_index % 4))
        due_date = issue_date + timedelta(days=45 + (project_index % 3) * 15)

        for slot_index, category in enumerate(["materials", "labor", "logistics"], start=1):
            expense_number = f"WB-EXP-{project.id}-{month_start.strftime('%Y%m')}-{slot_index}"
            amount = expense_amounts(project, offset, slot_index)
            if not ExpenseRecord.query.filter_by(company_id=company_id, expense_number=expense_number).first():
                creation_status = "pending" if slot_index == 3 and offset <= 2 else "draft"
                payload = {
                    "project_id": project.id,
                    "partner_id": supplier.id,
                    "expense_number": expense_number,
                    "category": category,
                    "amount": money_text(amount),
                    "currency": "XAF",
                    "expense_date": (month_start + timedelta(days=slot_index * 3)).isoformat(),
                    "payment_method": "bank_transfer" if slot_index != 3 else "mobile_money",
                    "document_reference": f"WB-JUST-{project.id}-{month_start.strftime('%Y%m')}-{slot_index}",
                    "attachment_urls": [f"https://demo.t-erp.local/finance/{expense_number.lower()}.pdf"],
                    "description": f"Depense {category} chantier pour {project.code}.",
                    "approval_status": creation_status,
                }
                create_expense_record(company_id, actors.finance.id, payload)
                created["expenses"] += 1

            row = ExpenseRecord.query.filter_by(company_id=company_id, expense_number=expense_number).first()
            if row is None:
                continue

            if row.approval_status != "approved" and not (slot_index == 3 and offset <= 2):
                approve_expense_record(
                    company_id,
                    row.id,
                    actors.approver.id,
                    {
                        "treasury_account_id": None,
                        "payment_method": row.payment_method or "bank_transfer",
                    },
                )
            if row.approval_status == "approved" and row.payment_status != "paid" and slot_index == 1:
                expense_payment_ref_1 = f"WB-PAY1-{expense_number}"
                if Decimal(row.paid_amount or 0) == 0 and not payment_exists(
                    company_id,
                    expense_id=row.id,
                    external_reference=expense_payment_ref_1,
                ):
                    record_expense_payment(
                        company_id,
                        row.id,
                        actors.finance.id,
                        {
                            "amount": money_text(qmoney(Decimal(row.amount) * Decimal("0.55"))),
                            "payment_date": (row.expense_date + timedelta(days=8)).isoformat(),
                            "payment_method": row.payment_method or "bank_transfer",
                            "treasury_account_id": secondary_bank.id,
                            "reference": expense_payment_ref_1,
                            "notes": "Premier decaissement chantier.",
                        },
                    )
                    created["payments"] += 1
                refreshed = ExpenseRecord.query.filter_by(company_id=company_id, id=row.id).first()
                expense_payment_ref_2 = f"WB-PAY2-{expense_number}"
                if refreshed and refreshed.payment_status != "paid" and not payment_exists(
                    company_id,
                    expense_id=refreshed.id,
                    external_reference=expense_payment_ref_2,
                ):
                    record_expense_payment(
                        company_id,
                        refreshed.id,
                        actors.finance.id,
                        {
                            "amount": money_text(Decimal(refreshed.amount) - Decimal(refreshed.paid_amount or 0)),
                            "payment_date": (refreshed.expense_date + timedelta(days=18)).isoformat(),
                            "payment_method": refreshed.payment_method or "bank_transfer",
                            "treasury_account_id": main_bank.id,
                            "reference": expense_payment_ref_2,
                            "notes": "Solde depense chantier.",
                        },
                    )
                    created["payments"] += 1
            elif row.approval_status == "approved" and row.payment_status != "paid" and slot_index == 2:
                approve_expense_record(
                    company_id,
                    row.id,
                    actors.approver.id,
                    {
                        "treasury_account_id": mobile_account.id,
                        "payment_method": "mobile_money",
                    },
                )
                created["payments"] += 1

        for slot_index, revenue_type in enumerate(["situation", "avenant"], start=1):
            revenue_number = f"WB-REV-{project.id}-{month_start.strftime('%Y%m')}-{slot_index}"
            amount = revenue_amounts(project, offset, slot_index)
            if not RevenueRecord.query.filter_by(company_id=company_id, revenue_number=revenue_number).first():
                create_revenue_record(
                    company_id,
                    actors.finance.id,
                    {
                        "project_id": project.id,
                        "partner_id": customer.id,
                        "revenue_number": revenue_number,
                        "revenue_type": revenue_type,
                        "amount": money_text(amount),
                        "currency": "XAF",
                        "revenue_date": (month_start + timedelta(days=15 + slot_index)).isoformat(),
                        "payment_method": "bank_transfer",
                        "reference": f"WB-SIT-{project.id}-{month_start.strftime('%Y%m')}-{slot_index}",
                        "description": f"Recette {revenue_type} pour {project.code}.",
                    },
                )
                created["revenues"] += 1

            revenue = RevenueRecord.query.filter_by(company_id=company_id, revenue_number=revenue_number).first()
            if revenue is None:
                continue
            revenue_collection_ref_1 = f"WB-RCOL1-{revenue_number}"
            if revenue.collection_status == "uncollected" and slot_index == 1 and not payment_exists(
                company_id,
                revenue_id=revenue.id,
                external_reference=revenue_collection_ref_1,
            ):
                record_revenue_collection(
                    company_id,
                    revenue.id,
                    actors.finance.id,
                    {
                        "amount": money_text(qmoney(Decimal(revenue.amount) * Decimal("0.70"))),
                        "payment_date": (revenue.revenue_date + timedelta(days=9)).isoformat(),
                        "payment_method": "bank_transfer",
                        "treasury_account_id": main_bank.id,
                        "reference": revenue_collection_ref_1,
                        "notes": "Encaissement partiel situation.",
                    },
                )
                created["payments"] += 1
            revenue = RevenueRecord.query.filter_by(company_id=company_id, revenue_number=revenue_number).first()
            revenue_collection_ref_2 = f"WB-RCOL2-{revenue_number}"
            if revenue and revenue.collection_status != "collected" and slot_index == 2 and offset <= 3 and not payment_exists(
                company_id,
                revenue_id=revenue.id,
                external_reference=revenue_collection_ref_2,
            ):
                record_revenue_collection(
                    company_id,
                    revenue.id,
                    actors.finance.id,
                    {
                        "amount": money_text(Decimal(revenue.amount) - Decimal(revenue.collected_amount or 0)),
                        "payment_date": (revenue.revenue_date + timedelta(days=20)).isoformat(),
                        "payment_method": "bank_transfer",
                        "treasury_account_id": secondary_bank.id,
                        "reference": revenue_collection_ref_2,
                        "notes": "Solde avenant ou situation complementaire.",
                    },
                )
                created["payments"] += 1

        invoice_number = f"WB-FAC-{project.id}-{month_start.strftime('%Y%m')}"
        invoice_amount = qmoney(revenue_amounts(project, offset, 1) * Decimal("1.18"))
        if not Invoice.query.filter_by(company_id=company_id, invoice_number=invoice_number).first():
            create_invoice(
                company_id,
                {
                    "project_id": project.id,
                    "customer_id": customer.id,
                    "invoice_number": invoice_number,
                    "issued_on": issue_date.isoformat(),
                    "due_on": due_date.isoformat(),
                    "status": "sent",
                    "tax_rate": "19.25",
                    "currency": "XAF",
                    "lines": [
                        {
                            "description": f"Situation principale {project.code} - {month_start.strftime('%m/%Y')}",
                            "quantity": "1",
                            "unit_price": money_text(qmoney(invoice_amount * Decimal("0.68"))),
                        },
                        {
                            "description": f"Lots complementaires et retenues liberees {project.code}",
                            "quantity": "1",
                            "unit_price": money_text(qmoney(invoice_amount * Decimal("0.32"))),
                        },
                    ],
                },
            )
            created["invoices"] += 1

        invoice = Invoice.query.filter_by(company_id=company_id, invoice_number=invoice_number).first()
        if invoice is None:
            continue
        if offset >= 5:
            target_paid_ratio = Decimal("0")
        elif offset >= 3:
            target_paid_ratio = Decimal("0.45")
        else:
            target_paid_ratio = Decimal("1.00") if (project_index + offset) % 2 == 0 else Decimal("0.72")

        target_paid_amount = min(qmoney(Decimal(invoice.amount_total) * target_paid_ratio), Decimal(invoice.amount_total))
        current_paid_amount = Decimal(invoice.amount_paid or 0)
        if target_paid_amount > current_paid_amount:
            outstanding_target = target_paid_amount - current_paid_amount
            first_payment = min(qmoney(outstanding_target * Decimal("0.62")), outstanding_target)
            first_payment = first_payment if first_payment > 0 else outstanding_target
            invoice_payment_ref_1 = f"WB-REG1-{invoice_number}"
            if first_payment > 0 and not payment_exists(
                company_id,
                invoice_id=invoice.id,
                external_reference=invoice_payment_ref_1,
            ):
                record_invoice_payment(
                    company_id,
                    invoice.id,
                    actors.finance.id,
                    {
                        "amount": money_text(first_payment),
                        "payment_date": (invoice.issued_on + timedelta(days=18)).isoformat(),
                        "payment_method": "bank_transfer",
                        "treasury_account_id": main_bank.id,
                        "reference": invoice_payment_ref_1,
                        "notes": "Premier reglement client.",
                    },
                )
                created["payments"] += 1
            refreshed_invoice = Invoice.query.filter_by(company_id=company_id, id=invoice.id).first()
            invoice_payment_ref_2 = f"WB-REG2-{invoice_number}"
            if refreshed_invoice:
                remaining_target = target_paid_amount - Decimal(refreshed_invoice.amount_paid or 0)
                if remaining_target > 0 and not payment_exists(
                    company_id,
                    invoice_id=refreshed_invoice.id,
                    external_reference=invoice_payment_ref_2,
                ):
                    record_invoice_payment(
                        company_id,
                        refreshed_invoice.id,
                        actors.finance.id,
                        {
                            "amount": money_text(remaining_target),
                            "payment_date": (refreshed_invoice.issued_on + timedelta(days=34)).isoformat(),
                            "payment_method": "bank_transfer",
                            "treasury_account_id": secondary_bank.id,
                            "reference": invoice_payment_ref_2,
                            "notes": "Complement de reglement client.",
                        },
                    )
                    created["payments"] += 1

        report_date = end_of_month(month_start) - timedelta(days=2 + (project_index % 4))
        if not ProjectReport.query.filter_by(company_id=company_id, project_id=project.id, report_date=report_date).first():
            create_project_report(
                company_id,
                project.id,
                actors.site.id,
                {
                    "report_date": report_date.isoformat(),
                    "report_type": "weekly" if offset % 2 == 0 else "monthly",
                    "weather": "Sec" if offset % 3 else "Pluie",
                    "summary": f"Point chantier {project.code} sur {month_start.strftime('%m/%Y')}: budget, production et delais consolides.",
                    "activities_summary": "Avancement, approvisionnements, main d'oeuvre et levier de marge suivis dans le workbench finance.",
                    "personnel_present": 14 + project_index * 5 + max(0, months - offset),
                    "incidents": "RAS" if offset % 3 else "Tension appro ponctuelle sur materiaux critiques.",
                    "observations": "Le reporting terrain remonte les couts reels pour ajuster les arbitrages financiers.",
                    "blockers": "Aucun blocage majeur." if offset > 2 else "Delai client sur validation de situation.",
                },
            )
            created["reports"] += 1

    return created


def ensure_payroll_profiles(company_id: int, actors: ActorSet) -> int:
    created_or_updated = 0
    users = (
        User.query.filter(User.company_id == company_id, User.deleted_at.is_(None), User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )
    for index, user in enumerate(users, start=1):
        profile_payload = {
            "category": "Cadre" if (user.base_salary or 0) >= 600000 else "Employe",
            "echelon": f"E{(index % 5) + 1}",
            "cnps_number": f"CNPS-{company_id:02d}-{user.id:04d}",
            "convention_collective": "BTP Cameroun",
            "employment_label": user.job_title or "Collaborateur",
            "hours_schedule": "173.33 h / mois",
            "family_status": "marie" if index % 3 == 0 else "celibataire",
            "bank_account_number": f"1002{company_id:02d}{user.id:04d}8841",
            "bank_domiciliation": "Banque workbench BTP",
            "payment_method": "bank_transfer",
            "transport_allowance": money_text(Decimal("20000") + Decimal((index % 4) * 5000)),
            "other_fixed_gains": money_text(Decimal((index % 3) * 12000)),
            "payroll_notes": "Profil paie enrichi pour simulation budgetaire et cashflow.",
            "is_payroll_enabled": True,
        }
        upsert_payroll_employee_profile(company_id, user_id=user.id, payload=profile_payload, actor_user_id=actors.payroll.id)
        created_or_updated += 1
    return created_or_updated


def ensure_leave_requests(company_id: int, actors: ActorSet) -> int:
    users = (
        User.query.filter(User.company_id == company_id, User.deleted_at.is_(None), User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )
    if not users:
        return 0

    created = 0
    for index in range(min(12, len(users) * 2)):
        user = users[index % len(users)]
        request_key = f"WB-LR-{company_id}-{user.id}-{index + 1:02d}"
        if PayrollLeaveRequest.query.filter_by(company_id=company_id, user_id=user.id, client_request_id=request_key).first():
            continue
        start_date = date.today() - timedelta(days=75 - index * 4)
        duration = Decimal((index % 4) + 1)
        status = LEAVE_STATUSES[index % len(LEAVE_STATUSES)]
        reviewed_at = datetime.now(UTC) - timedelta(days=index) if status in {"approved", "rejected", "resolved"} else None
        db.session.add(
            PayrollLeaveRequest(
                company_id=company_id,
                user_id=user.id,
                client_request_id=request_key,
                type=LEAVE_TYPES[index % len(LEAVE_TYPES)],
                title=f"Demande conge workbench {index + 1}",
                start_date=start_date,
                end_date=start_date + timedelta(days=int(duration) - 1),
                days_requested=duration,
                reason="Simulation RH pour projection paie et disponibilite chantier.",
                contact=user.phone or "N/A",
                handover_note="Transmission anticipee au chef de projet et au controle budgetaire.",
                status=status,
                reviewed_by_user_id=actors.payroll.id if reviewed_at else None,
                reviewed_at=reviewed_at,
            )
        )
        created += 1
    if created:
        db.session.commit()
    return created


def ensure_payroll_runs(company_id: int, actors: ActorSet) -> int:
    users = (
        User.query.filter(User.company_id == company_id, User.deleted_at.is_(None), User.is_active.is_(True))
        .order_by(User.id.asc())
        .all()
    )
    if not users:
        return 0

    created_runs = 0
    for offset in PAYROLL_PERIOD_OFFSETS:
        month_start = first_day_previous_months(date.today(), offset)
        period_key = month_start.strftime("%Y-%m")
        period = PayrollPeriod.query.filter_by(company_id=company_id, period_key=period_key).first()
        existing_run = None
        if period is not None:
            existing_run = PayrollRun.query.filter_by(company_id=company_id, payroll_period_id=period.id).first()
        if existing_run is not None:
            continue

        employee_inputs = []
        for index, user in enumerate(users, start=1):
            employee_inputs.append(
                {
                    "user_id": user.id,
                    "days_paid": 22 + ((index + offset) % 5),
                    "late_hours": round(((index + offset) % 4) * 0.75, 2),
                    "transport_allowance": float(qmoney(Decimal("20000") + Decimal((index % 4) * 5000))),
                    "other_gains": float(qmoney(Decimal(((index + offset) % 3) * 15000))),
                    "payment_method": "bank_transfer",
                    "observation": f"Simulation paie {period_key} pour projection budgetaire et tresorerie.",
                }
            )

        generate_monthly_payslips_via_db(
            company_id=company_id,
            actor_user_id=actors.payroll.id,
            payload={
                "period_key": period_key,
                "label": f"Paie {month_start.strftime('%m/%Y')}",
                "start_date": month_start.isoformat(),
                "end_date": end_of_month(month_start).isoformat(),
                "payment_date": (end_of_month(month_start) + timedelta(days=2)).isoformat(),
                "employee_inputs": employee_inputs,
                "dry_run": False,
                "include_lines": False,
                "allow_override": True,
                "include_inactive": False,
            },
        )
        created_runs += 1
    return created_runs


def seed_company(company: Company, *, months: int) -> dict[str, int]:
    ensure_user_salary_defaults(company.id)
    actors = resolve_actors(company.id)
    treasury, partners = ensure_reference_data(company.id)
    projects = ensure_projects(company, minimum_count=DEFAULT_MIN_PROJECTS)

    counts = {
        "projects": 0,
        "budgets": 0,
        "general_entries": 0,
        "expenses": 0,
        "revenues": 0,
        "invoices": 0,
        "payments": 0,
        "reports": 0,
        "payroll_profiles": 0,
        "payroll_runs": 0,
        "leave_requests": 0,
    }

    counts["general_entries"] = ensure_general_entries(company.id, actors.finance.id, months)
    counts["projects"] = len(projects)

    for project_index, project in enumerate(projects):
        counts["budgets"] += ensure_budgets(company.id, project, actors.approver.id)
        activity = ensure_project_activity(company.id, project, project_index, actors, treasury, partners, months)
        counts["expenses"] += activity["expenses"]
        counts["revenues"] += activity["revenues"]
        counts["invoices"] += activity["invoices"]
        counts["payments"] += activity["payments"]
        counts["reports"] += activity["reports"]

    counts["payroll_profiles"] = ensure_payroll_profiles(company.id, actors)
    counts["leave_requests"] = ensure_leave_requests(company.id, actors)
    counts["payroll_runs"] = ensure_payroll_runs(company.id, actors)
    return counts


def company_summary(company_id: int) -> dict[str, int]:
    return {
        "accounts": AccountingAccount.query.filter(AccountingAccount.company_id == company_id, AccountingAccount.deleted_at.is_(None)).count(),
        "journals": AccountingJournal.query.filter(AccountingJournal.company_id == company_id).count(),
        "partners": BusinessPartner.query.filter(BusinessPartner.company_id == company_id, BusinessPartner.deleted_at.is_(None)).count(),
        "treasury_accounts": TreasuryAccount.query.filter(TreasuryAccount.company_id == company_id, TreasuryAccount.deleted_at.is_(None)).count(),
        "projects": Project.query.filter(Project.company_id == company_id, Project.deleted_at.is_(None)).count(),
        "budgets": ProjectBudget.query.filter(ProjectBudget.company_id == company_id, ProjectBudget.deleted_at.is_(None)).count(),
        "entries": FinanceEntry.query.filter(FinanceEntry.company_id == company_id, FinanceEntry.deleted_at.is_(None)).count(),
        "expenses": ExpenseRecord.query.filter(ExpenseRecord.company_id == company_id, ExpenseRecord.deleted_at.is_(None)).count(),
        "revenues": RevenueRecord.query.filter(RevenueRecord.company_id == company_id, RevenueRecord.deleted_at.is_(None)).count(),
        "invoices": Invoice.query.filter(Invoice.company_id == company_id, Invoice.deleted_at.is_(None)).count(),
        "payments": Payment.query.filter(Payment.company_id == company_id).count(),
        "reports": ProjectReport.query.filter(ProjectReport.company_id == company_id).count(),
        "payroll_profiles": EmployeePayrollProfile.query.filter_by(company_id=company_id).count(),
        "payroll_periods": PayrollPeriod.query.filter_by(company_id=company_id).count(),
        "payroll_runs": PayrollRun.query.filter_by(company_id=company_id).count(),
        "leave_requests": PayrollLeaveRequest.query.filter_by(company_id=company_id).count(),
    }


def main() -> int:
    requested_company_ids = {int(arg.split("=", 1)[1]) for arg in sys.argv[1:] if arg.startswith("--company-id=")}
    months = next((int(arg.split("=", 1)[1]) for arg in sys.argv[1:] if arg.startswith("--months=")), DEFAULT_MONTHS)

    app = create_app()
    with app.app_context():
        companies_query = Company.query.filter(
            Company.is_active.is_(True),
            Company.account_status == "active",
        ).order_by(Company.id.asc())
        companies = companies_query.all()
        if requested_company_ids:
            companies = [company for company in companies if company.id in requested_company_ids]

        if not companies:
            print("[seed-finance] No active company matched the selection.")
            return 1

        print(f"[seed-finance] Starting finance workbench seed on {len(companies)} company(ies).")
        for company in companies:
            counts = seed_company(company, months=months)
            summary = company_summary(company.id)
            print(f"[seed-finance] Company {company.id} - {company.legal_name}")
            print(
                "  created/updated:"
                f" projects={counts['projects']}"
                f" budgets={counts['budgets']}"
                f" entries={counts['general_entries']}"
                f" expenses={counts['expenses']}"
                f" revenues={counts['revenues']}"
                f" invoices={counts['invoices']}"
                f" payments={counts['payments']}"
                f" reports={counts['reports']}"
                f" payroll_profiles={counts['payroll_profiles']}"
                f" payroll_runs={counts['payroll_runs']}"
                f" leave_requests={counts['leave_requests']}"
            )
            print(
                "  totals:"
                f" accounts={summary['accounts']}"
                f" journals={summary['journals']}"
                f" partners={summary['partners']}"
                f" treasury_accounts={summary['treasury_accounts']}"
                f" projects={summary['projects']}"
                f" budgets={summary['budgets']}"
                f" entries={summary['entries']}"
                f" expenses={summary['expenses']}"
                f" revenues={summary['revenues']}"
                f" invoices={summary['invoices']}"
                f" payments={summary['payments']}"
                f" reports={summary['reports']}"
                f" payroll_profiles={summary['payroll_profiles']}"
                f" payroll_periods={summary['payroll_periods']}"
                f" payroll_runs={summary['payroll_runs']}"
                f" leave_requests={summary['leave_requests']}"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
