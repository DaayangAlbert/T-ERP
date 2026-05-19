import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role, SiteProgressReportStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createReportSchema } from "@/schemas/site-progress-report";

export const dynamic = "force-dynamic";

async function getAllowedSiteIds(userId: string): Promise<string[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { assignedSiteIds: true, managedSites: { select: { id: true } } },
  });
  return Array.from(
    new Set([...(me?.assignedSiteIds ?? []), ...(me?.managedSites ?? []).map((s) => s.id)]),
  );
}

/**
 * Liste les rapports d'avancement des chantiers du CC connecté.
 * Filtres : ?siteId, ?status, ?reportType
 */
export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  const allowedSiteIds = await getAllowedSiteIds(session.sub);
  if (allowedSiteIds.length === 0) {
    return NextResponse.json({ items: [], summary: emptySummary() });
  }

  const url = new URL(req.url);
  const siteIdFilter = url.searchParams.get("siteId");
  const statusFilter = url.searchParams.get("status") as SiteProgressReportStatus | null;
  const typeFilter = url.searchParams.get("reportType");

  const where: Prisma.SiteProgressReportWhereInput = {
    siteId:
      siteIdFilter && allowedSiteIds.includes(siteIdFilter)
        ? siteIdFilter
        : { in: allowedSiteIds },
  };
  if (statusFilter) where.status = statusFilter;
  if (typeFilter) where.reportType = typeFilter as Prisma.SiteProgressReportWhereInput["reportType"];

  const items = await prisma.siteProgressReport.findMany({
    where,
    orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    take: 200,
    include: {
      site: { select: { id: true, code: true, name: true } },
      author: { select: { firstName: true, lastName: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      siteId: r.siteId,
      site: r.site,
      reportType: r.reportType,
      period: r.period.toISOString(),
      periodLabel: r.periodLabel,
      status: r.status,
      physicalProgressPercent: r.physicalProgressPercent,
      previousProgressPercent: r.previousProgressPercent,
      valueProducedXAF: r.valueProducedXAF.toString(),
      valueProducedCumulXAF: r.valueProducedCumulXAF.toString(),
      avgWorkforce: r.avgWorkforce,
      hseIncidentsCount: r.hseIncidentsCount,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      validatedAt: r.validatedAt?.toISOString() ?? null,
      rejectionReason: r.rejectionReason,
      pdfUrl: r.pdfUrl,
      author: `${r.author.firstName} ${r.author.lastName}`,
      validatedBy: r.validatedBy ? `${r.validatedBy.firstName} ${r.validatedBy.lastName}` : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
    summary: {
      total: items.length,
      drafts: items.filter((r) => r.status === "DRAFT").length,
      submitted: items.filter((r) => r.status === "SUBMITTED").length,
      validated: items.filter((r) => r.status === "VALIDATED").length,
      rejected: items.filter((r) => r.status === "REJECTED").length,
    },
  });
}

/**
 * Crée un brouillon (étape 1 du wizard) — payload = createReportSchema.
 */
export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.SITE_MANAGER) {
    return NextResponse.json({ error: "Accès réservé au Chef de Chantier" }, { status: 403 });
  }

  try {
    const body = createReportSchema.parse(await req.json());

    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, tenantId: true },
    });
    if (!site) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

    const allowed = await getAllowedSiteIds(session.sub);
    if (!allowed.includes(body.siteId)) {
      return NextResponse.json({ error: "Chantier hors périmètre" }, { status: 403 });
    }

    const created = await prisma.siteProgressReport.create({
      data: {
        tenantId: site.tenantId,
        siteId: body.siteId,
        authorId: session.sub,
        reportType: body.reportType,
        period: new Date(body.period),
        periodLabel: body.periodLabel ?? null,
        physicalProgressPercent: body.physicalProgressPercent,
        previousProgressPercent: body.previousProgressPercent ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Payload invalide", issues: err.flatten() },
        { status: 400 },
      );
    }
    console.error("[POST /api/cc/progress-reports]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

function emptySummary() {
  return { total: 0, drafts: 0, submitted: 0, validated: 0, rejected: 0 };
}
