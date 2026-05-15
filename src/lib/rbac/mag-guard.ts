import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";
import { prisma } from "@/lib/prisma";

/**
 * Garde commune des routes MAG.
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts).
 * WAREHOUSE = FULL · SITE_MANAGER = SCOPE · DG / DAF / LOGISTICS / WORKS_DIRECTOR / TECH_DIRECTOR = READ.
 *
 * Renvoie le warehouse de l'utilisateur (ou le premier disponible pour les
 * rôles globaux) + le niveau d'accès.
 */
export async function guardMagWarehouse() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const access = getAccess(session.role as Role, MODULES.MAG);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  let warehouse;
  if (allowed === null) {
    warehouse = await prisma.warehouse.findFirst({
      where: { tenantId: session.tenantId },
      include: { site: { select: { id: true, code: true, name: true } } },
    });
  } else if (allowed.length > 0) {
    warehouse = await prisma.warehouse.findFirst({
      where: { siteId: { in: allowed } },
      include: { site: { select: { id: true, code: true, name: true } } },
    });
  }

  if (!warehouse) {
    return NextResponse.json({ error: "Aucun magasin configuré" }, { status: 404 });
  }
  return { session, warehouse, access };
}

export function isWarehouseSiteAllowed(allowed: string[] | null, siteId: string): boolean {
  return isSiteAllowed(allowed, siteId);
}
