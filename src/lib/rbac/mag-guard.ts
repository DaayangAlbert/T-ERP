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
 *
 * Pour les rôles globaux connectés à un tenant holding (isGroup=true),
 * la recherche du warehouse s'étend aux tenants filiales (parentId = currentTenant).
 * Sans ça, un DG/DAF sur "BatimCAM SA" ne verrait aucun magasin alors que les
 * chantiers et leurs magasins sont logés sur les filiales (batimcam-douala, …).
 */
export async function guardMagWarehouse() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const access = getAccess(session.role as Role, MODULES.MAG);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  // Périmètre tenant : courant + filiales si holding
  const tenantIds = await getTenantScope(session.tenantId);

  // Liste complète des warehouses du scope (pour vue consolidée groupe).
  // Le `warehouse` principal reste le premier — utilisé par les rôles
  // mono-magasin (WAREHOUSE keeper). Les rôles READ (DG/DAF) agrègent.
  const warehouseFilter: Record<string, unknown> = { tenantId: { in: tenantIds } };
  if (allowed !== null) warehouseFilter.siteId = { in: allowed };
  const allWarehouses = (allowed === null || allowed.length > 0)
    ? await prisma.warehouse.findMany({
        where: warehouseFilter,
        include: { site: { select: { id: true, code: true, name: true } } },
        orderBy: { code: "asc" },
      })
    : [];

  const warehouse = allWarehouses[0];
  if (!warehouse) {
    return NextResponse.json({ error: "Aucun magasin configuré" }, { status: 404 });
  }
  return { session, warehouse, allWarehouses, access, tenantIds };
}

/**
 * Retourne la liste des tenantIds accessibles depuis le tenant courant :
 * - tenant courant
 * - + tenants filiales (parentId = tenant courant) si le tenant courant est un
 *   groupe (isGroup=true).
 *
 * Utilisé par les routes MAG pour permettre la consultation consolidée
 * (et par les futures routes drill-down DG/DAF).
 */
export async function getTenantScope(tenantId: string): Promise<string[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, isGroup: true },
  });
  if (!tenant) return [tenantId];
  if (!tenant.isGroup) return [tenantId];
  const children = await prisma.tenant.findMany({
    where: { parentId: tenantId },
    select: { id: true },
  });
  return [tenant.id, ...children.map((c) => c.id)];
}

/**
 * Variante stricte de `guardMagWarehouse` pour les routes de mutation
 * (POST/PATCH/DELETE). Refuse les rôles dont l'accès MAG est READ
 * — typiquement DG/DAF/LOGISTICS/WORKS_DIRECTOR/TECH_DIRECTOR en drill-down.
 */
export async function guardMagWarehouseMutation() {
  const guard = await guardMagWarehouse();
  if (guard instanceof NextResponse) return guard;
  if (!guard.access.canEdit) {
    return NextResponse.json(
      { error: "Action en lecture seule pour ce profil" },
      { status: 403 },
    );
  }
  return guard;
}

export function isWarehouseSiteAllowed(allowed: string[] | null, siteId: string): boolean {
  return isSiteAllowed(allowed, siteId);
}
