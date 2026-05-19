import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateDtravMonthlyReportSchema } from "@/schemas/dtrav-monthly-report";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.WORKS_DIRECTOR,
  Role.DG,
  Role.DAF,
  Role.TECH_DIRECTOR,
  Role.SUPER_ADMIN,
];

async function load(id: string) {
  return prisma.dtravMonthlyReport.findUnique({
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
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role === Role.WORKS_DIRECTOR && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  return NextResponse.json({
    id: report.id,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    status: report.status,
    revenueProducedXAF: report.revenueProducedXAF.toString(),
    revenueDeliveredXAF: report.revenueDeliveredXAF.toString(),
    marginPercent: report.marginPercent,
    sitesDelivered: report.sitesDelivered,
    receivablesXAF: report.receivablesXAF.toString(),
    overdueReceivablesXAF: report.overdueReceivablesXAF.toString(),
    dso: report.dso,
    decompteIssuedCount: report.decompteIssuedCount,
    decompteIssuedXAF: report.decompteIssuedXAF.toString(),
    amendmentsCount: report.amendmentsCount,
    penaltiesAppliedXAF: report.penaltiesAppliedXAF.toString(),
    litigationsOpen: report.litigationsOpen,
    cdtCount: report.cdtCount,
    cdtReportsValidated: report.cdtReportsValidated,
    cdtUnderperforming: report.cdtUnderperforming,
    workforceTotal: report.workforceTotal,
    workforceOvertimeHours: report.workforceOvertimeHours,
    workforceCostXAF: report.workforceCostXAF.toString(),
    executiveSummary: report.executiveSummary,
    productionAnalysis: report.productionAnalysis,
    collectionsAnalysis: report.collectionsAnalysis,
    contractualSituation: report.contractualSituation,
    cdtPerformance: report.cdtPerformance,
    workforceAnalysis: report.workforceAnalysis,
    majorIssues: report.majorIssues,
    arbitragesRequested: report.arbitragesRequested,
    nextMonthStrategy: report.nextMonthStrategy,
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
  const report = await load(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.WORKS_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Édition réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  try {
    const body = updateDtravMonthlyReportSchema.parse(await req.json());

    await prisma.dtravMonthlyReport.update({
      where: { id },
      data: {
        period: body.period ? new Date(body.period) : undefined,
        periodLabel: body.periodLabel ?? undefined,
        revenueProducedXAF: body.revenueProducedXAF ? BigInt(body.revenueProducedXAF) : undefined,
        revenueDeliveredXAF: body.revenueDeliveredXAF ? BigInt(body.revenueDeliveredXAF) : undefined,
        marginPercent: body.marginPercent ?? undefined,
        sitesDelivered: body.sitesDelivered ?? undefined,
        receivablesXAF: body.receivablesXAF ? BigInt(body.receivablesXAF) : undefined,
        overdueReceivablesXAF: body.overdueReceivablesXAF ? BigInt(body.overdueReceivablesXAF) : undefined,
        dso: body.dso ?? undefined,
        decompteIssuedCount: body.decompteIssuedCount ?? undefined,
        decompteIssuedXAF: body.decompteIssuedXAF ? BigInt(body.decompteIssuedXAF) : undefined,
        amendmentsCount: body.amendmentsCount ?? undefined,
        penaltiesAppliedXAF: body.penaltiesAppliedXAF ? BigInt(body.penaltiesAppliedXAF) : undefined,
        litigationsOpen: body.litigationsOpen ?? undefined,
        cdtCount: body.cdtCount ?? undefined,
        cdtReportsValidated: body.cdtReportsValidated ?? undefined,
        cdtUnderperforming: body.cdtUnderperforming ?? undefined,
        workforceTotal: body.workforceTotal ?? undefined,
        workforceOvertimeHours: body.workforceOvertimeHours ?? undefined,
        workforceCostXAF: body.workforceCostXAF ? BigInt(body.workforceCostXAF) : undefined,
        executiveSummary: body.executiveSummary ?? undefined,
        productionAnalysis: body.productionAnalysis ?? undefined,
        collectionsAnalysis: body.collectionsAnalysis ?? undefined,
        contractualSituation: body.contractualSituation ?? undefined,
        cdtPerformance: body.cdtPerformance ?? undefined,
        workforceAnalysis: body.workforceAnalysis ?? undefined,
        majorIssues: body.majorIssues ?? undefined,
        arbitragesRequested: body.arbitragesRequested ?? undefined,
        nextMonthStrategy: body.nextMonthStrategy ?? undefined,
        status: report.status === "REJECTED" ? "DRAFT" : undefined,
        rejectionReason: report.status === "REJECTED" ? null : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/dtrav/monthly-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await load(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.WORKS_DIRECTOR || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur" }, { status: 403 });
  }
  if (report.status === "VALIDATED") {
    return NextResponse.json({ error: "Rapport validé non supprimable" }, { status: 409 });
  }

  await prisma.dtravMonthlyReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
