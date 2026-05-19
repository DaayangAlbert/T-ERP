import { createElement, type ReactElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { CdtWeeklyReportPDF, type CdtReportPdfData } from "@/components/cdt/reports/CdtWeeklyReportPDF";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.WORKS_MANAGER,
  Role.WORKS_DIRECTOR,
  Role.TECH_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.SUPER_ADMIN,
];

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await prisma.cdtWeeklyReport.findUnique({
    where: { id },
    include: {
      author: { select: { firstName: true, lastName: true, position: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
      sites: {
        include: {
          site: { select: { code: true, name: true, client: true, region: true } },
        },
        orderBy: { site: { code: "asc" } },
      },
    },
  });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // RBAC : CDT ne voit que les siens
  if (session.role === Role.WORKS_MANAGER && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: report.tenantId },
    select: {
      name: true,
      contactAddress: true,
      contactPhone: true,
      contactEmail: true,
      taxId: true,
      logoUrl: true,
    },
  });

  const previousCount = await prisma.cdtWeeklyReport.count({
    where: {
      authorId: report.authorId,
      OR: [
        { weekStart: { lt: report.weekStart } },
        { weekStart: report.weekStart, createdAt: { lt: report.createdAt } },
      ],
    },
  });

  const pdfData: CdtReportPdfData = {
    id: report.id,
    reportNumber: previousCount + 1,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    weekLabel: report.weekLabel,
    status: report.status,
    workingDays: report.workingDays,
    weatherDays: report.weatherDays,
    subcontractorsPresent: report.subcontractorsPresent,
    globalSummary: report.globalSummary,
    keyAchievements: report.keyAchievements,
    transverseIssues: report.transverseIssues,
    scheduleSlippages: report.scheduleSlippages,
    arbitrationsNeeded: report.arbitrationsNeeded,
    nextWeekPlan: report.nextWeekPlan,
    sites: report.sites.map((s) => ({
      siteId: s.siteId,
      code: s.site.code,
      name: s.site.name,
      client: s.site.client,
      region: s.site.region,
      physicalProgressPercent: s.physicalProgressPercent,
      financialProgressPercent: s.financialProgressPercent,
      valueProducedXAF: s.valueProducedXAF.toString(),
      avgWorkforce: s.avgWorkforce,
      hseIncidentsCount: s.hseIncidentsCount,
      milestonesAchieved: s.milestonesAchieved,
      milestonesAtRisk: s.milestonesAtRisk,
      notes: s.notes,
    })),
    author: {
      name: `${report.author.firstName} ${report.author.lastName}`,
      position: report.author.position,
    },
    validatedBy: report.validatedBy ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}` : null,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    tenant: {
      name: tenant?.name ?? "—",
      contactAddress: tenant?.contactAddress ?? null,
      contactPhone: tenant?.contactPhone ?? null,
      contactEmail: tenant?.contactEmail ?? null,
      taxId: tenant?.taxId ?? null,
      logoUrl: tenant?.logoUrl ?? null,
    },
  };

  try {
    const element = createElement(CdtWeeklyReportPDF, { report: pdfData }) as unknown as ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(element);
    const filename = `rapport_hebdo_cdt_${report.weekStart.toISOString().slice(0, 10)}.pdf`;

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
    console.error("[GET /api/cdt/weekly-reports/:id/pdf]", (err as Error).message);
    return NextResponse.json(
      { error: "Génération du PDF échouée", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
