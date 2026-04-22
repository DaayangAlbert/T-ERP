from app.extensions import db
from app.models.user import Permission, Role, RolePermission


SYSTEM_PERMISSION_CODES = [
    "companies.read",
    "companies.manage",
    "users.read",
    "users.manage",
    "attendance.read",
    "attendance.manage",
    "projects.read",
    "projects.manage",
    "finance.read",
    "finance.manage",
    "payroll.read",
    "payroll.manage",
    "inventory.read",
    "inventory.manage",
    "procurement.read",
    "procurement.manage",
    "chat.read",
    "chat.manage",
    "calls.read",
    "calls.manage",
    "recruitment.read",
    "recruitment.manage",
]

# Backward-compatible alias used by the existing auth/company seed flows.
DEFAULT_PERMISSION_CODES = SYSTEM_PERMISSION_CODES
GLOBAL_CHAT_PERMISSION_CODES = ["chat.read", "chat.manage"]
GLOBAL_SELF_SERVICE_PAYROLL_EXCLUDED_CODES = {"pca"}


def _with_global_chat_access(templates: list[dict[str, object]]) -> list[dict[str, object]]:
    enriched_templates = []

    for template in templates:
        permissions = list(
            dict.fromkeys([*(template.get("permissions") or []), *GLOBAL_CHAT_PERMISSION_CODES])
        )
        enriched_templates.append({**template, "permissions": permissions})

    return enriched_templates


def _with_global_self_service_payroll_access(templates: list[dict[str, object]]) -> list[dict[str, object]]:
    enriched_templates = []

    for template in templates:
        permissions = list(template.get("permissions") or [])
        if template.get("code") not in GLOBAL_SELF_SERVICE_PAYROLL_EXCLUDED_CODES and "payroll.read" not in permissions:
            permissions = [*permissions, "payroll.read"]
        enriched_templates.append({**template, "permissions": permissions})

    return enriched_templates


DEFAULT_GLOBAL_PROFILE_TEMPLATES = _with_global_chat_access(_with_global_self_service_payroll_access([
    {
        "code": "pca",
        "name": "President du Conseil d'Administration",
        "description": "Dispose d'une vue de gouvernance et de consultation sur l'entreprise.",
        "permissions": [
            "companies.read",
            "users.read",
            "attendance.read",
            "projects.read",
            "finance.read",
            "inventory.read",
            "procurement.read",
        ],
    },
    {
        "code": "directeur_general",
        "name": "Directeur General",
        "description": "Pilote l'entreprise avec une vue globale sur l'activite et les modules clefs.",
        "permissions": [
            "companies.read",
            "users.read",
            "attendance.read",
            "projects.read",
            "projects.manage",
            "finance.read",
            "finance.manage",
            "payroll.read",
            "inventory.read",
            "inventory.manage",
            "procurement.read",
            "procurement.manage",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "directeur_technique",
        "name": "Directeur Technique",
        "description": "Supervise les projets, les equipes techniques et les ressources terrain.",
        "permissions": [
            "projects.read",
            "projects.manage",
            "attendance.read",
            "inventory.read",
            "inventory.manage",
            "procurement.read",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "directeur_administratif",
        "name": "Directeur Administratif",
        "description": "Suit les dossiers administratifs, les documents et les contrats de l'entreprise.",
        "permissions": [
            "companies.read",
            "users.read",
            "attendance.read",
            "projects.read",
            "finance.read",
            "payroll.read",
            "procurement.read",
        ],
    },
    {
        "code": "daf",
        "name": "Directeur Administratif et Financier",
        "description": "Supervise la comptabilite, les budgets, la tresorerie et le pilotage financier de l'entreprise.",
        "permissions": [
            "companies.read",
            "users.read",
            "attendance.read",
            "projects.read",
            "finance.read",
            "finance.manage",
            "payroll.read",
            "payroll.manage",
            "inventory.read",
            "procurement.read",
        ],
    },
    {
        "code": "responsable_rh",
        "name": "Responsable RH",
        "description": "Gere le personnel, le suivi administratif RH et le recrutement.",
        "permissions": [
            "users.read",
            "users.manage",
            "attendance.read",
            "attendance.manage",
            "payroll.read",
            "payroll.manage",
            "recruitment.read",
            "recruitment.manage",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "controleur_gestion",
        "name": "Controleur de gestion",
        "description": "Analyse les performances, budgets et indicateurs financiers.",
        "permissions": [
            "companies.read",
            "projects.read",
            "attendance.read",
            "finance.read",
            "payroll.read",
            "inventory.read",
        ],
    },
    {
        "code": "chef_projet",
        "name": "Chef de projet",
        "description": "Pilote les projets, coordonne les equipes et suit les consommations.",
        "permissions": [
            "companies.read",
            "users.read",
            "attendance.read",
            "attendance.manage",
            "projects.read",
            "projects.manage",
            "inventory.read",
            "finance.read",
            "procurement.read",
            "chat.read",
            "chat.manage",
            "calls.read",
            "calls.manage",
        ],
    },
    {
        "code": "chef_chantier",
        "name": "Chef de chantier",
        "description": "Supervise l'execution terrain, les mouvements de stock et la coordination quotidienne.",
        "permissions": [
            "projects.read",
            "projects.manage",
            "attendance.read",
            "attendance.manage",
            "inventory.read",
            "inventory.manage",
            "chat.read",
            "chat.manage",
            "calls.read",
            "calls.manage",
        ],
    },
    {
        "code": "conducteur_travaux",
        "name": "Conducteur de travaux",
        "description": "Suit les chantiers, coordonne les ressources et appuie le pilotage d'execution.",
        "permissions": [
            "projects.read",
            "projects.manage",
            "attendance.read",
            "attendance.manage",
            "inventory.read",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "magasinier",
        "name": "Magasinier",
        "description": "Gere les articles, emplacements, entrees, sorties et transferts de stock.",
        "permissions": [
            "inventory.read",
            "inventory.manage",
            "projects.read",
            "payroll.read",
            "chat.read",
            "chat.manage",
        ],
    },
    {
        "code": "comptable",
        "name": "Comptable",
        "description": "Suit les depenses, recettes, factures et la tresorerie de l'entreprise.",
        "permissions": [
            "companies.read",
            "projects.read",
            "inventory.read",
            "finance.read",
            "finance.manage",
            "payroll.read",
            "payroll.manage",
        ],
    },
    {
        "code": "informaticien",
        "name": "Informaticien",
        "description": "Assure le support interne et l'assistance technique aux utilisateurs.",
        "permissions": [
            "users.read",
            "users.manage",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "acheteur",
        "name": "Acheteur",
        "description": "Pilote les consultations, soumissions et approvisionnements.",
        "permissions": [
            "projects.read",
            "inventory.read",
            "finance.read",
            "procurement.read",
            "procurement.manage",
        ],
    },
    {
        "code": "assistant_administratif",
        "name": "Assistant administratif",
        "description": "Appuie les taches administratives, la gestion documentaire et le suivi des dossiers.",
        "permissions": [
            "companies.read",
            "projects.read",
            "procurement.read",
        ],
    },
    {
        "code": "juriste",
        "name": "Juriste",
        "description": "Suit les aspects contractuels, juridiques et documentaires.",
        "permissions": [
            "companies.read",
            "projects.read",
            "procurement.read",
            "finance.read",
        ],
    },
    {
        "code": "logisticien",
        "name": "Logisticien",
        "description": "Coordonne les approvisionnements et la disponibilite des ressources.",
        "permissions": [
            "projects.read",
            "inventory.read",
            "inventory.manage",
            "payroll.read",
            "chat.read",
            "chat.manage",
        ],
    },
    {
        "code": "responsable_logistique",
        "name": "Responsable Logistique",
        "description": "Pilote les stocks, approvisionnements, livraisons et allocations de ressources.",
        "permissions": [
            "projects.read",
            "inventory.read",
            "inventory.manage",
            "finance.read",
            "procurement.read",
            "procurement.manage",
            "chat.read",
            "calls.read",
        ],
    },
    {
        "code": "rh_recruteur",
        "name": "RH / Recruteur",
        "description": "Gere les offres, candidatures et la collaboration RH.",
        "permissions": [
            "users.read",
            "attendance.read",
            "attendance.manage",
            "payroll.read",
            "payroll.manage",
            "recruitment.read",
            "recruitment.manage",
            "chat.read",
            "chat.manage",
            "calls.read",
            "calls.manage",
        ],
    },
    {
        "code": "ouvrier",
        "name": "Ouvrier",
        "description": "Acces limite aux taches assignees et au suivi d'activite.",
        "permissions": [
            "projects.read",
            "chat.read",
        ],
    },
    {
        "code": "controleur_externe",
        "name": "Controleur externe",
        "description": "Accede en lecture aux donnees necessaires pour audit et controle.",
        "permissions": [
            "companies.read",
            "projects.read",
            "inventory.read",
            "finance.read",
            "payroll.read",
            "procurement.read",
            "recruitment.read",
        ],
    },
    {
        "code": "collaborateur_terrain",
        "name": "Collaborateur terrain",
        "description": "Consulte les activites projet et communique avec les equipes.",
        "permissions": [
            "projects.read",
            "inventory.read",
            "chat.read",
            "chat.manage",
            "calls.read",
            "calls.manage",
        ],
    },
    {
        "code": "candidat_job_seeker",
        "name": "Chercheur d'emploi",
        "description": "Consulte les offres et gere son parcours de candidature.",
        "permissions": [
            "recruitment.read",
        ],
    },
]))


def ensure_permissions_exist(permission_codes: list[str] | None = None) -> None:
    codes = permission_codes or DEFAULT_PERMISSION_CODES
    for code in codes:
        module, action = code.split(".")
        if not Permission.query.filter_by(code=code).first():
            db.session.add(
                Permission(
                    module=module,
                    action=action,
                    code=code,
                    description=f"{module} {action} permission",
                )
            )

    db.session.flush()


def _sync_role_permissions(role_id: int, permission_codes: list[str]) -> None:
    permission_rows = Permission.query.filter(Permission.code.in_(permission_codes)).all()
    found_codes = {permission.code for permission in permission_rows}
    missing_codes = [code for code in permission_codes if code not in found_codes]
    if missing_codes:
        raise RuntimeError(f"Unknown permission codes: {', '.join(missing_codes)}")

    expected_permission_ids = {permission.id for permission in permission_rows}
    existing_links = RolePermission.query.filter_by(role_id=role_id).all()
    existing_permission_ids = {link.permission_id for link in existing_links}

    for link in existing_links:
        if link.permission_id not in expected_permission_ids:
            db.session.delete(link)

    for permission in permission_rows:
        if permission.id not in existing_permission_ids:
            db.session.add(RolePermission(role_id=role_id, permission_id=permission.id))

    db.session.flush()


def ensure_role(
    *,
    company_id: int | None,
    code: str,
    name: str,
    description: str,
    permission_codes: list[str],
    is_system: bool = True,
) -> tuple[Role, bool]:
    role = Role.query.filter_by(company_id=company_id, code=code).first()
    created = role is None

    if role is None:
        role = Role(
            company_id=company_id,
            name=name,
            code=code,
            description=description,
            is_system=is_system,
        )
        db.session.add(role)
        db.session.flush()
    else:
        role.name = name
        role.description = description
        role.is_system = is_system

    _sync_role_permissions(role.id, permission_codes)
    return role, created


def ensure_company_admin_role(company_id: int) -> tuple[Role, bool]:
    return ensure_role(
        company_id=company_id,
        code="company_admin_default",
        name="Company Admin",
        description="Default company administrator role",
        permission_codes=DEFAULT_PERMISSION_CODES,
        is_system=True,
    )


def ensure_default_global_profiles() -> list[dict[str, str | int | bool | None]]:
    ensure_permissions_exist()

    results = []
    for template in DEFAULT_GLOBAL_PROFILE_TEMPLATES:
        role, created = ensure_role(
            company_id=None,
            code=template["code"],
            name=template["name"],
            description=template["description"],
            permission_codes=template["permissions"],
            is_system=True,
        )
        results.append(
            {
                "id": role.id,
                "code": role.code,
                "name": role.name,
                "company_id": role.company_id,
                "created": created,
            }
        )

    return results
