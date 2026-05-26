import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { uploadUrlToDataUri } from "@/lib/upload-paths";
import { QhseMonthlyReportPDF, type QhseReportPdfData } from "@/components/qhse/reports/QhseMonthlyReportPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [Role.QHSE_MANAGER, Role.TECH_DIRECTOR, Role.DG, Role.OWNER, Role.DAF, Role.WORKS_DIRECTOR, Role.SUPER_ADMIN];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.qhseMonthlyReport.findUnique({
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
    },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
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

  const [logoDataUri, stampDataUri, signatureDataUri] = await Promise.all([
    uploadUrlToDataUri(tenant?.logoUrl),
    uploadUrlToDataUri(tenant?.stampImageUrl),
    uploadUrlToDataUri(report.validatedBy?.signature?.signatureUrl),
  ]);

  const previousCount = await prisma.qhseMonthlyReport.count({
    where: {
      tenantId: report.tenantId,
      OR: [
        { period: { lt: report.period } },
        { period: report.period, createdAt: { lt: report.createdAt } },
      ],
    },
  });

  const data: QhseReportPdfData = {
    id: report.id,
    reportNumber: previousCount + 1,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    status: report.status,
    totalHoursWorked: report.totalHoursWorked.toString(),
    totalIncidents: report.totalIncidents,
    lostTimeIncidents: report.lostTimeIncidents,
    noLostTimeIncidents: report.noLostTimeIncidents,
    daysLost: report.daysLost,
    tf1: report.tf1,
    tg: report.tg,
    daysWithoutAccident: report.daysWithoutAccident,
    cutsCount: report.cutsCount,
    fallsCount: report.fallsCount,
    electricalCount: report.electricalCount,
    chemicalCount: report.chemicalCount,
    vehiclesCount: report.vehiclesCount,
    otherCount: report.otherCount,
    internalAudits: report.internalAudits,
    externalAudits: report.externalAudits,
    inspectionsCount: report.inspectionsCount,
    observationsCount: report.observationsCount,
    ncOpened: report.ncOpened,
    ncClosed: report.ncClosed,
    ncCritical: report.ncCritical,
    ncOverdue: report.ncOverdue,
    safetyTrainings: report.safetyTrainings,
    trainingHours: report.trainingHours,
    personsTrained: report.personsTrained,
    epiDistributed: report.epiDistributed,
    epiCheckCompliance: report.epiCheckCompliance,
    executiveSummary: report.executiveSummary,
    incidentsAnalysis: report.incidentsAnalysis,
    auditFindings: report.auditFindings,
    ncAnalysis: report.ncAnalysis,
    trainingsAnalysis: report.trainingsAnalysis,
    epiAnalysis: report.epiAnalysis,
    actionPlans: report.actionPlans,
    trendsAnalysis: report.trendsAnalysis,
    chsctRecommendations: report.chsctRecommendations,
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
    const element = createElement(QhseMonthlyReportPDF, { report: data }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `rapport_qhse_${report.period.toISOString().slice(0, 7)}.pdf`;

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
    console.error("[GET /api/qhse/monthly-reports/:id/pdf]", (err as Error).message);
    return NextResponse.json({ error: "Génération du PDF échouée", detail: (err as Error).message }, { status: 500 });
  }
}
