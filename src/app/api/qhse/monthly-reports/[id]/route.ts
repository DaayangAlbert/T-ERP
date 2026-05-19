import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateQhseMonthlyReportSchema } from "@/schemas/qhse-monthly-report";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [Role.TECH_DIRECTOR, Role.DG, Role.DAF, Role.WORKS_DIRECTOR, Role.SUPER_ADMIN];

async function load(id: string) {
  return prisma.qhseMonthlyReport.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, position: true } },
      validatedBy: { select: { firstName: true, lastName: true } },
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
  const report = await load(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  if (session.role === Role.TECH_DIRECTOR && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  return NextResponse.json({
    id: report.id,
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
    author: { id: report.author.id, name: `${report.author.firstName} ${report.author.lastName}`, position: report.author.position },
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
  const report = await load(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.TECH_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Édition réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  try {
    const body = updateQhseMonthlyReportSchema.parse(await req.json());

    await prisma.qhseMonthlyReport.update({
      where: { id },
      data: {
        period: body.period ? new Date(body.period) : undefined,
        periodLabel: body.periodLabel ?? undefined,
        totalHoursWorked: body.totalHoursWorked ? BigInt(body.totalHoursWorked) : undefined,
        totalIncidents: body.totalIncidents ?? undefined,
        lostTimeIncidents: body.lostTimeIncidents ?? undefined,
        noLostTimeIncidents: body.noLostTimeIncidents ?? undefined,
        daysLost: body.daysLost ?? undefined,
        tf1: body.tf1 ?? undefined,
        tg: body.tg ?? undefined,
        daysWithoutAccident: body.daysWithoutAccident ?? undefined,
        cutsCount: body.cutsCount ?? undefined,
        fallsCount: body.fallsCount ?? undefined,
        electricalCount: body.electricalCount ?? undefined,
        chemicalCount: body.chemicalCount ?? undefined,
        vehiclesCount: body.vehiclesCount ?? undefined,
        otherCount: body.otherCount ?? undefined,
        internalAudits: body.internalAudits ?? undefined,
        externalAudits: body.externalAudits ?? undefined,
        inspectionsCount: body.inspectionsCount ?? undefined,
        observationsCount: body.observationsCount ?? undefined,
        ncOpened: body.ncOpened ?? undefined,
        ncClosed: body.ncClosed ?? undefined,
        ncCritical: body.ncCritical ?? undefined,
        ncOverdue: body.ncOverdue ?? undefined,
        safetyTrainings: body.safetyTrainings ?? undefined,
        trainingHours: body.trainingHours ?? undefined,
        personsTrained: body.personsTrained ?? undefined,
        epiDistributed: body.epiDistributed ?? undefined,
        epiCheckCompliance: body.epiCheckCompliance ?? undefined,
        executiveSummary: body.executiveSummary ?? undefined,
        incidentsAnalysis: body.incidentsAnalysis ?? undefined,
        auditFindings: body.auditFindings ?? undefined,
        ncAnalysis: body.ncAnalysis ?? undefined,
        trainingsAnalysis: body.trainingsAnalysis ?? undefined,
        epiAnalysis: body.epiAnalysis ?? undefined,
        actionPlans: body.actionPlans ?? undefined,
        trendsAnalysis: body.trendsAnalysis ?? undefined,
        chsctRecommendations: body.chsctRecommendations ?? undefined,
        status: report.status === "REJECTED" ? "DRAFT" : undefined,
        rejectionReason: report.status === "REJECTED" ? null : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/qhse/monthly-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await load(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.TECH_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur" }, { status: 403 });
  }
  if (report.status === "VALIDATED") {
    return NextResponse.json({ error: "Rapport validé non supprimable" }, { status: 409 });
  }

  await prisma.qhseMonthlyReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
