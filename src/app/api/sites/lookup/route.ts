import { NextResponse } from "next/server";
import { SiteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * Endpoint lookup léger : liste TOUS les chantiers (marchés) actifs du
 * tenant (et filiales si holding), sans pagination, avec un flag
 * indiquant si le chantier a déjà un Warehouse associé.
 *
 * Utilisé par WarehouseFilter pour peupler le sélecteur "Chantier" —
 * permet d'afficher tous les chantiers existants, même ceux sans
 * magasin configuré (la sélection renverra simplement "aucun stock").
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!session.tenantId) return NextResponse.json({ items: [] });

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const sites = await prisma.site.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: { not: SiteStatus.ARCHIVED },
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      region: true,
      tenantId: true,
      warehouse: { select: { id: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      status: s.status,
      region: s.region,
      tenantId: s.tenantId,
      hasWarehouse: s.warehouse !== null,
    })),
  });
}
