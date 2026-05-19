import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { ProgressReportPDF, type ReportPdfData } from "@/components/cc/reports/ProgressReportPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;

  const report = await prisma.siteProgressReport.findUnique({
    where: { id },
    include: {
      site: {
        include: {
          tenant: {
            select: {
              name: true,
              contactAddress: true,
              contactPhone: true,
              contactEmail: true,
              taxId: true,
              logoUrl: true,
              primaryColor: true,
            },
          },
          contract: {
            select: {
              reference: true,
              initialAmount: true,
              currentAmount: true,
              publicMarket: true,
              procuringEntity: true,
              signedAt: true,
              paymentTerms: true,
            },
          },
          manager: { select: { firstName: true, lastName: true } },
        },
      },
      author: { select: { firstName: true, lastName: true, position: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });

  // RBAC
  if (session.role === Role.SITE_MANAGER) {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
    });
    const allowed = new Set([
      ...(me?.assignedSiteIds ?? []),
      ...(me?.managedSites ?? []).map((s) => s.id),
    ]);
    if (!allowed.has(report.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }
  } else if (
    session.role !== Role.WORKS_DIRECTOR &&
    session.role !== Role.DG &&
    session.role !== Role.DAF &&
    session.role !== Role.WORKS_MANAGER &&
    session.role !== Role.TECH_DIRECTOR
  ) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  } else {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { tenantId: true },
    });
    if (me?.tenantId !== report.site.tenantId) {
      return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
    }
  }

  const attachments = report.attachmentDocumentIds.length
    ? await prisma.siteDocument.findMany({
        where: { id: { in: report.attachmentDocumentIds } },
        select: { id: true, title: true, category: true },
      })
    : [];

  // Comptage rapports antérieurs pour numéroter (rapport n°N)
  const previousCount = await prisma.siteProgressReport.count({
    where: {
      siteId: report.siteId,
      reportType: report.reportType,
      OR: [
        { period: { lt: report.period } },
        { period: report.period, createdAt: { lt: report.createdAt } },
      ],
    },
  });
  const reportNumber = previousCount + 1;

  const pdfData: ReportPdfData = {
    id: report.id,
    reportNumber,
    reportType: report.reportType,
    status: report.status,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    physicalProgressPercent: report.physicalProgressPercent,
    previousProgressPercent: report.previousProgressPercent,
    mainAchievements: report.mainAchievements,
    delaysIdentified: report.delaysIdentified,
    valueProducedXAF: report.valueProducedXAF.toString(),
    valueProducedCumulXAF: report.valueProducedCumulXAF.toString(),
    avgWorkforce: report.avgWorkforce,
    maxWorkforce: report.maxWorkforce,
    overtimeHoursTotal: report.overtimeHoursTotal,
    billingStatus: report.billingStatus,
    hseIncidentsCount: report.hseIncidentsCount,
    daysWithoutAccident: report.daysWithoutAccident,
    issuesEncountered: report.issuesEncountered,
    supportNeeded: report.supportNeeded,
    nextPeriodPriorities: report.nextPeriodPriorities,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    author: {
      name: `${report.author.firstName} ${report.author.lastName}`,
      position: report.author.position ?? "Chef de chantier",
    },
    validatedBy: report.validatedBy
      ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}`
      : null,
    site: {
      code: report.site.code,
      name: report.site.name,
      client: report.site.client,
      region: report.site.region,
      budget: report.site.budget.toString(),
      startDate: report.site.startDate.toISOString(),
      plannedEndDate: report.site.plannedEndDate.toISOString(),
      progress: report.site.progress,
      physicalProgress: report.site.physicalProgress,
      financialProgress: report.site.financialProgress,
      moaName: report.site.moaName,
      manager: report.site.manager
        ? `${report.site.manager.firstName} ${report.site.manager.lastName}`
        : null,
    },
    contract: report.site.contract
      ? {
          reference: report.site.contract.reference,
          initialAmount: report.site.contract.initialAmount.toString(),
          currentAmount: report.site.contract.currentAmount.toString(),
          publicMarket: report.site.contract.publicMarket,
          procuringEntity: report.site.contract.procuringEntity,
          signedAt: report.site.contract.signedAt?.toISOString() ?? null,
        }
      : null,
    tenant: {
      name: report.site.tenant.name,
      contactAddress: report.site.tenant.contactAddress,
      contactPhone: report.site.tenant.contactPhone,
      contactEmail: report.site.tenant.contactEmail,
      taxId: report.site.tenant.taxId,
      logoUrl: report.site.tenant.logoUrl,
      primaryColor: report.site.tenant.primaryColor,
    },
    attachments: attachments.map((a) => ({ id: a.id, title: a.title, category: a.category })),
  };

  try {
    const element = createElement(ProgressReportPDF, {
      report: pdfData,
    }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);

    const filename = `rapport_${report.site.code}_${report.period.toISOString().slice(0, 10)}.pdf`;

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
    console.error("[GET /api/cc/progress-reports/:id/pdf]", (err as Error).message);
    return NextResponse.json(
      { error: "Génération du PDF échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
