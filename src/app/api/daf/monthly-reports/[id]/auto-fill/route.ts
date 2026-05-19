import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { computeDafKpis } from "@/lib/reports/auto-fill";

export const dynamic = "force-dynamic";

/**
 * POST /api/daf/monthly-reports/[id]/auto-fill
 *
 * Calcule tous les KPIs financiers depuis les sources de la DB
 * (ProgressBilling, SupplierInvoice, BankAccount, Payslip) pour le mois
 * du rapport, et met à jour le rapport. Conserve les sections narratives.
 *
 * Réservé à l'auteur du rapport (DAF) tant que statut DRAFT ou REJECTED.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await ctx.params;
  const report = await prisma.dafMonthlyFinancialReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (report.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Hors tenant" }, { status: 403 });
  }
  if (session.role !== Role.DAF || report.authorId !== session.sub) {
    return NextResponse.json({ error: "Réservé à l'auteur (DAF)" }, { status: 403 });
  }
  if (report.status !== "DRAFT" && report.status !== "REJECTED") {
    return NextResponse.json({ error: "Rapport non éditable" }, { status: 409 });
  }

  const kpis = await computeDafKpis(session.tenantId, report.period);

  // On garde tout ce qui est narratif + les champs non-couverts par l'auto-fill
  // (cashVariationXAF, CAF, douteux, structure financière, fiscal, etc. — c'est
  // au DAF de les saisir car ce sont des montants soit non disponibles
  // automatiquement, soit calculés hors système).
  await prisma.dafMonthlyFinancialReport.update({
    where: { id },
    data: {
      revenueMonthXAF: kpis.revenueMonthXAF,
      revenueYtdXAF: kpis.revenueYtdXAF,
      expensesMonthXAF: kpis.expensesMonthXAF,
      grossMarginXAF: kpis.grossMarginXAF,
      grossMarginPercent: kpis.grossMarginPercent,

      cashBalanceXAF: kpis.cashBalanceXAF,
      creditLinesUsedXAF: kpis.creditLinesUsedXAF,
      creditLinesAvailableXAF: kpis.creditLinesAvailableXAF,

      accountsReceivableXAF: kpis.accountsReceivableXAF,
      overdueReceivablesXAF: kpis.overdueReceivablesXAF,
      dso: kpis.dso,

      accountsPayableXAF: kpis.accountsPayableXAF,
      overduePayablesXAF: kpis.overduePayablesXAF,
      dpo: kpis.dpo,

      payrollMassMonthXAF: kpis.payrollMassMonthXAF,
      payrollHeadcount: kpis.payrollHeadcount,
      payrollVsRevenuePercent: kpis.payrollVsRevenuePercent,
    },
  });

  return NextResponse.json({
    ok: true,
    filledFields: kpis.filledFields,
    sources: kpis.sources,
  });
}
