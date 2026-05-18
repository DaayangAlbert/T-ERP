import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateDafMonthlyReportSchema } from "@/schemas/daf-monthly-report";

export const dynamic = "force-dynamic";

const VIEWER_ROLES: Role[] = [
  Role.DAF,
  Role.DG,
  Role.ACCOUNTANT,
  Role.SUPER_ADMIN,
  Role.TENANT_ADMIN,
];

async function loadReport(id: string) {
  return prisma.dafMonthlyFinancialReport.findUnique({
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
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role === Role.DAF && report.authorId !== session.sub) {
    return NextResponse.json({ error: "Hors périmètre" }, { status: 403 });
  }

  return NextResponse.json({
    id: report.id,
    period: report.period.toISOString(),
    periodLabel: report.periodLabel,
    status: report.status,

    revenueMonthXAF: report.revenueMonthXAF.toString(),
    revenueYtdXAF: report.revenueYtdXAF.toString(),
    revenueBudgetMonthXAF: report.revenueBudgetMonthXAF.toString(),
    expensesMonthXAF: report.expensesMonthXAF.toString(),
    grossMarginXAF: report.grossMarginXAF.toString(),
    grossMarginPercent: report.grossMarginPercent,
    netMarginXAF: report.netMarginXAF.toString(),
    netMarginPercent: report.netMarginPercent,
    ebitdaXAF: report.ebitdaXAF.toString(),
    ebitdaPercent: report.ebitdaPercent,

    cashBalanceXAF: report.cashBalanceXAF.toString(),
    cashVariationXAF: report.cashVariationXAF.toString(),
    creditLinesUsedXAF: report.creditLinesUsedXAF.toString(),
    creditLinesAvailableXAF: report.creditLinesAvailableXAF.toString(),
    capacityAutofinancingXAF: report.capacityAutofinancingXAF.toString(),

    accountsReceivableXAF: report.accountsReceivableXAF.toString(),
    overdueReceivablesXAF: report.overdueReceivablesXAF.toString(),
    doubtfulReceivablesXAF: report.doubtfulReceivablesXAF.toString(),
    dso: report.dso,

    accountsPayableXAF: report.accountsPayableXAF.toString(),
    overduePayablesXAF: report.overduePayablesXAF.toString(),
    dpo: report.dpo,

    workingCapitalNeedXAF: report.workingCapitalNeedXAF.toString(),
    financialDebtLtXAF: report.financialDebtLtXAF.toString(),
    financialDebtStXAF: report.financialDebtStXAF.toString(),
    gearingPercent: report.gearingPercent,
    capexMonthXAF: report.capexMonthXAF.toString(),

    payrollMassMonthXAF: report.payrollMassMonthXAF.toString(),
    payrollHeadcount: report.payrollHeadcount,
    payrollVsRevenuePercent: report.payrollVsRevenuePercent,

    vatCollectedXAF: report.vatCollectedXAF.toString(),
    vatDeductibleXAF: report.vatDeductibleXAF.toString(),
    vatDueXAF: report.vatDueXAF.toString(),
    corporateTaxProvisionXAF: report.corporateTaxProvisionXAF.toString(),
    socialChargesUpToDate: report.socialChargesUpToDate,
    fiscalDeadlinesNext30d: report.fiscalDeadlinesNext30d,

    executiveSummary: report.executiveSummary,
    performanceAnalysis: report.performanceAnalysis,
    cashFlowAnalysis: report.cashFlowAnalysis,
    receivablesAnalysis: report.receivablesAnalysis,
    payablesAnalysis: report.payablesAnalysis,
    fiscalAnalysis: report.fiscalAnalysis,
    financialRisks: report.financialRisks,
    financialDecisions: report.financialDecisions,
    recommendations: report.recommendations,
    nextMonthOutlook: report.nextMonthOutlook,

    author: {
      id: report.author.id,
      name: `${report.author.firstName} ${report.author.lastName}`,
      position: report.author.position,
    },
    validatedBy: report.validatedBy
      ? `${report.validatedBy.firstName} ${report.validatedBy.lastName}`
      : null,
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

  if (session.role !== Role.DAF || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Édition réservée à l'auteur" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  try {
    const body = updateDafMonthlyReportSchema.parse(await req.json());

    // BigInts depuis strings, Floats directs
    const data: Record<string, unknown> = {
      period: body.period ? new Date(body.period) : undefined,
      periodLabel: body.periodLabel ?? undefined,
      grossMarginPercent: body.grossMarginPercent ?? undefined,
      netMarginPercent: body.netMarginPercent ?? undefined,
      ebitdaPercent: body.ebitdaPercent ?? undefined,
      dso: body.dso ?? undefined,
      dpo: body.dpo ?? undefined,
      gearingPercent: body.gearingPercent ?? undefined,
      payrollHeadcount: body.payrollHeadcount ?? undefined,
      payrollVsRevenuePercent: body.payrollVsRevenuePercent ?? undefined,
      socialChargesUpToDate: body.socialChargesUpToDate ?? undefined,
      fiscalDeadlinesNext30d: body.fiscalDeadlinesNext30d ?? undefined,
      executiveSummary: body.executiveSummary ?? undefined,
      performanceAnalysis: body.performanceAnalysis ?? undefined,
      cashFlowAnalysis: body.cashFlowAnalysis ?? undefined,
      receivablesAnalysis: body.receivablesAnalysis ?? undefined,
      payablesAnalysis: body.payablesAnalysis ?? undefined,
      fiscalAnalysis: body.fiscalAnalysis ?? undefined,
      financialRisks: body.financialRisks ?? undefined,
      financialDecisions: body.financialDecisions ?? undefined,
      recommendations: body.recommendations ?? undefined,
      nextMonthOutlook: body.nextMonthOutlook ?? undefined,
      status: report.status === "REJECTED" ? "DRAFT" : undefined,
      rejectionReason: report.status === "REJECTED" ? null : undefined,
    };

    const bigintFields = [
      "revenueMonthXAF",
      "revenueYtdXAF",
      "revenueBudgetMonthXAF",
      "expensesMonthXAF",
      "grossMarginXAF",
      "netMarginXAF",
      "ebitdaXAF",
      "cashBalanceXAF",
      "cashVariationXAF",
      "creditLinesUsedXAF",
      "creditLinesAvailableXAF",
      "capacityAutofinancingXAF",
      "accountsReceivableXAF",
      "overdueReceivablesXAF",
      "doubtfulReceivablesXAF",
      "accountsPayableXAF",
      "overduePayablesXAF",
      "workingCapitalNeedXAF",
      "financialDebtLtXAF",
      "financialDebtStXAF",
      "capexMonthXAF",
      "payrollMassMonthXAF",
      "vatCollectedXAF",
      "vatDeductibleXAF",
      "vatDueXAF",
      "corporateTaxProvisionXAF",
    ] as const;

    for (const k of bigintFields) {
      const v = body[k];
      if (v !== undefined && v !== null && v !== "") {
        try {
          data[k] = BigInt(v);
        } catch {
          /* ignore invalid */
        }
      }
    }

    await prisma.dafMonthlyFinancialReport.update({ where: { id }, data });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Payload invalide", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH /api/daf/monthly-reports/:id]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await loadReport(id);
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (session.role !== Role.DAF || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur" }, { status: 403 });
  }
  if (report.status === "VALIDATED") {
    return NextResponse.json({ error: "Rapport validé non supprimable" }, { status: 409 });
  }

  await prisma.dafMonthlyFinancialReport.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
