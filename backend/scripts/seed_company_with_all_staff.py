import os
import sys
from datetime import date
from pathlib import Path
from typing import Any

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
load_dotenv(BACKEND_DIR / ".env")

from app import create_app
from app.core.default_profiles import DEFAULT_PERMISSION_CODES, ensure_company_admin_role, ensure_default_global_profiles, ensure_permissions_exist
from app.extensions import db
from app.models.company import Company, CompanySetting
from app.models.finance import AccountingPeriod, BusinessPartner, ExpenseRecord, Invoice, InvoicePayment, ProjectBudget, RevenueRecord, TreasuryAccount
from app.models.project import Project, ProjectAssignment, ProjectChangeOrder, ProjectDocument, ProjectReport, ProjectRisk, ProjectTask
from app.models.user import User
from app.modules.companies.service import register_company, review_company
from app.modules.finance.service import (
    approve_project_budget,
    create_accounting_period,
    create_business_partner,
    create_expense_record,
    create_invoice,
    create_project_budget as create_finance_budget,
    create_revenue_record,
    create_treasury_account,
    finance_dashboard_report,
    record_invoice_payment,
)
from app.modules.projects.service import create_project, create_project_assignment, create_project_change_order, create_project_document, create_project_report, create_project_risk, create_project_task, project_dashboard, update_project
from app.modules.users.service import create_user, list_operational_profiles, reset_user_password, update_user


COMPANY_LEGAL_NAME = os.getenv("FULL_COMPANY_LEGAL_NAME", "T-ERP Operations SARL").strip()
COMPANY_REGISTRATION_NUMBER = os.getenv("FULL_COMPANY_REGISTRATION_NUMBER", "DEMO-BTP-FULL-001").strip()
COMPANY_EMAIL = os.getenv("FULL_COMPANY_EMAIL", "contact.operations@demo.local").strip().lower()
COMPANY_COUNTRY_CODE = os.getenv("FULL_COMPANY_COUNTRY_CODE", "CM").strip().upper()
COMPANY_CITY = os.getenv("FULL_COMPANY_CITY", "Douala").strip()
COMPANY_ADDRESS = os.getenv("FULL_COMPANY_ADDRESS", "Akwa, Douala").strip()
COMPANY_PHONE = os.getenv("FULL_COMPANY_PHONE", "+237699000222").strip()
COMPANY_ACTIVITY_DOMAIN = os.getenv("FULL_COMPANY_ACTIVITY_DOMAIN", "BTP").strip()
COMPANY_DEFAULT_LANGUAGE = os.getenv("FULL_COMPANY_DEFAULT_LANGUAGE", "fr").strip().lower()
COMPANY_CURRENCY = os.getenv("FULL_COMPANY_CURRENCY", "XAF").strip().upper()
COMPANY_TIMEZONE = os.getenv("FULL_COMPANY_TIMEZONE", "Africa/Douala").strip()

ADMIN_FIRST_NAME = os.getenv("FULL_COMPANY_ADMIN_FIRST_NAME", "Nadine").strip()
ADMIN_LAST_NAME = os.getenv("FULL_COMPANY_ADMIN_LAST_NAME", "Mba").strip()
ADMIN_EMAIL = os.getenv("FULL_COMPANY_ADMIN_EMAIL", "admin.operations@demo.local").strip().lower()
ADMIN_PASSWORD = os.getenv("FULL_COMPANY_ADMIN_PASSWORD", "DemoOps123!").strip()

STAFF_EMAIL_DOMAIN = os.getenv("FULL_COMPANY_STAFF_EMAIL_DOMAIN", "ops.demo.local").strip().lower()
STAFF_PASSWORD = os.getenv("FULL_COMPANY_STAFF_PASSWORD", "DemoStaff123!").strip()
STAFF_CONTRACT_TYPE = os.getenv("FULL_COMPANY_STAFF_CONTRACT_TYPE", "CDI").strip()

COMPANY_TRADE_NAME = os.getenv("FULL_COMPANY_TRADE_NAME", "T-ERP Operations").strip()
COMPANY_ACRONYM = os.getenv("FULL_COMPANY_ACRONYM", "TERP OPS").strip()
COMPANY_COUNTRY_NAME = os.getenv("FULL_COMPANY_COUNTRY_NAME", "Cameroun").strip()
COMPANY_TAX_NUMBER = os.getenv("FULL_COMPANY_TAX_NUMBER", "M041200015321Q").strip()
COMPANY_WEBSITE_URL = os.getenv("FULL_COMPANY_WEBSITE_URL", "https://operations.t-erp.local").strip()
COMPANY_CONTACT_PERSON_NAME = os.getenv("FULL_COMPANY_CONTACT_PERSON_NAME", "Nadine Mba").strip()
COMPANY_CONTACT_PERSON_PHONE = os.getenv("FULL_COMPANY_CONTACT_PERSON_PHONE", "+237699000222").strip()
COMPANY_OPERATES_SINCE = int(os.getenv("FULL_COMPANY_OPERATES_SINCE", "2012"))
COMPANY_HEADCOUNT = int(os.getenv("FULL_COMPANY_HEADCOUNT", "132"))
COMPANY_TARGET_REVENUE_2026 = int(os.getenv("FULL_COMPANY_TARGET_REVENUE_2026", "5610000000"))

TREASURY_ACCOUNT_SPECS = [
    {"code": "BNQ-UBA-001", "name": "Compte UBA Operations", "account_type": "bank", "currency": "XAF", "opening_balance": "625000000", "alert_threshold": "50000000"},
    {"code": "BNQ-SGC-002", "name": "Compte SG Cameroun Projets", "account_type": "bank", "currency": "XAF", "opening_balance": "310000000", "alert_threshold": "35000000"},
    {"code": "MOMO-OPS-003", "name": "Orange Money terrain", "account_type": "mobile_money", "currency": "XAF", "opening_balance": "45000000", "alert_threshold": "5000000"},
]

PARTNER_SPECS = [
    {"code": "CLI-PAK", "partner_type": "customer", "legal_name": "Port Autonome de Kribi", "contact_name": "Direction des infrastructures portuaires", "phone": "+237233430100", "address_line": "Zone industrialo-portuaire, Kribi", "currency": "XAF"},
    {"code": "CLI-CUD", "partner_type": "customer", "legal_name": "Communaute Urbaine de Douala", "contact_name": "Direction de la voirie et des reseaux divers", "phone": "+237233420721", "address_line": "Hotel de Ville, Douala", "currency": "XAF"},
    {"code": "CLI-CWT", "partner_type": "customer", "legal_name": "CAMWATER", "contact_name": "Direction regionale Ouest", "phone": "+237233426256", "address_line": "Bafoussam, Ouest", "currency": "XAF"},
    {"code": "CLI-SOS", "partner_type": "customer", "legal_name": "SOSUCAM", "contact_name": "Direction industrielle", "phone": "+237233360111", "address_line": "Mbandjock, Centre", "currency": "XAF"},
    {"code": "CLI-SDC", "partner_type": "customer", "legal_name": "SODECOTON", "contact_name": "Direction logistique et stockage", "phone": "+237222272001", "address_line": "Garoua, Nord", "currency": "XAF"},
    {"code": "FOU-CIM", "partner_type": "supplier", "legal_name": "CIMENCAM", "contact_name": "Direction commerciale Grands Comptes", "phone": "+237233372500", "address_line": "Bonaberi, Douala", "currency": "XAF"},
    {"code": "FOU-PRO", "partner_type": "supplier", "legal_name": "PROMETAL Cameroun", "contact_name": "Pole structures metalliques", "phone": "+237233391700", "address_line": "Bassa, Douala", "currency": "XAF"},
    {"code": "FOU-TRA", "partner_type": "supplier", "legal_name": "Tractafric Equipment Cameroun", "contact_name": "Service location et maintenance engins", "phone": "+237233505100", "address_line": "Zone industrielle Bassa, Douala", "currency": "XAF"},
]

ACCOUNTING_PERIOD_SPECS = [
    {"label": "Exercice 2024", "start_date": "2024-01-01", "end_date": "2024-12-31", "status": "closed", "notes": "Simulation consolidee - portefeuille travaux de 4,86 milliards XAF."},
    {"label": "Exercice 2025", "start_date": "2025-01-01", "end_date": "2025-12-31", "status": "closed", "notes": "Simulation consolidee - portefeuille travaux de 5,24 milliards XAF."},
    {"label": "Exercice 2026", "start_date": "2026-01-01", "end_date": "2026-12-31", "status": "open", "notes": "Objectif de chiffre d'affaires 2026 superieur a 5,6 milliards XAF."},
]

PROJECT_PACKS = [
    {
        "code": "TERP-KRI-2026-01",
        "name": "Modernisation de la plateforme logistique portuaire de Kribi",
        "market_reference": "PAK/AO/2025/117",
        "project_type": "public_market",
        "client_code": "CLI-PAK",
        "client_name": "Port Autonome de Kribi",
        "location": "Kribi, Ocean",
        "description": "Construction de halls metalliques, voiries lourdes et reseau incendie pour l'extension logistique du terminal portuaire.",
        "start_date": "2025-10-15",
        "end_date": "2026-11-30",
        "status": "in_progress",
        "budget_amount": "2090000000",
        "contract_amount": "2480000000",
        "progress_percent": "58",
        "physical_progress_percent": "61",
        "financial_progress_percent": "54",
        "dao_number": "DAO-PAK-2025-117",
        "contracting_authority": "Port Autonome de Kribi",
        "publication_date": "2025-06-18",
        "submission_date": "2025-07-30",
        "award_date": "2025-09-12",
        "contract_duration_days": 412,
        "funding_source": "Budget d'investissement PAK",
        "revenue_amount": "1540000000",
        "revenue_date": "2026-03-25",
        "expense_amount": "1140000000",
        "expense_date": "2026-03-22",
        "expense_supplier_code": "FOU-PRO",
        "invoice_number": "FAC-KRI-2026-001",
        "invoice_issue": "2026-03-15",
        "invoice_due": "2026-04-14",
        "invoice_total": "1620000000",
        "invoice_payment_amount": "1180000000",
        "invoice_payment_date": "2026-03-27",
    },
    {
        "code": "TERP-DLA-2026-02",
        "name": "Rehabilitation des voiries et drainage de la zone Bassa-Douala",
        "market_reference": "CUD/VRD/2025/084",
        "project_type": "public_market",
        "client_code": "CLI-CUD",
        "client_name": "Communaute Urbaine de Douala",
        "location": "Douala, Bassa",
        "description": "Reprise de chaussees, dalots, caniveaux en beton arme et gestion des eaux pluviales sur le perimetre industriel Bassa.",
        "start_date": "2025-08-04",
        "end_date": "2026-03-31",
        "status": "final_acceptance",
        "budget_amount": "1460000000",
        "contract_amount": "1720000000",
        "progress_percent": "100",
        "physical_progress_percent": "100",
        "financial_progress_percent": "100",
        "dao_number": "DAO-CUD-2025-084",
        "contracting_authority": "Communaute Urbaine de Douala",
        "publication_date": "2025-04-29",
        "submission_date": "2025-05-30",
        "award_date": "2025-07-15",
        "contract_duration_days": 316,
        "funding_source": "Budget CUD / Fonds FEICOM",
        "revenue_amount": "1150000000",
        "revenue_date": "2026-03-16",
        "expense_amount": "860000000",
        "expense_date": "2026-03-15",
        "expense_supplier_code": "FOU-CIM",
        "invoice_number": "FAC-DLA-2026-001",
        "invoice_issue": "2026-02-28",
        "invoice_due": "2026-03-26",
        "invoice_total": "1240000000",
        "invoice_payment_amount": "1000000000",
        "invoice_payment_date": "2026-03-22",
    },
    {
        "code": "TERP-BAF-2026-03",
        "name": "Extension de l'usine de production d'eau de Bafoussam III",
        "market_reference": "CWT/AEP/2025/041",
        "project_type": "public_market",
        "client_code": "CLI-CWT",
        "client_name": "CAMWATER",
        "location": "Bafoussam III, Ouest",
        "description": "Extension d'ouvrages hydrauliques, local electrique, station de pompage et conduite de liaison pour le renforcement de la production.",
        "start_date": "2025-11-18",
        "end_date": "2026-10-20",
        "status": "in_progress",
        "budget_amount": "980000000",
        "contract_amount": "1180000000",
        "progress_percent": "47",
        "physical_progress_percent": "44",
        "financial_progress_percent": "41",
        "dao_number": "DAO-CWT-2025-041",
        "contracting_authority": "CAMWATER",
        "publication_date": "2025-07-14",
        "submission_date": "2025-08-22",
        "award_date": "2025-10-03",
        "contract_duration_days": 336,
        "funding_source": "Programme d'urgence AEP",
        "revenue_amount": "930000000",
        "revenue_date": "2026-03-18",
        "expense_amount": "710000000",
        "expense_date": "2026-03-14",
        "expense_supplier_code": "FOU-TRA",
        "invoice_number": "FAC-BAF-2026-001",
        "invoice_issue": "2026-02-20",
        "invoice_due": "2026-03-20",
        "invoice_total": "880000000",
        "invoice_payment_amount": "550000000",
        "invoice_payment_date": "2026-03-19",
    },
    {
        "code": "TERP-MBJ-2026-04",
        "name": "Securisation electrique et solaire des sites agro-industriels de Mbandjock et Nkoteng",
        "market_reference": "SOS/IND/2025/063",
        "project_type": "private_market",
        "client_code": "CLI-SOS",
        "client_name": "SOSUCAM",
        "location": "Mbandjock - Nkoteng, Centre",
        "description": "Mise a niveau de postes electriques, centrales solaires hybrides et reseaux HTA pour sites de production.",
        "start_date": "2025-09-08",
        "end_date": "2026-03-28",
        "status": "completed",
        "budget_amount": "1040000000",
        "contract_amount": "1260000000",
        "progress_percent": "100",
        "physical_progress_percent": "100",
        "financial_progress_percent": "96",
        "dao_number": "AOI-SOS-2025-063",
        "contracting_authority": "SOSUCAM",
        "publication_date": "2025-05-20",
        "submission_date": "2025-06-19",
        "award_date": "2025-08-01",
        "contract_duration_days": 356,
        "funding_source": "CAPEX industriel prive",
        "revenue_amount": "1220000000",
        "revenue_date": "2026-03-17",
        "expense_amount": "910000000",
        "expense_date": "2026-03-11",
        "expense_supplier_code": "FOU-TRA",
        "invoice_number": "FAC-MBJ-2026-001",
        "invoice_issue": "2026-03-05",
        "invoice_due": "2026-04-19",
        "invoice_total": "1060000000",
        "invoice_payment_amount": "840000000",
        "invoice_payment_date": "2026-03-29",
    },
    {
        "code": "TERP-GAR-2026-05",
        "name": "Construction d'un depot de stockage de cereales a Garoua",
        "market_reference": "SDC/LOG/2025/029",
        "project_type": "private_market",
        "client_code": "CLI-SDC",
        "client_name": "SODECOTON",
        "location": "Garoua, Nord",
        "description": "Construction d'un depot avec hangars, dallage industriel, ventilation et amenagements logistiques.",
        "start_date": "2025-12-01",
        "end_date": "2026-09-15",
        "status": "in_progress",
        "budget_amount": "1170000000",
        "contract_amount": "1410000000",
        "progress_percent": "41",
        "physical_progress_percent": "39",
        "financial_progress_percent": "35",
        "dao_number": "CFP-SDC-2025-029",
        "contracting_authority": "SODECOTON",
        "publication_date": "2025-09-01",
        "submission_date": "2025-09-24",
        "award_date": "2025-11-06",
        "contract_duration_days": 289,
        "funding_source": "Investissement prive logistique",
        "revenue_amount": "770000000",
        "revenue_date": "2026-03-19",
        "expense_amount": "620000000",
        "expense_date": "2026-03-13",
        "expense_supplier_code": "FOU-PRO",
        "invoice_number": "FAC-GAR-2026-001",
        "invoice_issue": "2026-03-18",
        "invoice_due": "2026-04-18",
        "invoice_total": "820000000",
        "invoice_payment_amount": "520000000",
        "invoice_payment_date": "2026-03-31",
    },
]

FIRST_NAMES = [
    "Alain",
    "Mireille",
    "Serge",
    "Nadia",
    "Patrick",
    "Cynthia",
    "Thierry",
    "Sandrine",
    "Landry",
    "Gaelle",
    "Arthur",
    "Estelle",
    "Boris",
    "Clarisse",
    "Joel",
    "Prisca",
    "Fabrice",
    "Murielle",
    "Steve",
    "Carine",
    "Lionel",
    "Vanessa",
    "Cedric",
    "Aline",
    "Blaise",
    "Josiane",
    "Herve",
    "Marlene",
    "Junior",
    "Rachel",
]

LAST_NAMES = [
    "Ewane",
    "Mvondo",
    "Etoundi",
    "Manga",
    "Ebongue",
    "Nkoa",
    "Mekongo",
    "Tchana",
    "Ndzie",
    "Nlend",
    "Mouafo",
    "Ngo Tong",
    "Nana",
    "Yene",
    "Ngassa",
    "Mbianda",
    "Mveng",
    "Kenfack",
    "Simo",
    "Essono",
    "Nji",
    "Mouelle",
    "Nde",
    "Ngono",
    "Fouda",
    "Fotso",
    "Nkou",
    "Mebenga",
    "Awona",
    "Talla",
]

SALARY_BY_LEVEL = {
    1: 2_000_000,
    2: 1_400_000,
    3: 850_000,
    4: 450_000,
}


def _company_payload() -> dict[str, Any]:
    return {
        "legal_name": COMPANY_LEGAL_NAME,
        "trade_name": COMPANY_TRADE_NAME,
        "acronym": COMPANY_ACRONYM,
        "registration_number": COMPANY_REGISTRATION_NUMBER,
        "tax_number": COMPANY_TAX_NUMBER,
        "email": COMPANY_EMAIL,
        "country_code": COMPANY_COUNTRY_CODE,
        "country_name": COMPANY_COUNTRY_NAME,
        "city": COMPANY_CITY,
        "address_line": COMPANY_ADDRESS,
        "phone": COMPANY_PHONE,
        "activity_domain": COMPANY_ACTIVITY_DOMAIN,
        "default_language": COMPANY_DEFAULT_LANGUAGE,
        "currency": COMPANY_CURRENCY,
        "timezone": COMPANY_TIMEZONE,
        "contact_person_name": COMPANY_CONTACT_PERSON_NAME,
        "contact_person_phone": COMPANY_CONTACT_PERSON_PHONE,
        "website_url": COMPANY_WEBSITE_URL,
        "administrative_documents": _company_documents(),
        "admin_first_name": ADMIN_FIRST_NAME,
        "admin_last_name": ADMIN_LAST_NAME,
        "admin_email": ADMIN_EMAIL,
        "admin_password": ADMIN_PASSWORD,
        "admin_job_title": "Administrateur principal",
        "admin_department": "Direction generale",
    }


def _normalize_profile_key(profile: dict) -> tuple[int, str]:
    assignment = dict(profile.get("default_assignment") or {})
    return (int(assignment.get("hierarchy_level") or 99), profile["code"])


def _select_internal_profiles(company_id: int) -> tuple[list[dict], list[dict]]:
    catalog = list_operational_profiles(company_id)
    employee_profiles = []
    skipped_profiles = []

    for profile in catalog["items"]:
        assignment = dict(profile.get("default_assignment") or {})
        if assignment.get("user_type") == "employee":
            employee_profiles.append(profile)
        else:
            skipped_profiles.append(profile)

    employee_profiles.sort(key=_normalize_profile_key)
    skipped_profiles.sort(key=_normalize_profile_key)
    return employee_profiles, skipped_profiles


def _profile_names(index: int) -> tuple[str, str]:
    return FIRST_NAMES[(index - 1) % len(FIRST_NAMES)], LAST_NAMES[(index - 1) % len(LAST_NAMES)]


def _base_salary(profile: dict) -> int:
    assignment = dict(profile.get("default_assignment") or {})
    hierarchy_level = int(assignment.get("hierarchy_level") or 3)
    code = profile["code"]

    if code in {"ouvrier", "collaborateur_terrain"}:
        return 280_000
    if code == "pca":
        return 2_500_000

    return SALARY_BY_LEVEL.get(hierarchy_level, 650_000)


def _staff_email(profile_code: str) -> str:
    return f"{profile_code.replace('_', '.')}@{STAFF_EMAIL_DOMAIN}"


def _upsert_company(company_payload: dict[str, str]) -> tuple[Company, str]:
    company = Company.query.filter_by(registration_number=COMPANY_REGISTRATION_NUMBER).first()
    if company is None:
        result = register_company(company_payload)
        company = Company.query.filter_by(id=result["id"]).first()
        return company, "created"
    return company, "reused"


def _ensure_company_active(company: Company) -> None:
    ensure_company_admin_role(company.id)
    if company.onboarding_status != "approved" or not company.is_active:
        review_company(company.id, "approved")
    else:
        db.session.commit()


def _upsert_admin(company: Company) -> tuple[dict, str]:
    admin_payload = {
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "first_name": ADMIN_FIRST_NAME,
        "last_name": ADMIN_LAST_NAME,
        "user_type": "company_admin",
        "preferred_language": COMPANY_DEFAULT_LANGUAGE,
        "job_title": "Administrateur principal",
        "department": "Direction generale",
        "is_primary_admin": True,
        "account_status": "active",
    }

    existing = User.query.filter_by(company_id=company.id, email=ADMIN_EMAIL).filter(User.deleted_at.is_(None)).first()
    if existing is None:
        return create_user(company.id, admin_payload), "created"

    updated = update_user(
        company.id,
        existing.id,
        {
            "email": ADMIN_EMAIL,
            "first_name": ADMIN_FIRST_NAME,
            "last_name": ADMIN_LAST_NAME,
            "user_type": "company_admin",
            "preferred_language": COMPANY_DEFAULT_LANGUAGE,
            "job_title": "Administrateur principal",
            "department": "Direction generale",
            "is_primary_admin": True,
            "account_status": "active",
        },
    )
    reset_user_password(company.id, existing.id, new_password=ADMIN_PASSWORD, must_change_password=False)
    return updated, "updated"


def _staff_payload(profile: dict, index: int) -> dict:
    assignment = dict(profile.get("default_assignment") or {})
    first_name, last_name = _profile_names(index)
    return {
        "email": _staff_email(profile["code"]),
        "login_identifier": _staff_email(profile["code"]),
        "password": STAFF_PASSWORD,
        "first_name": first_name,
        "last_name": last_name,
        "preferred_language": COMPANY_DEFAULT_LANGUAGE,
        "user_type": assignment.get("user_type") or "employee",
        "operational_profile_code": profile["code"],
        "employee_number": f"OPS-{index:03d}",
        "hire_date": date(COMPANY_OPERATES_SINCE + 8, 1, 8),
        "contract_type": STAFF_CONTRACT_TYPE,
        "base_salary": _base_salary(profile),
        "account_status": "active",
    }


def _resolve_seed_employee_number(company_id: int, preferred_number: str, profile_code: str, exclude_user_id: int | None = None) -> str:
    existing_holder = (
        User.query.filter_by(company_id=company_id, employee_number=preferred_number)
        .filter(User.deleted_at.is_(None))
        .first()
    )
    if existing_holder is None or existing_holder.id == exclude_user_id:
        return preferred_number

    if exclude_user_id:
        current_user = User.query.filter_by(company_id=company_id, id=exclude_user_id).filter(User.deleted_at.is_(None)).first()
        if current_user and current_user.employee_number:
            current_holder = (
                User.query.filter_by(company_id=company_id, employee_number=current_user.employee_number)
                .filter(User.deleted_at.is_(None))
                .first()
            )
            if current_holder is None or current_holder.id == exclude_user_id:
                return current_user.employee_number

    base = f"OPS-{profile_code.upper().replace('_', '-')}"
    candidate = base
    index = 1
    while User.query.filter_by(company_id=company_id, employee_number=candidate).filter(User.deleted_at.is_(None)).first():
        index += 1
        candidate = f"{base}-{index}"
    return candidate


def _company_documents() -> list[dict[str, Any]]:
    return [
        {"document_type": "rccm", "reference": "RC/DLA/2012/B/1187", "label": "Registre de commerce", "issued_on": "2012-04-16", "status": "valid"},
        {"document_type": "niu", "reference": COMPANY_TAX_NUMBER, "label": "Attestation d'immatriculation fiscale", "issued_on": "2012-05-03", "status": "valid"},
        {
            "document_type": "company_profile",
            "reference": "TERP-PROFILE-2026",
            "label": "Fiche societe",
            "issued_on": "2026-01-05",
            "status": "valid",
            "metadata": {
                "operates_since": COMPANY_OPERATES_SINCE,
                "headcount": COMPANY_HEADCOUNT,
                "target_revenue_2026_xaf": COMPANY_TARGET_REVENUE_2026,
                "specialties": ["Genie civil", "Ouvrages industriels", "Hydraulique", "Energie et maintenance"],
            },
        },
    ]


def _company_review_note() -> str:
    return (
        f"T-ERP Operations SARL est positionnee comme une entreprise BTP camerounaise active depuis {COMPANY_OPERATES_SINCE}, "
        f"avec {COMPANY_HEADCOUNT} collaborateurs et un portefeuille 2026 simulant plus de {COMPANY_TARGET_REVENUE_2026:,} XAF "
        "de chiffre d'affaires annuel sur des projets de genie civil, d'infrastructures et d'ouvrages industriels."
    )


def _upsert_staff_member(company_id: int, profile: dict, index: int) -> tuple[dict, str]:
    payload = _staff_payload(profile, index)
    existing = User.query.filter_by(company_id=company_id, email=payload["email"]).filter(User.deleted_at.is_(None)).first()
    payload["employee_number"] = _resolve_seed_employee_number(
        company_id,
        payload["employee_number"],
        profile["code"],
        exclude_user_id=existing.id if existing else None,
    )
    if existing is None:
        return create_user(company_id, payload), "created"

    updated = update_user(
        company_id,
        existing.id,
        {
            "email": payload["email"],
            "login_identifier": payload["login_identifier"],
            "first_name": payload["first_name"],
            "last_name": payload["last_name"],
            "preferred_language": payload["preferred_language"],
            "operational_profile_code": payload["operational_profile_code"],
            "employee_number": payload["employee_number"],
            "hire_date": payload["hire_date"],
            "contract_type": payload["contract_type"],
            "base_salary": payload["base_salary"],
            "account_status": payload["account_status"],
        },
    )
    reset_user_password(company_id, existing.id, new_password=STAFF_PASSWORD, must_change_password=False)
    return updated, "updated"


def _enrich_company_profile(company: Company) -> None:
    company.trade_name = COMPANY_TRADE_NAME
    company.acronym = COMPANY_ACRONYM
    company.tax_number = COMPANY_TAX_NUMBER
    company.country_name = COMPANY_COUNTRY_NAME
    company.city = COMPANY_CITY
    company.address_line = COMPANY_ADDRESS
    company.phone = COMPANY_PHONE
    company.email = COMPANY_EMAIL
    company.activity_domain = "BTP, genie civil, ouvrages hydrauliques, infrastructures et maintenance industrielle"
    company.administrative_documents = _company_documents()
    company.review_notes = _company_review_note()

    settings = CompanySetting.query.filter_by(company_id=company.id).first()
    if settings is None:
        settings = CompanySetting(company_id=company.id)
        db.session.add(settings)

    settings.currency = COMPANY_CURRENCY
    settings.timezone = COMPANY_TIMEZONE
    settings.default_language = COMPANY_DEFAULT_LANGUAGE
    settings.date_format = "DD/MM/YYYY"
    settings.contact_person_name = COMPANY_CONTACT_PERSON_NAME
    settings.contact_person_phone = COMPANY_CONTACT_PERSON_PHONE
    settings.website_url = COMPANY_WEBSITE_URL
    db.session.commit()


def _require_user_by_email(company_id: int, email: str) -> User:
    user = User.query.filter_by(company_id=company_id, email=email).filter(User.deleted_at.is_(None)).first()
    if user is None:
        raise RuntimeError(f"Missing expected seeded user for email {email}")
    return user


def _build_seed_user_index(company_id: int) -> dict[str, User]:
    users_by_code = {"company_admin": _require_user_by_email(company_id, ADMIN_EMAIL)}
    employee_profiles, _ = _select_internal_profiles(company_id)
    for profile in employee_profiles:
        email = _staff_email(profile["code"])
        user = User.query.filter_by(company_id=company_id, email=email).filter(User.deleted_at.is_(None)).first()
        if user is not None:
            users_by_code[profile["code"]] = user
    return users_by_code


def _require_seed_user(users_by_code: dict[str, User], profile_code: str) -> User:
    user = users_by_code.get(profile_code)
    if user is None:
        raise RuntimeError(f"Missing expected seeded profile user: {profile_code}")
    return user


def _require_seed_user_any(users_by_code: dict[str, User], profile_codes: list[str]) -> User:
    for profile_code in profile_codes:
        user = users_by_code.get(profile_code)
        if user is not None:
            return user
    raise RuntimeError(f"Missing expected seeded profile user among: {', '.join(profile_codes)}")


def _get_or_create_accounting_period(company_id: int, payload: dict[str, Any]) -> AccountingPeriod:
    row = AccountingPeriod.query.filter_by(company_id=company_id, label=payload["label"]).first()
    if row is None:
        create_accounting_period(company_id, payload)
        row = AccountingPeriod.query.filter_by(company_id=company_id, label=payload["label"]).first()
    return row


def _get_or_create_treasury_account(company_id: int, payload: dict[str, Any]) -> TreasuryAccount:
    row = TreasuryAccount.query.filter_by(company_id=company_id, code=payload["code"]).first()
    if row is None:
        create_treasury_account(company_id, payload)
        row = TreasuryAccount.query.filter_by(company_id=company_id, code=payload["code"]).first()
    return row


def _get_or_create_partner(company_id: int, payload: dict[str, Any]) -> BusinessPartner:
    row = BusinessPartner.query.filter_by(company_id=company_id, code=payload["code"]).first()
    if row is None:
        create_business_partner(company_id, payload)
        row = BusinessPartner.query.filter_by(company_id=company_id, code=payload["code"]).first()
    return row


def _upsert_project(company_id: int, payload: dict[str, Any]) -> Project:
    row = Project.query.filter_by(company_id=company_id, code=payload["code"]).filter(Project.deleted_at.is_(None)).first()
    if row is None:
        create_project(company_id, payload)
        return Project.query.filter_by(company_id=company_id, code=payload["code"]).filter(Project.deleted_at.is_(None)).first()

    update_payload = dict(payload)
    update_payload.pop("code", None)
    update_project(company_id, row.id, update_payload)
    return Project.query.filter_by(company_id=company_id, id=row.id).first()


def _get_or_create_assignment(company_id: int, project_id: int, payload: dict[str, Any]) -> ProjectAssignment:
    row = ProjectAssignment.query.filter_by(company_id=company_id, project_id=project_id, user_id=payload["user_id"], project_role=payload["project_role"]).first()
    if row is None:
        create_project_assignment(company_id, project_id, payload)
        row = ProjectAssignment.query.filter_by(company_id=company_id, project_id=project_id, user_id=payload["user_id"], project_role=payload["project_role"]).first()
    return row


def _get_or_create_task(company_id: int, project_id: int, payload: dict[str, Any]) -> ProjectTask:
    row = ProjectTask.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).filter(ProjectTask.deleted_at.is_(None)).first()
    if row is None:
        create_project_task(company_id, project_id, payload)
        row = ProjectTask.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).filter(ProjectTask.deleted_at.is_(None)).first()
    return row


def _get_or_create_report(company_id: int, project_id: int, author_user_id: int, payload: dict[str, Any]) -> ProjectReport:
    row = ProjectReport.query.filter_by(company_id=company_id, project_id=project_id, report_date=date.fromisoformat(payload["report_date"])).first()
    if row is None:
        create_project_report(company_id, project_id, author_user_id, payload)
        row = ProjectReport.query.filter_by(company_id=company_id, project_id=project_id, report_date=date.fromisoformat(payload["report_date"])).first()
    return row


def _get_or_create_document(company_id: int, project_id: int, uploaded_by_user_id: int, payload: dict[str, Any]) -> ProjectDocument:
    row = ProjectDocument.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).first()
    if row is None:
        create_project_document(company_id, project_id, uploaded_by_user_id, payload)
        row = ProjectDocument.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).first()
    return row


def _get_or_create_change_order(company_id: int, project_id: int, requested_by_user_id: int, payload: dict[str, Any]) -> ProjectChangeOrder:
    row = ProjectChangeOrder.query.filter_by(company_id=company_id, project_id=project_id, reference=payload["reference"]).first()
    if row is None:
        create_project_change_order(company_id, project_id, requested_by_user_id, payload)
        row = ProjectChangeOrder.query.filter_by(company_id=company_id, project_id=project_id, reference=payload["reference"]).first()
    return row


def _get_or_create_risk(company_id: int, project_id: int, payload: dict[str, Any]) -> ProjectRisk:
    row = ProjectRisk.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).first()
    if row is None:
        create_project_risk(company_id, project_id, payload)
        row = ProjectRisk.query.filter_by(company_id=company_id, project_id=project_id, title=payload["title"]).first()
    return row


def _get_or_create_budget(company_id: int, project_id: int, approved_by_user_id: int, payload: dict[str, Any]) -> ProjectBudget:
    row = ProjectBudget.query.filter_by(company_id=company_id, project_id=project_id, version_label=payload["version_label"]).first()
    if row is None:
        create_finance_budget(company_id, {"project_id": project_id, **payload})
        row = ProjectBudget.query.filter_by(company_id=company_id, project_id=project_id, version_label=payload["version_label"]).first()
    if row.status != "approved":
        approve_project_budget(company_id, row.id, approved_by_user_id)
        row = ProjectBudget.query.filter_by(company_id=company_id, id=row.id).first()
    return row


def _get_or_create_expense(company_id: int, created_by_user_id: int, payload: dict[str, Any]) -> ExpenseRecord:
    row = ExpenseRecord.query.filter_by(company_id=company_id, expense_number=payload["expense_number"]).first()
    if row is None:
        create_expense_record(company_id, created_by_user_id, payload)
        row = ExpenseRecord.query.filter_by(company_id=company_id, expense_number=payload["expense_number"]).first()
    return row


def _get_or_create_revenue(company_id: int, created_by_user_id: int, payload: dict[str, Any]) -> RevenueRecord:
    row = RevenueRecord.query.filter_by(company_id=company_id, revenue_number=payload["revenue_number"]).first()
    if row is None:
        create_revenue_record(company_id, created_by_user_id, payload)
        row = RevenueRecord.query.filter_by(company_id=company_id, revenue_number=payload["revenue_number"]).first()
    return row


def _get_or_create_invoice(company_id: int, payload: dict[str, Any]) -> Invoice:
    row = Invoice.query.filter_by(company_id=company_id, invoice_number=payload["invoice_number"]).first()
    if row is None:
        create_invoice(company_id, payload)
        row = Invoice.query.filter_by(company_id=company_id, invoice_number=payload["invoice_number"]).first()
    return row


def _get_or_create_invoice_payment(company_id: int, invoice_id: int, received_by_user_id: int, payload: dict[str, Any]) -> InvoicePayment:
    row = InvoicePayment.query.filter_by(company_id=company_id, invoice_id=invoice_id, reference=payload["reference"]).first()
    if row is None:
        record_invoice_payment(company_id, invoice_id, received_by_user_id, payload)
        row = InvoicePayment.query.filter_by(company_id=company_id, invoice_id=invoice_id, reference=payload["reference"]).first()
    return row


def _budget_lines_for(pack: dict[str, Any]) -> list[dict[str, Any]]:
    total = int(pack["budget_amount"])
    major = int(total * 0.36)
    secondary = int(total * 0.34)
    support = total - major - secondary
    return [
        {"category": "execution", "label": f"Execution principale - {pack['location']}", "planned_amount": str(major)},
        {"category": "supply", "label": f"Approvisionnements structurants - {pack['client_name']}", "planned_amount": str(secondary)},
        {"category": "pilotage", "label": "Pilotage, HSE et supervision", "planned_amount": str(support)},
    ]


def _invoice_lines_for(pack: dict[str, Any]) -> list[dict[str, Any]]:
    total = int(pack["invoice_total"])
    line_one = int(total * 0.65)
    line_two = total - line_one
    return [
        {"description": f"Situation de travaux principale - {pack['location']}", "quantity": "1", "unit_price": str(line_one)},
        {"description": f"Lots complementaires et appuis logistiques - {pack['client_name']}", "quantity": "1", "unit_price": str(line_two)},
    ]


def _document_payloads_for(pack: dict[str, Any]) -> list[dict[str, Any]]:
    code_slug = pack["code"].lower()
    is_completed = pack["status"] in {"completed", "final_acceptance"}
    reception_title = "PV de reception definitive" if pack["status"] == "final_acceptance" else "PV de reception provisoire" if is_completed else "PV de reunion chantier"
    reception_notes = "Piece de cloture et validation de reception." if is_completed else "Compte rendu de coordination technique en cours."

    return [
        {
            "category": "dao",
            "title": f"DAO et pieces administratives - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/dao.pdf",
            "document_date": pack["publication_date"],
            "notes": f"Dossier d'appel d'offres et pieces de consultation pour {pack['client_name']}.",
        },
        {
            "category": "contract",
            "title": f"Contrat et dossier d'execution - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/contrat.pdf",
            "document_date": pack["award_date"],
            "notes": f"Dossier de reference projet pour {pack['client_name']}.",
        },
        {
            "category": "plan",
            "title": f"Plans d'execution et implantations - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/plans-execution.pdf",
            "document_date": pack["start_date"],
            "notes": f"Plans techniques, coupes et implantations du site {pack['location']}.",
        },
        {
            "category": "report",
            "title": f"Rapport technique hebdomadaire - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/rapport-technique.pdf",
            "document_date": pack["revenue_date"],
            "notes": "Synthese technique, avancement, points HSE et reserves terrain.",
        },
        {
            "category": "pv",
            "title": f"{reception_title} - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/pv-reception.pdf",
            "document_date": pack["end_date"] if is_completed else pack["revenue_date"],
            "notes": reception_notes,
        },
        {
            "category": "decompte",
            "title": f"Decompte travaux no 1 - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/decompte-01.pdf",
            "document_date": pack["invoice_issue"],
            "notes": f"Decompte rattache a la situation {pack['invoice_number']}.",
        },
        {
            "category": "invoice",
            "title": f"Facture situation travaux - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/facture-situation.pdf",
            "document_date": pack["invoice_issue"],
            "notes": f"Piece de facturation client {pack['client_name']}.",
        },
        {
            "category": "photo",
            "title": f"Album photos chantier - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/album-chantier.pdf",
            "document_date": pack["revenue_date"],
            "notes": f"Photos de progression terrain sur {pack['location']}.",
        },
        {
            "category": "other",
            "title": f"Fiche synthese technique - {pack['code']}",
            "file_url": f"https://demo.t-erp.local/docs/{code_slug}/fiche-synthese.pdf",
            "document_date": pack["invoice_payment_date"],
            "notes": "Synthese des points contractuels, techniques et financiers a date.",
        },
    ]


def _change_order_payloads_for(pack: dict[str, Any]) -> list[dict[str, Any]]:
    is_completed = pack["status"] in {"completed", "final_acceptance"}
    return [
        {
            "reference": f"AV-{pack['code']}-01",
            "title": f"Avenant technique et quantitatif - {pack['code']}",
            "description": f"Adaptation des quantites et ajustements techniques pour {pack['location']}.",
            "amount_delta": str(int(int(pack["contract_amount"]) * 0.035)),
            "delay_delta_days": 12 if not is_completed else 0,
            "status": "implemented" if is_completed else "approved",
            "effective_date": pack["invoice_issue"],
        }
    ]


def _seed_business_dataset(company: Company) -> dict[str, Any]:
    users_by_code = _build_seed_user_index(company.id)
    finance_actor = _require_seed_user(users_by_code, "comptable")
    budget_approver = _require_seed_user(users_by_code, "daf")
    project_manager = _require_seed_user_any(users_by_code, ["chef_projet", "directeur_technique", "company_admin"])
    site_manager = _require_seed_user_any(users_by_code, ["conducteur_travaux", "chef_chantier", "chef_projet", "company_admin"])
    document_owner = _require_seed_user_any(users_by_code, ["assistant_administratif", "juriste", "company_admin"])
    risk_owner = _require_seed_user_any(users_by_code, ["directeur_technique", "chef_projet", "company_admin"])

    for spec in ACCOUNTING_PERIOD_SPECS:
        _get_or_create_accounting_period(company.id, spec)

    treasury_accounts = {
        spec["code"]: _get_or_create_treasury_account(company.id, spec)
        for spec in TREASURY_ACCOUNT_SPECS
    }
    partners = {
        spec["code"]: _get_or_create_partner(company.id, spec)
        for spec in PARTNER_SPECS
    }

    seeded_projects = []
    for pack in PROJECT_PACKS:
        project = _upsert_project(
            company.id,
            {
                "code": pack["code"],
                "name": pack["name"],
                "market_reference": pack["market_reference"],
                "project_type": pack["project_type"],
                "description": pack["description"],
                "location": pack["location"],
                "client_name": pack["client_name"],
                "start_date": pack["start_date"],
                "end_date": pack["end_date"],
                "estimated_duration_days": (date.fromisoformat(pack["end_date"]) - date.fromisoformat(pack["start_date"])).days,
                "status": pack["status"],
                "budget_amount": pack["budget_amount"],
                "contract_amount": pack["contract_amount"],
                "progress_percent": pack["progress_percent"],
                "physical_progress_percent": pack["physical_progress_percent"],
                "financial_progress_percent": pack["financial_progress_percent"],
                "dao_number": pack["dao_number"],
                "contracting_authority": pack["contracting_authority"],
                "publication_date": pack["publication_date"],
                "submission_date": pack["submission_date"],
                "award_date": pack["award_date"],
                "contract_duration_days": pack["contract_duration_days"],
                "funding_source": pack["funding_source"],
            },
        )

        _get_or_create_assignment(
            company.id,
            project.id,
            {
                "user_id": project_manager.id,
                "project_role": "Chef de projet",
                "assignment_mode": "immediate",
                "start_date": pack["start_date"],
                "responsibility": f"Pilotage global et coordination client sur {pack['location']}",
                "is_active": True,
            },
        )
        _get_or_create_assignment(
            company.id,
            project.id,
            {
                "user_id": site_manager.id,
                "project_role": "Conducteur de travaux",
                "assignment_mode": "immediate",
                "start_date": pack["start_date"],
                "responsibility": f"Execution, suivi terrain et reporting site pour {pack['code']}",
                "is_active": True,
            },
        )

        _get_or_create_task(
            company.id,
            project.id,
            {
                "task_type": "phase",
                "title": f"Execution terrain - {pack['code']}",
                "assigned_to_user_id": site_manager.id,
                "responsible_user_id": project_manager.id,
                "start_date": pack["start_date"],
                "end_date": pack["end_date"],
                "priority": "high",
                "status": "in_progress" if pack["status"] == "in_progress" else "completed",
                "progress_percent": pack["progress_percent"],
                "responsibility": f"Ordonnancement des travaux et tenue des delais pour {pack['client_name']}",
            },
        )

        _get_or_create_report(
            company.id,
            project.id,
            project_manager.id,
            {
                "report_date": pack["revenue_date"],
                "report_type": "weekly",
                "weather": "Sec",
                "summary": f"Avancement consolide sur {pack['name']} avec trajectoire budgetaire maitrisable.",
                "activities_summary": f"Execution des travaux principaux et coordination avec {pack['client_name']}.",
                "personnel_present": 24 if int(pack["progress_percent"]) < 50 else 42,
                "incidents": "RAS",
                "observations": f"Le chantier {pack['code']} reste suivi de pres sur les delais et les approvisionnements.",
                "blockers": "Aucun blocage majeur signale a ce stade.",
            },
        )

        for document_payload in _document_payloads_for(pack):
            _get_or_create_document(company.id, project.id, document_owner.id, document_payload)

        for change_order_payload in _change_order_payloads_for(pack):
            _get_or_create_change_order(company.id, project.id, project_manager.id, change_order_payload)

        _get_or_create_risk(
            company.id,
            project.id,
            {
                "owner_user_id": risk_owner.id,
                "title": f"Risque de cadence approvisionnements - {pack['code']}",
                "description": f"Le maintien du rythme des approvisionnements critiques doit etre surveille pour {pack['location']}.",
                "severity": "high" if int(pack["progress_percent"]) < 55 else "medium",
                "status": "monitoring",
                "mitigation_plan": "Securiser les fournisseurs alternatifs et fiabiliser le planning hebdomadaire.",
                "due_date": pack["invoice_due"],
            },
        )

        _get_or_create_budget(
            company.id,
            project.id,
            budget_approver.id,
            {
                "version_label": "Budget 2026 approuve",
                "status": "approved",
                "notes": f"Budget d'execution consolide pour {pack['code']}.",
                "lines": _budget_lines_for(pack),
            },
        )

        _get_or_create_expense(
            company.id,
            finance_actor.id,
            {
                "project_id": project.id,
                "partner_id": partners[pack["expense_supplier_code"]].id,
                "treasury_account_id": treasury_accounts["BNQ-UBA-001"].id,
                "expense_number": f"EXP-{pack['code']}",
                "category": "execution_project",
                "amount": pack["expense_amount"],
                "currency": "XAF",
                "expense_date": pack["expense_date"],
                "payment_method": "bank_transfer",
                "document_reference": f"JUSTIF-{pack['code']}",
                "approval_status": "approved",
                "description": f"Depenses consolidees d'execution pour {pack['name']}.",
            },
        )

        _get_or_create_revenue(
            company.id,
            finance_actor.id,
            {
                "project_id": project.id,
                "partner_id": partners[pack["client_code"]].id,
                "revenue_number": f"REV-{pack['code']}",
                "revenue_type": "situation_travaux",
                "amount": pack["revenue_amount"],
                "currency": "XAF",
                "revenue_date": pack["revenue_date"],
                "payment_method": "bank_transfer",
                "reference": f"SIT-{pack['code']}",
                "description": f"Situation de travaux consolidee sur {pack['name']}.",
            },
        )

        invoice = _get_or_create_invoice(
            company.id,
            {
                "project_id": project.id,
                "customer_id": partners[pack["client_code"]].id,
                "invoice_number": pack["invoice_number"],
                "issued_on": pack["invoice_issue"],
                "due_on": pack["invoice_due"],
                "status": "sent",
                "tax_rate": "0",
                "lines": _invoice_lines_for(pack),
            },
        )
        _get_or_create_invoice_payment(
            company.id,
            invoice.id,
            finance_actor.id,
            {
                "amount": pack["invoice_payment_amount"],
                "payment_date": pack["invoice_payment_date"],
                "payment_method": "bank_transfer",
                "reference": f"REG-{pack['code']}",
                "treasury_account_id": treasury_accounts["BNQ-SGC-002"].id,
            },
        )

        seeded_projects.append(project)

    finance_dashboard = finance_dashboard_report(company.id)
    projects_snapshot = project_dashboard(company.id)
    revenues_2026 = sum(float(row.amount) for row in RevenueRecord.query.filter_by(company_id=company.id).all() if row.revenue_date and row.revenue_date.year == 2026)
    expenses_2026 = sum(float(row.amount) for row in ExpenseRecord.query.filter_by(company_id=company.id, approval_status="approved").all() if row.expense_date and row.expense_date.year == 2026)
    outstanding = sum(max(float(row.amount_total) - float(row.amount_paid), 0.0) for row in Invoice.query.filter_by(company_id=company.id).all())

    return {
        "seeded_projects": seeded_projects,
        "finance_dashboard": finance_dashboard,
        "projects_dashboard": projects_snapshot,
        "revenues_2026": round(revenues_2026, 2),
        "expenses_2026": round(expenses_2026, 2),
        "outstanding": round(outstanding, 2),
    }

def main() -> int:
    app = create_app()
    with app.app_context():
        ensure_permissions_exist(DEFAULT_PERMISSION_CODES)
        ensure_default_global_profiles()
        db.session.commit()

        company, company_action = _upsert_company(_company_payload())
        _ensure_company_active(company)
        _enrich_company_profile(company)
        admin_user, admin_action = _upsert_admin(company)

        employee_profiles, skipped_profiles = _select_internal_profiles(company.id)

        created_staff = []
        updated_staff = []
        for index, profile in enumerate(employee_profiles, start=1):
            user, action = _upsert_staff_member(company.id, profile, index)
            entry = {
                "profile_code": profile["code"],
                "job_title": user["job_title"],
                "email": user["email"],
                "employee_number": user["employee_number"],
                "organization_unit": (user.get("organization_unit") or {}).get("name"),
            }
            if action == "created":
                created_staff.append(entry)
            else:
                updated_staff.append(entry)

        business_dataset = _seed_business_dataset(company)
        finance_dashboard = business_dataset["finance_dashboard"]
        projects_snapshot = business_dataset["projects_dashboard"]

        print(f"[seed] Company {company_action} successfully.")
        print(f"       company_id           : {company.id}")
        print(f"       legal_name           : {company.legal_name}")
        print(f"       trade_name           : {company.trade_name}")
        print(f"       registration         : {company.registration_number}")
        print(f"       tax_number           : {company.tax_number}")
        print(f"       operates_since       : {COMPANY_OPERATES_SINCE}")
        print(f"       headcount_target     : {COMPANY_HEADCOUNT}")
        print(f"       admin_email          : {admin_user['email']}")
        print(f"       admin_password       : {ADMIN_PASSWORD}")
        print(f"       staff_password       : {STAFF_PASSWORD}")
        print(f"       company_profile_url  : {COMPANY_WEBSITE_URL}")
        print(f"       employee count       : {len(employee_profiles)}")
        print(f"       admin action         : {admin_action}")
        print(f"       staff created        : {len(created_staff)}")
        print(f"       staff updated        : {len(updated_staff)}")
        print(f"       projects seeded      : {len(business_dataset['seeded_projects'])}")
        print(f"       active projects      : {projects_snapshot['counts']['active_projects']}")
        print(f"       delayed projects     : {projects_snapshot['counts']['delayed_projects']}")
        print(f"       2026 revenues        : {business_dataset['revenues_2026']:.2f} XAF")
        print(f"       2026 expenses        : {business_dataset['expenses_2026']:.2f} XAF")
        print(f"       finance revenue KPI  : {finance_dashboard['kpis']['revenue']:.2f} XAF")
        print(f"       finance profit KPI   : {finance_dashboard['kpis']['profit']:.2f} XAF")
        print(f"       outstanding invoices : {business_dataset['outstanding']:.2f} XAF")
        print(f"       cash balance         : {finance_dashboard['kpis']['cash_balance']:.2f} XAF")

        if skipped_profiles:
            print("       skipped profiles:")
            for profile in skipped_profiles:
                assignment = dict(profile.get("default_assignment") or {})
                print(f"       - {profile['code']} ({assignment.get('user_type')})")

        print("       seeded projects:")
        for project in business_dataset["seeded_projects"]:
            print(
                "       - "
                f"{project.code} | {project.name} | {project.status} | "
                f"budget={float(project.budget_amount or 0):.2f} XAF | "
                f"contract={float(project.contract_amount or 0):.2f} XAF"
            )

        print("       staff accounts:")
        for entry in [*created_staff, *updated_staff]:
            print(
                "       - "
                f"{entry['profile_code']} | {entry['job_title']} | {entry['email']} | "
                f"{entry['employee_number']} | {entry['organization_unit'] or '-'}"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
