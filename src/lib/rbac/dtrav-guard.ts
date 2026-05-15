import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { canAccess, getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";

/**
 * Garde commune des routes DTrav.
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts).
 * WORKS_DIRECTOR = FULL · DG / DAF / TECH_DIRECTOR / SG / WORKS_MANAGER = READ.
 *
 * Renvoie `{ session, siteId, allowed, access }` ou une `NextResponse` d'erreur.
 *
 *   const guard = await guardDtravSite(siteId);
 *   if (guard instanceof NextResponse) return guard;
 *   const { session, allowed, access } = guard;
 */
export async function guardDtravSite(siteId: string) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const access = getAccess(session.role as Role, MODULES.DTRAV);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const allowed = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowed, siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  return { session, siteId, allowed, access };
}

export function isDtravRole(role: string | undefined | null): boolean {
  return !!role && canAccess(role as Role, MODULES.DTRAV);
}
