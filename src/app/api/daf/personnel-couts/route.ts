import { NextResponse } from "next/server";
import { Role, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { canAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Liste du personnel pour la vue DAF "Personnel & coûts salariaux".
 *
 * Pour chaque utilisateur du groupe (tenant + filiales si holding) :
 *   - Identité (nom, fonction, catégorie professionnelle)
 *   - Direction de rattachement (rôle si cadre, sinon département)
 *   - Projets/chantiers d'affectation (assignedSiteIds + Site.managerId)
 *   - Salaire de base contractuel (User.payslips[0].baseSalary)
 *   - Statut de rattachement : DIRECTION / PROJECT / BOTH / UNATTACHED
 *
 * Permet la ventilation analytique des coûts salariaux entre
 * frais de structure (direction) et coûts directs imputables aux
 * marchés (chantiers).
 *
 * Filtres (query params, tous optionnels) :
 *   - role : Role (filtre par direction de rattachement)
 *   - siteId : ID d'un chantier (filtre les personnes affectées)
 *   - category : "CADRE" | "ETAM" | "OUVRIER" | "EMPLOYE"
 *   - attachment : "DIRECTION" | "PROJECT" | "BOTH" | "UNATTACHED"
 */

// Rôles considérés comme "cadres de direction"
const DIRECTION_ROLES: ReadonlySet<Role> = new Set<Role>([
  Role.DG,
  Role.DAF,
  Role.HR,
  Role.SECRETARY_GENERAL,
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.ACCOUNTANT,
]);

// Catégorisation simplifiée à partir du rôle
function deriveCategory(role: Role): "CADRE" | "ETAM" | "OUVRIER" | "EMPLOYE" {
  if (DIRECTION_ROLES.has(role) || role === Role.WORKS_MANAGER) return "CADRE";
  if (role === Role.WORKER) return "OUVRIER";
  if (
    role === Role.SITE_MANAGER ||
    role === Role.LOGISTICS ||
    role === Role.WAREHOUSE ||
    role === Role.ARCHIVIST
  )
    return "ETAM";
  return "EMPLOYE";
}

// Direction de rattachement (libellé court pour l'UI)
function deriveDirection(role: Role, department: string | null): {
  code: string;
  label: string;
} {
  if (role === Role.DG) return { code: "DG", label: "Direction Générale" };
  if (role === Role.DAF) return { code: "DAF", label: "Direction Admin. & Financière" };
  if (role === Role.HR) return { code: "RH", label: "Direction RH" };
  if (role === Role.SECRETARY_GENERAL) return { code: "SG", label: "Secrétariat Général" };
  if (role === Role.TECH_DIRECTOR) return { code: "DT", label: "Direction Technique" };
  if (role === Role.WORKS_DIRECTOR) return { code: "DTRAV", label: "Direction Travaux" };
  if (role === Role.ACCOUNTANT) return { code: "CPT", label: "Comptabilité" };
  if (department) return { code: "DEPT", label: department };
  return { code: "—", label: "Non rattaché" };
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [], summary: emptySummary() });

  // Restreint à DAF + DG + DRH + TenantAdmin (vue financière sensible).
  if (!canAccess(session.role as Role, MODULES.DAF)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(req.url);
  const roleFilter = url.searchParams.get("role") as Role | null;
  const siteIdFilter = url.searchParams.get("siteId");
  const categoryFilter = url.searchParams.get("category");
  const attachmentFilter = url.searchParams.get("attachment");

  const tenantIds = await getTenantScopeIds(session.tenantId);

  // Récupère tous les users actifs du groupe
  const where: Prisma.UserWhereInput = {
    tenantId: { in: tenantIds },
    status: "ACTIVE",
    role: { notIn: [Role.CANDIDATE, Role.SUPER_ADMIN] },
  };
  if (roleFilter) where.role = roleFilter;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      department: true,
      position: true,
      category: true,
      professionalCategory: true,
      avatarUrl: true,
      assignedSiteIds: true,
      hireDate: true,
      contractType: true,
      tenantId: true,
      // Salaire de base : dernier bulletin (le plus récent) ou null
      payslips: {
        orderBy: { period: "desc" },
        take: 1,
        select: { baseSalary: true, period: true },
      },
      // Sites gérés (managerId) → comptés comme "affectés à un projet"
      managedSites: {
        select: { id: true, code: true, name: true },
        take: 5,
      },
    },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
  });

  // Résolution des Site.name pour les assignedSiteIds
  const allSiteIds = Array.from(
    new Set(users.flatMap((u) => u.assignedSiteIds)),
  );
  const sites = allSiteIds.length
    ? await prisma.site.findMany({
        where: { id: { in: allSiteIds } },
        select: { id: true, code: true, name: true },
      })
    : [];
  const siteById = new Map(sites.map((s) => [s.id, s]));

  // Indexe les tenants pour afficher la filiale
  const tenants = await prisma.tenant.findMany({
    where: { id: { in: tenantIds } },
    select: { id: true, slug: true, name: true },
  });
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  // Construit la réponse + applique les filtres post-fetch (catégorie,
  // attachment, siteId qui croise managedSites + assignedSiteIds)
  let items = users.map((u) => {
    // u.tenantId est nullable au niveau schéma (CANDIDATE/SUPER_ADMIN)
    // mais on a déjà exclu ces rôles dans le where. Sécurité belt-and-suspenders.
    const userTenantId = u.tenantId ?? "";
    const userTenant = userTenantId ? tenantById.get(userTenantId) : undefined;
    const category = deriveCategory(u.role);
    const direction = deriveDirection(u.role, u.department);
    const assignedSites = u.assignedSiteIds
      .map((id) => siteById.get(id))
      .filter((s): s is { id: string; code: string; name: string } => Boolean(s));
    const projects = [
      ...assignedSites.map((s) => ({ ...s, asManager: false })),
      ...u.managedSites.map((s) => ({ ...s, asManager: true })),
    ];
    // dédoublonne par id
    const projectsUnique = Array.from(
      new Map(projects.map((p) => [p.id, p])).values(),
    );

    const hasDirection = DIRECTION_ROLES.has(u.role) || (u.department?.length ?? 0) > 0;
    const hasProject = projectsUnique.length > 0;
    let attachment: "DIRECTION" | "PROJECT" | "BOTH" | "UNATTACHED";
    if (hasDirection && hasProject) attachment = "BOTH";
    else if (hasDirection) attachment = "DIRECTION";
    else if (hasProject) attachment = "PROJECT";
    else attachment = "UNATTACHED";

    const last = u.payslips[0];
    const baseSalary = last?.baseSalary?.toString() ?? null;

    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      position: u.position,
      avatarUrl: u.avatarUrl,
      contractType: u.contractType,
      hireDate: u.hireDate?.toISOString() ?? null,
      department: u.department,
      professionalCategory: u.professionalCategory,
      category,
      direction,
      projects: projectsUnique,
      baseSalary,
      attachment,
      tenant: userTenant
        ? { id: userTenantId, slug: userTenant.slug, name: userTenant.name }
        : null,
    };
  });

  // Filtres post-fetch
  if (siteIdFilter) {
    items = items.filter((u) => u.projects.some((p) => p.id === siteIdFilter));
  }
  if (categoryFilter) {
    items = items.filter((u) => u.category === categoryFilter);
  }
  if (attachmentFilter) {
    items = items.filter((u) => u.attachment === attachmentFilter);
  }

  // Résumé : masse salariale + ventilation direction vs projet
  const totalSalary = items.reduce(
    (acc, u) => acc + (u.baseSalary ? Number(u.baseSalary) : 0),
    0,
  );
  const summary = {
    headcount: items.length,
    totalSalary,
    byCategory: {
      CADRE: items.filter((u) => u.category === "CADRE").length,
      ETAM: items.filter((u) => u.category === "ETAM").length,
      OUVRIER: items.filter((u) => u.category === "OUVRIER").length,
      EMPLOYE: items.filter((u) => u.category === "EMPLOYE").length,
    },
    byAttachment: {
      DIRECTION: items.filter((u) => u.attachment === "DIRECTION").length,
      PROJECT: items.filter((u) => u.attachment === "PROJECT").length,
      BOTH: items.filter((u) => u.attachment === "BOTH").length,
      UNATTACHED: items.filter((u) => u.attachment === "UNATTACHED").length,
    },
    salaryByAttachment: {
      DIRECTION: items
        .filter((u) => u.attachment === "DIRECTION" || u.attachment === "BOTH")
        .reduce((a, u) => a + (u.baseSalary ? Number(u.baseSalary) : 0), 0),
      PROJECT: items
        .filter((u) => u.attachment === "PROJECT")
        .reduce((a, u) => a + (u.baseSalary ? Number(u.baseSalary) : 0), 0),
      UNATTACHED: items
        .filter((u) => u.attachment === "UNATTACHED")
        .reduce((a, u) => a + (u.baseSalary ? Number(u.baseSalary) : 0), 0),
    },
  };

  return NextResponse.json({ items, summary });
}

function emptySummary() {
  return {
    headcount: 0,
    totalSalary: 0,
    byCategory: { CADRE: 0, ETAM: 0, OUVRIER: 0, EMPLOYE: 0 },
    byAttachment: { DIRECTION: 0, PROJECT: 0, BOTH: 0, UNATTACHED: 0 },
    salaryByAttachment: { DIRECTION: 0, PROJECT: 0, UNATTACHED: 0 },
  };
}
