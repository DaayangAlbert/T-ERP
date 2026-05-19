import { NextResponse } from "next/server";
import { WarehouseScope, type Prisma, type Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Liste les magasins (warehouses) accessibles à l'utilisateur courant
 * dans son tenant — utilisée par le composant WarehouseFilter pour
 * peupler les sélecteurs (par scope, par chantier, par direction).
 *
 * Restrictions tenant + rôle : retourne TOUS les warehouses du tenant
 * pour les rôles avec vue consolidée (DG, DAF, TENANT_ADMIN, LOGISTICS,
 * ACCOUNTANT, WORKS_DIRECTOR, TECH_DIRECTOR). Pour les autres rôles,
 * filtre selon `User.assignedSiteIds` ou `Warehouse.keeperId = me`.
 */
const FULL_ACCESS_ROLES: ReadonlySet<Role> = new Set<Role>([
  "DG",
  "DAF",
  "TENANT_ADMIN",
  "LOGISTICS",
  "ACCOUNTANT",
  "WORKS_DIRECTOR",
  "TECH_DIRECTOR",
  "HR",
  "SECRETARY_GENERAL",
] as Role[]);

export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [] });

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true, assignedSiteIds: true },
  });
  if (!me) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const hasFullAccess = FULL_ACCESS_ROLES.has(me.role);

  const where: Prisma.WarehouseWhereInput = { tenantId: session.tenantId };
  if (!hasFullAccess) {
    where.OR = [
      { keeperId: session.sub },
      { siteId: { in: me.assignedSiteIds } },
    ];
  }

  const items = await prisma.warehouse.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      scope: true,
      ownerDirection: true,
      siteId: true,
      site: { select: { id: true, code: true, name: true } },
      keeperId: true,
      keeper: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: items.map((w) => ({
      id: w.id,
      code: w.code,
      name: w.name,
      scope: w.scope,
      ownerDirection: w.ownerDirection,
      site: w.site ? { id: w.site.id, code: w.site.code, name: w.site.name } : null,
      keeper: w.keeper
        ? { id: w.keeper.id, fullName: `${w.keeper.firstName} ${w.keeper.lastName}` }
        : null,
    })),
    // Liste des valeurs possibles pour aider le frontend (selects).
    scopes: Object.values(WarehouseScope),
  });
}
