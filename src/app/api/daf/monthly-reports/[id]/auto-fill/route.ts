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
 * (ProgressBilling, SupplierInvoice, BankAccount, Payslip, FixedAsset,
 * rapport précédent) pour le mois du rapport et met à jour le rapport.
 * Conserve les sections narratives.
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

  // On remplit TOUS les champs calculables. Seuls restent au DAF :
  //   - Dette financière LT / CT et Gearing (besoin d'un suivi des emprunts
  //     bancaires séparé non encore modélisé)
  //   - Échéances fiscales ≤ 30 j (besoin d'un calendrier fiscal)
  //   - Cotisations sociales à jour (booléen — pré-rempli à true par défaut)
  //   - Les 10 sections narratives (jugement humain requis)
  await prisma.dafMonthlyFinancialReport.update({
    where: { id },
    data: {
      // 1) Performance
      revenueMonthXAF: kpis.revenueMonthXAF,
      revenueYtdXAF: kpis.revenueYtdXAF,
      expensesMonthXAF: kpis.expensesMonthXAF,
      grossMarginXAF: kpis.grossMarginXAF,
      grossMarginPercent: kpis.grossMarginPercent,
      netMarginXAF: kpis.netMarginXAF,
      netMarginPercent: kpis.netMarginPercent,
      ebitdaXAF: kpis.ebitdaXAF,
      ebitdaPercent: kpis.ebitdaPercent,

      // 2) Trésorerie
      cashBalanceXAF: kpis.cashBalanceXAF,
      cashVariationXAF: kpis.cashVariationXAF,
      creditLinesUsedXAF: kpis.creditLinesUsedXAF,
      creditLinesAvailableXAF: kpis.creditLinesAvailableXAF,
      capacityAutofinancingXAF: kpis.capacityAutofinancingXAF,

      // 3) Créances
      accountsReceivableXAF: kpis.accountsReceivableXAF,
      overdueReceivablesXAF: kpis.overdueReceivablesXAF,
      doubtfulReceivablesXAF: kpis.doubtfulReceivablesXAF,
      dso: kpis.dso,

      // 4) Dettes
      accountsPayableXAF: kpis.accountsPayableXAF,
      overduePayablesXAF: kpis.overduePayablesXAF,
      dpo: kpis.dpo,

      // 5) Structure
      workingCapitalNeedXAF: kpis.workingCapitalNeedXAF,
      capexMonthXAF: kpis.capexMonthXAF,

      // 6) Paie
      payrollMassMonthXAF: kpis.payrollMassMonthXAF,
      payrollHeadcount: kpis.payrollHeadcount,
      payrollVsRevenuePercent: kpis.payrollVsRevenuePercent,

      // 7) Fiscal
      vatCollectedXAF: kpis.vatCollectedXAF,
      vatDeductibleXAF: kpis.vatDeductibleXAF,
      vatDueXAF: kpis.vatDueXAF,
      corporateTaxProvisionXAF: kpis.corporateTaxProvisionXAF,
    },
  });

  return NextResponse.json({
    ok: true,
    filledFields: kpis.filledFields,
    sources: kpis.sources,
  });
}
