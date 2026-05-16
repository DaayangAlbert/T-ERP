import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";

/**
 * Garde commune des routes CC (Chef Chantier).
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts).
 * SITE_MANAGER = FULL · WORKS_DIRECTOR = FULL · DG / TECH_DIRECTOR / SG / WORKS_MANAGER = READ.
 *
 * Si un siteId est passé, vérifie qu'il est dans le périmètre.
 * Sinon prend le premier chantier assigné (typique du Chef chantier qui en a 1 seul).
 *
 *   const guard = await guardCcSite();
 *   if (guard instanceof NextResponse) return guard;
 *   const { session, siteId, access } = guard;
 */
export async function guardCcSite(requestedSiteId?: string) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const access = getAccess(session.role as Role, MODULES.CC);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const allowed = await getAccessibleSiteIds(session.sub);

  if (requestedSiteId) {
    if (!isSiteAllowed(allowed, requestedSiteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }
    return { session, siteId: requestedSiteId, access };
  }

  if (allowed === null) {
    // Rôle global → on prend le premier chantier du tenant pour démo
    const site = await (await import("@/lib/prisma")).prisma.site.findFirst({
      where: { tenantId: session.tenantId },
      select: { id: true },
    });
    if (!site) return NextResponse.json({ error: "Aucun chantier" }, { status: 404 });
    return { session, siteId: site.id, access };
  }

  if (allowed.length === 0) {
    return NextResponse.json({ error: "Aucun chantier assigné" }, { status: 403 });
  }
  return { session, siteId: allowed[0], access };
}

/**
 * Variante stricte de `guardCcSite` pour les routes de mutation
 * (POST/PATCH/DELETE). Refuse les rôles dont l'accès CC est READ
 * — typiquement DG/DT/SG/WORKS_MANAGER en drill-down.
 */
export async function guardCcSiteMutation(requestedSiteId?: string) {
  const guard = await guardCcSite(requestedSiteId);
  if (guard instanceof NextResponse) return guard;
  if (!guard.access.canEdit) {
    return NextResponse.json(
      { error: "Action en lecture seule pour ce profil" },
      { status: 403 },
    );
  }
  return guard;
}
