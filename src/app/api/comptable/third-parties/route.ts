import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds } from "@/lib/rbac/site-filter";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ACCOUNTANT, Role.DAF, Role.DG, Role.SUPER_ADMIN];

/**
 * Tiers comptables auxiliaires pour la saisie d'écriture :
 *  - comptes classe 40 (fournisseurs) → liste des Supplier du tenant
 *  - comptes classe 41 (clients)      → clients (MOA) des chantiers
 * Pas de modèle Tiers dédié : on s'appuie sur l'existant. La valeur stockée
 * dans EntryLine.thirdPartyId est l'id fournisseur (40x) ou le nom client (41x).
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const account = new URL(req.url).searchParams.get("account")?.trim() ?? "";
  // Périmètre groupe (holding + filiales) : fournisseurs et chantiers sont
  // souvent logés sur les tenants filles.
  const scopeIds = await getTenantScopeIds(session.tenantId);

  if (account.startsWith("40")) {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: { in: scopeIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    });
    return NextResponse.json({ kind: "supplier", items: suppliers.map((s) => ({ value: s.id, label: s.name })) });
  }

  if (account.startsWith("41")) {
    const allowed = await getAccessibleSiteIds(session.sub);
    const where: Record<string, unknown> = { tenantId: { in: scopeIds } };
    if (allowed !== null) where.id = { in: allowed };
    const sites = await prisma.site.findMany({ where, select: { client: true } });
    const clients = Array.from(new Set(sites.map((s) => s.client).filter(Boolean))).sort();
    return NextResponse.json({ kind: "client", items: clients.map((c) => ({ value: c, label: c })) });
  }

  return NextResponse.json({ kind: "none", items: [] });
}
