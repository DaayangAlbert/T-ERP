/**
 * Annuaire RH du personnel — lecture 100 % BDD.
 *
 * Liste paginée des users du tenant courant (+ filiales si holding). Filtres :
 *   - search       (nom, matricule, CNPS, téléphone, email)
 *   - status       (ACTIVE/INACTIVE)
 *   - category     (libellé exact)
 *   - site         (code site assigné)
 *   - contract     (CDI/CDD/JOURNALIER/STAGE/PRESTATAIRE)
 *
 * Le site affiché est résolu via assignedSiteIds[0] s'il y en a un, sinon
 * "Siège" (cas typique des cadres siège non rattachés à un chantier).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, UserStatus, ContractType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.SECRETARY_GENERAL, Role.TENANT_ADMIN];

interface PersonnelRow {
  id: string;
  matricule: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  category: string;
  contractType: string;
  site: string;
  region: string | null;
  hireDate: string;
  cnpsNumber: string | null;
  isSynthetic: boolean;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
  const status = url.searchParams.get("status") ?? "";
  const category = url.searchParams.get("category") ?? "";
  const site = url.searchParams.get("site") ?? "";
  const contract = url.searchParams.get("contract") ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(8, parseInt(url.searchParams.get("limit") ?? "8", 10)));

  const scopeIds = await getTenantScopeIds(session.tenantId);

  // Where clause Prisma — multi-tenant + filtre statut + filtre catégorie + contrat
  const where: {
    tenantId: { in: string[] };
    status?: UserStatus;
    category?: string;
    contractType?: ContractType;
    role: { notIn: Role[] };
  } = {
    tenantId: { in: scopeIds },
    role: { notIn: [Role.CANDIDATE, Role.SUPER_ADMIN] },
  };
  if (status === "INACTIVE") where.status = UserStatus.INACTIVE;
  else if (status === "" || status === "ACTIVE") where.status = UserStatus.ACTIVE;
  if (category) where.category = category;
  if (contract) where.contractType = contract as ContractType;

  // Référentiel sites — résolution lazy via assignedSiteIds[0]
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds } },
    select: { id: true, code: true, name: true, region: true },
  });
  const siteById = new Map(sites.map((s) => [s.id, s]));

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      matricule: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      position: true,
      category: true,
      contractType: true,
      hireDate: true,
      cnpsNumber: true,
      assignedSiteIds: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Mapping + résolution site (assignedSiteIds[0] → siteByCode)
  let rows: PersonnelRow[] = users.map((u) => {
    const firstSite = u.assignedSiteIds[0] ? siteById.get(u.assignedSiteIds[0]) : null;
    return {
      id: u.id,
      matricule: u.matricule ?? u.employeeId ?? "—",
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      position: u.position ?? "—",
      category: u.category ?? "—",
      contractType: u.contractType ?? "CDI",
      site: firstSite?.name ?? "Siège",
      region: firstSite?.region ?? null,
      hireDate: u.hireDate?.toISOString().slice(0, 10) ?? "—",
      cnpsNumber: u.cnpsNumber,
      isSynthetic: false,
    };
  });

  // Filtres post-mapping (search texte + site qui dépend du résolveur)
  if (search) {
    rows = rows.filter((r) =>
      [r.fullName, r.matricule, r.cnpsNumber ?? "", r.phone ?? "", r.email]
        .some((field) => field.toLowerCase().includes(search)),
    );
  }
  if (site) rows = rows.filter((r) => r.site === site);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);

  // Facettes pour les selects de filtre
  const facets = {
    categories: Array.from(new Set(rows.map((r) => r.category).filter((c) => c !== "—"))).sort(),
    sites: Array.from(new Set(rows.map((r) => r.site))).sort(),
    contracts: Array.from(new Set(rows.map((r) => r.contractType))).sort(),
    statuses: ["ACTIVE", "INACTIVE"],
  };

  return NextResponse.json({ items, page, limit, total, totalPages, facets });
}
