import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.DAF, Role.SUPER_ADMIN];

/**
 * Tous les chantiers du portefeuille (tenant + filiales) avec KPI courants,
 * pour pré-remplir le rapport mensuel technique du DT.
 */
export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const tenantIds = await getTenantScopeIds(session.tenantId);

  const sites = await prisma.site.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: [{ status: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      region: true,
      status: true,
      budget: true,
      progress: true,
      physicalProgress: true,
      financialProgress: true,
      margin: true,
      actualSpentAmount: true,
    },
  });

  // KPI 30 derniers jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const siteIds = sites.map((s) => s.id);
  const [incidents, ncs] = await Promise.all([
    prisma.hseIncident.groupBy({
      by: ["siteId"],
      where: { siteId: { in: siteIds }, occurredAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    }),
    prisma.nonConformity.groupBy({
      by: ["siteId"],
      where: { siteId: { in: siteIds }, status: { not: "CLOSED" } },
      _count: { id: true },
    }),
  ]);

  const incMap = new Map(incidents.map((i) => [i.siteId, i._count.id]));
  const ncMap = new Map(ncs.map((n) => [n.siteId, n._count.id]));

  return NextResponse.json({
    items: sites.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      client: s.client,
      region: s.region,
      status: s.status,
      budget: s.budget.toString(),
      progress: s.progress,
      physicalProgress: s.physicalProgress,
      financialProgress: s.financialProgress,
      margin: s.margin,
      suggestedHseIncidents: incMap.get(s.id) ?? 0,
      suggestedNcOpen: ncMap.get(s.id) ?? 0,
    })),
  });
}
