import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { uploadUrlToDataUri } from "@/lib/upload-paths";
import { DtMonthlyReportPDF, type DtReportPdfData } from "@/components/dt/reports/DtMonthlyReportPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.TECH_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.WORKS_DIRECTOR,
  Role.SUPER_ADMIN,
];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.dtMonthlyTechReport.findUnique({
    where: { id },
    include: {
      author: { select: { firstName: true, lastName: true, position: true } },
      validatedBy: {
        select: {
          firstName: true,
          lastName: true,
          position: true,
          signature: { select: { signatureUrl: true } },
        },
      },
      sites: {
        include: { site: { select: { code: true, name: true, client: true, region: true } } },
        orderBy: { site: { code: "asc" } },
      },
    },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role === Role.TECH_DIRECTOR && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: report.tenantId },
    select: {
      name: true, contactAddress: true, contactPhone: true, contactEmail: true,
      taxId: true, logoUrl: true, stampImageUrl: true,
    },
  });

  // Inline les images en data URI pour react-pdf (cf gotcha standalone).
  const [logoDataUri, stampDataUri, signatureDataUri] = await Promise.all([
    uploadUrlToDataUri(tenant?.logoUrl),
    uploadUrlToDataUri(tenant?.stampImageUrl),
    uploadUrlToDataUri(report.validatedBy?.signature?.signatureUrl),
  ]);

  const previousCount = await prisma.dtMonthlyTechReport.count({
    where: {
      tenantId: report.tenantId,
      OR: [
        { period: { lt: report.period } },
        { period: report.period, createdAt: { lt: report.createdAt } },
      ],
    },
  });

  const pdfData: DtReportPdfData = {
    id: report.id,
    reportNumber: previousCount + 1,
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
      siteId: s.siteId,
      code: s.site.code,
      name: s.site.name,
      client: s.site.client,
      region: s.site.region,
      physicalProgressPercent: s.physicalProgressPercent,
      financialProgressPercent: s.financialProgressPercent,
      marginPercent: s.marginPercent,
      revenueMonthXAF: s.revenueMonthXAF.toString(),
      hseIncidentsCount: s.hseIncidentsCount,
      ncOpenCount: s.ncOpenCount,
      riskLevel: s.riskLevel,
      notes: s.notes,
    })),
    author: { name: `${report.author.firstName} ${report.author.lastName}`, position: report.author.position },
    validatedBy: report.validatedBy ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}` : null,
    validatedByPosition: report.validatedBy?.position ?? null,
    validatedBySignatureUrl: signatureDataUri,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    tenant: {
      name: tenant?.name ?? "—",
      contactAddress: tenant?.contactAddress ?? null,
      contactPhone: tenant?.contactPhone ?? null,
      contactEmail: tenant?.contactEmail ?? null,
      taxId: tenant?.taxId ?? null,
      logoUrl: logoDataUri,
      stampImageUrl: stampDataUri,
    },
  };

  try {
    const element = createElement(DtMonthlyReportPDF, { report: pdfData }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `rapport_mensuel_dt_${report.period.toISOString().slice(0, 7)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/dt/monthly-reports/:id/pdf]", (err as Error).message);
    return NextResponse.json({ error: "Génération du PDF échouée", detail: (err as Error).message }, { status: 500 });
  }
}
