import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.WORKS_DIRECTOR, Role.SUPER_ADMIN];

/**
 * Chantiers actifs du tenant pouvant être inclus dans un rapport hebdo CDT.
 * Inclut leurs KPI courants (physique, financier, effectif moyen 7 derniers jours,
 * incidents HSE 7 derniers jours) pour pré-remplir le snapshot.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: {
      tenantId: { in: tenantIds },
      status: { in: ["ACTIVE", "PLANNED"] },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      region: true,
      progress: true,
      physicalProgress: true,
      financialProgress: true,
      manager: { select: { firstName: true, lastName: true } },
    },
  });

  // Pré-remplissage KPI : on calcule les valeurs des 7 derniers jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [attendances, incidents] = await Promise.all([
    prisma.attendance.groupBy({
      by: ["siteId"],
      where: { siteId: { in: sites.map((s) => s.id) }, date: { gte: sevenDaysAgo } },
      _count: { userId: true },
    }),
    prisma.hseIncident.groupBy({
      by: ["siteId"],
      where: { siteId: { in: sites.map((s) => s.id) }, occurredAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
  ]);

  const workforceMap = new Map(attendances.map((a) => [a.siteId, Math.round((a._count.userId ?? 0) / 7)]));
  const incidentMap = new Map(incidents.map((i) => [i.siteId, i._count.id]));

  return NextResponse.json({
    items: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      region: s.region,
      progress: s.progress,
      physicalProgress: s.physicalProgress,
      financialProgress: s.financialProgress,
      manager: s.manager ? `${s.manager.firstName} ${s.manager.lastName}` : null,
      // Suggestions de pré-remplissage
      suggestedAvgWorkforce: workforceMap.get(s.id) ?? 0,
      suggestedHseIncidents: incidentMap.get(s.id) ?? 0,
    })),
  });
}
