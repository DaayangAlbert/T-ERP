import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateMonthlyReportSchema } from "@/schemas/dt-monthly-report";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.TECH_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.WORKS_DIRECTOR,
  Role.SUPER_ADMIN,
];

async function loadReport(id: string) {
  return prisma.dtMonthlyTechReport.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, position: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      sites: {
        include: {
          site: { select: { id: true, code: true, name: true, client: true, region: true } },
        },
        orderBy: { site: { code: "asc" } },
      },
    },
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role === Role.TECH_DIRECTOR && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  return NextResponse.json({
    id: report.id,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    status: report.status,
    sitesActiveCount: report.sitesActiveCount,
    sitesCompletedCount: report.sitesCompletedCount,
    sitesAtRiskCount: report.sitesAtRiskCount,
    avgPhysicalProgress: report.avgPhysicalProgress,
    avgFinancialProgress: report.avgFinancialProgress,
    totalRevenueXAF: report.totalRevenueXAF.toString(),
    totalSpentXAF: report.totalSpentXAF.toString(),
    portfolioMarginPercent: report.portfolioMarginPercent,
    hseTotalIncidents: report.hseTotalIncidents,
    hseTf1: report.hseTf1,
    hseAuditsConducted: report.hseAuditsConducted,
    hseNcOpen: report.hseNcOpen,
    subcontractorsActive: report.subcontractorsActive,
    subcontractorsAtRisk: report.subcontractorsAtRisk,
    executiveSummary: report.executiveSummary,
    financialAnalysis: report.financialAnalysis,
    qhseAnalysis: report.qhseAnalysis,
    subcontractingAnalysis: report.subcontractingAnalysis,
    majorRisks: report.majorRisks,
    technicalDecisions: report.technicalDecisions,
    recommendations: report.recommendations,
    nextMonthOutlook: report.nextMonthOutlook,
    sites: report.sites.map((s) => ({
      id: s.id,
      siteId: s.siteId,
      site: s.site,
      physicalProgressPercent: s.physicalProgressPercent,
      financialProgressPercent: s.financialProgressPercent,
      marginPercent: s.marginPercent,
      revenueMonthXAF: s.revenueMonthXAF.toString(),
      hseIncidentsCount: s.hseIncidentsCount,
      ncOpenCount: s.ncOpenCount,
      riskLevel: s.riskLevel,
      notes: s.notes,
    })),
    author: {
      id: report.author.id,
      name: `${report.author.firstName} ${report.author.lastName}`,
      position: report.author.position,
    },
    validatedBy: report.validatedBy ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}` : null,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    createdAt: report.createdAt.toISOString(),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (session.role !== Role.TECH_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Édition réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  try {
    const body = updateMonthlyReportSchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.dtMonthlyTechReport.update({
        where: { id },
        data: {
          period: body.period ? new Date(body.period) : undefined,
          periodLabel: body.periodLabel ?? undefined,
          sitesActiveCount: body.sitesActiveCount ?? undefined,
          sitesCompletedCount: body.sitesCompletedCount ?? undefined,
          sitesAtRiskCount: body.sitesAtRiskCount ?? undefined,
          avgPhysicalProgress: body.avgPhysicalProgress ?? undefined,
          avgFinancialProgress: body.avgFinancialProgress ?? undefined,
          totalRevenueXAF: body.totalRevenueXAF ? BigInt(body.totalRevenueXAF) : undefined,
          totalSpentXAF: body.totalSpentXAF ? BigInt(body.totalSpentXAF) : undefined,
          portfolioMarginPercent: body.portfolioMarginPercent ?? undefined,
          hseTotalIncidents: body.hseTotalIncidents ?? undefined,
          hseTf1: body.hseTf1 ?? undefined,
          hseAuditsConducted: body.hseAuditsConducted ?? undefined,
          hseNcOpen: body.hseNcOpen ?? undefined,
          subcontractorsActive: body.subcontractorsActive ?? undefined,
          subcontractorsAtRisk: body.subcontractorsAtRisk ?? undefined,
          executiveSummary: body.executiveSummary ?? undefined,
          financialAnalysis: body.financialAnalysis ?? undefined,
          qhseAnalysis: body.qhseAnalysis ?? undefined,
          subcontractingAnalysis: body.subcontractingAnalysis ?? undefined,
          majorRisks: body.majorRisks ?? undefined,
          technicalDecisions: body.technicalDecisions ?? undefined,
          recommendations: body.recommendations ?? undefined,
          nextMonthOutlook: body.nextMonthOutlook ?? undefined,
          status: report.status === "REJECTED" ? "DRAFT" : undefined,
          rejectionReason: report.status === "REJECTED" ? null : undefined,
        },
      });

      if (body.sites) {
        await tx.dtMonthlyTechReportSite.deleteMany({ where: { reportId: id } });
        if (body.sites.length > 0) {
          await tx.dtMonthlyTechReportSite.createMany({
            data: body.sites.map((s) => ({
              reportId: id,
              siteId: s.siteId,
              physicalProgressPercent: s.physicalProgressPercent,
              financialProgressPercent: s.financialProgressPercent,
              marginPercent: s.marginPercent,
              revenueMonthXAF: BigInt(s.revenueMonthXAF || "0"),
              hseIncidentsCount: s.hseIncidentsCount,
              ncOpenCount: s.ncOpenCount,
              riskLevel: s.riskLevel ?? null,
              notes: s.notes ?? null,
            })),
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/dt/monthly-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.TECH_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur" }, { status: 403 });
  }
  if (report.status === "VALIDATED") {
    return NextResponse.json({ error: "Rapport validé non supprimable" }, { status: 409 });
  }

  await prisma.dtMonthlyTechReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
