import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { SiteStatus } from "@prisma/client";
import { computePerf } from "@/lib/sites-perf";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
    orderBy: { budget: "desc" },
    select: {
      id: true,
      code: true,
      name: true,
      client: true,
      status: true,
      region: true,
      budget: true,
      progress: true,
      margin: true,
    },
  });

  const rows = sites.map(computePerf);

  // Top / bottom 5
  const sortedByMargin = rows.slice().sort((a, b) => b.realizedMargin - a.realizedMargin);
  const topMargins = sortedByMargin.slice(0, 5);
  const worstDrifts = sortedByMargin.slice(-5).reverse();

  return NextResponse.json({
    rows,
    summary: {
      total: rows.length,
      averageMargin: Number(
        (rows.reduce((s, r) => s + r.realizedMargin, 0) / Math.max(1, rows.length)).toFixed(1)
      ),
      averageDso: Math.round(rows.reduce((s, r) => s + r.dso, 0) / Math.max(1, rows.length)),
      drifting: rows.filter((r) => r.status === "DRIFTING").length,
      atRisk: rows.filter((r) => r.status === "AT_RISK").length,
    },
    topMargins,
    worstDrifts,
  });
}
