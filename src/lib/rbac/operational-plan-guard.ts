import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleSiteIds, isSiteAllowed } from "@/lib/rbac/site-filter";

/**
 * Garde commune des routes /api/operational-plans/*.
 *
 * Les plannings opérationnels (Mensuel / Hebdomadaire) sont rédigés
 * conjointement par le Conducteur de Travaux (WORKS_MANAGER) et le
 * Directeur des Travaux (WORKS_DIRECTOR). Les autres rôles direction
 * peuvent les consulter mais pas les éditer.
 */
const READ_ROLES: Role[] = [
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.DG,
  Role.DAF,
  Role.TECH_DIRECTOR,
  Role.SUPER_ADMIN,
];
const WRITE_ROLES: Role[] = [Role.WORKS_DIRECTOR, Role.WORKS_MANAGER];

export async function guardOperationalPlanRead(siteId: string) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!READ_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const allowed = await getAccessibleSiteIds(session.sub);
  if (!isSiteAllowed(allowed, siteId)) {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  return { session, siteId, canEdit: WRITE_ROLES.includes(session.role as Role) };
}

export async function guardOperationalPlanWrite(siteId: string) {
  const guard = await guardOperationalPlanRead(siteId);
  if (guard instanceof NextResponse) return guard;
  if (!guard.canEdit) {
    return NextResponse.json(
      { error: "Lecture seule pour ce profil (réservé Conducteur / Directeur des travaux)" },
      { status: 403 },
    );
  }
  return guard;
}
