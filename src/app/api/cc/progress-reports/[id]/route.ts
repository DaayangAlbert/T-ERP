import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateReportSchema } from "@/schemas/site-progress-report";

export const dynamic = "force-dynamic";

async function loadReportForCc(reportId: string, userId: string) {
  const report = await prisma.siteProgressReport.findUnique({
    where: { id: reportId },
    include: {
      site: { select: { id: true, code: true, name: true } },
      author: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!report) return null;

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  const allowed = new Set([
    ...(me?.assignedSiteIds ?? []),
    ...(me?.managedSites ?? []).map((s) => s.id),
  ]);
  if (!allowed.has(report.siteId)) return "forbidden" as const;

  return report;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const report = await loadReportForCc(id, session.sub);
  if (!report) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  if (report === "forbidden") {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }

  // Hydrate attachments (siteDocument minimal)
  const attachments = report.attachmentDocumentIds.length
    ? await prisma.siteDocument.findMany({
        where: { id: { in: report.attachmentDocumentIds } },
        select: { id: true, title: true, category: true, fileUrl: true, fileName: true },
      })
    : [];

  return NextResponse.json({
    id: report.id,
    siteId: report.siteId,
    site: report.site,
    reportType: report.reportType,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    status: report.status,
    physicalProgressPercent: report.physicalProgressPercent,
    previousProgressPercent: report.previousProgressPercent,
    mainAchievements: report.mainAchievements,
    delaysIdentified: report.delaysIdentified,
    photos: report.photos,
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
    attachmentDocumentIds: report.attachmentDocumentIds,
    attachments,
    nextPeriodPriorities: report.nextPeriodPriorities,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    validatedAt: report.validatedAt?.toISOString() ?? null,
    rejectionReason: report.rejectionReason,
    pdfUrl: report.pdfUrl,
    author: `${report.author.firstName} ${report.author.lastName}`,
    validatedBy: report.validatedBy
      ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}`
      : null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await loadReportForCc(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  if (existing === "forbidden") {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
    return NextResponse.json(
      { error: "Rapport non modifiable (déjà soumis ou validé)" },
      { status: 409 },
    );
  }

  try {
    const body = updateReportSchema.parse(await req.json());

    const updated = await prisma.siteProgressReport.update({
      where: { id },
      data: {
        reportType: body.reportType ?? undefined,
        period: body.period ? new Date(body.period) : undefined,
        periodLabel: body.periodLabel ?? undefined,
        physicalProgressPercent: body.physicalProgressPercent ?? undefined,
        previousProgressPercent: body.previousProgressPercent ?? undefined,
        mainAchievements: body.mainAchievements ?? undefined,
        delaysIdentified: body.delaysIdentified ?? undefined,
        photos: body.photos ?? undefined,
        valueProducedXAF: body.valueProducedXAF !== undefined ? BigInt(body.valueProducedXAF) : undefined,
        valueProducedCumulXAF:
          body.valueProducedCumulXAF !== undefined ? BigInt(body.valueProducedCumulXAF) : undefined,
        avgWorkforce: body.avgWorkforce ?? undefined,
        maxWorkforce: body.maxWorkforce ?? undefined,
        overtimeHoursTotal: body.overtimeHoursTotal ?? undefined,
        billingStatus: body.billingStatus ?? undefined,
        hseIncidentsCount: body.hseIncidentsCount ?? undefined,
        daysWithoutAccident: body.daysWithoutAccident ?? undefined,
        issuesEncountered: body.issuesEncountered ?? undefined,
        supportNeeded: body.supportNeeded ?? undefined,
        attachmentDocumentIds: body.attachmentDocumentIds ?? undefined,
        nextPeriodPriorities: body.nextPeriodPriorities ?? undefined,
        // Si le rapport était REJECTED et qu'on l'édite, on le repasse en DRAFT
        status: existing.status === "REJECTED" ? "DRAFT" : undefined,
        rejectionReason: existing.status === "REJECTED" ? null : undefined,
      },
      select: { id: true, status: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/cc/progress-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const existing = await loadReportForCc(id, session.sub);
  if (!existing) return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  if (existing === "forbidden") {
    return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Seuls les brouillons peuvent être supprimés" },
      { status: 409 },
    );
  }

  await prisma.siteProgressReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
