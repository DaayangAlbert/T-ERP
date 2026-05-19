import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { computeDtKpis } from "@/lib/reports/auto-fill";

export const dynamic = "force-dynamic";

/**
 * POST /api/dt/monthly-reports/[id]/auto-fill
 *
 * Calcule les KPIs techniques depuis Site + ProgressBilling + HseIncidentReport
 * pour le mois du rapport et met à jour le rapport. Conserve les narratifs.
 *
 * Réservé à l'auteur (DT) tant que statut DRAFT ou REJECTED.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await prisma.dtMonthlyTechReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role !== Role.TECH_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Réservé à l'auteur (Directeur Technique)" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  const kpis = await computeDtKpis(session.tenantId, report.period);

  await prisma.dtMonthlyTechReport.update({
    where: { id },
    data: {
      sitesActiveCount: kpis.sitesActiveCount,
      sitesCompletedCount: kpis.sitesCompletedCount,
      sitesAtRiskCount: kpis.sitesAtRiskCount,
      avgPhysicalProgress: kpis.avgPhysicalProgress,
      avgFinancialProgress: kpis.avgFinancialProgress,
      totalRevenueXAF: kpis.totalRevenueXAF,
      totalSpentXAF: kpis.totalSpentXAF,
      portfolioMarginPercent: kpis.portfolioMarginPercent,
      hseTotalIncidents: kpis.hseTotalIncidents,
      hseNcOpen: kpis.hseNcOpen,
    },
  });

  return NextResponse.json({
    ok: true,
    filledFields: kpis.filledFields,
    sources: kpis.sources,
  });
}
