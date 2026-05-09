import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import type { PnLData } from "@/schemas/finance";

export const dynamic = "force-dynamic";

// V1 : si la période demandée n'a pas de FinancialPeriod en base, on
// génère un snapshot synthétique cohérent. La saisie manuelle / import
// CGI viendra en V2.
async function getOrSynthesize(tenantId: string, period: string) {
  const existing = await prisma.financialPeriod.findFirst({
    where: { tenantId, period },
  });
  if (existing) return existing;
  return null;
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const compare = url.searchParams.get("compare") ?? "YOY"; // YOY | BUDGET

  const current = await getOrSynthesize(session.tenantId, period);
  if (!current) {
    return NextResponse.json({ error: "Aucune donnée pour cette période — relancer le seed." }, { status: 404 });
  }

  // Période de comparaison
  let comparePeriod = period;
  if (compare === "YOY") {
    const [y, m] = period.split("-");
    comparePeriod = `${parseInt(y, 10) - 1}-${m}`;
  } else if (compare === "BUDGET") {
    comparePeriod = `${period.split("-")[0]}-BUDGET`;
  }
  const comp = await getOrSynthesize(session.tenantId, comparePeriod);

  // YTD : agréger toutes les périodes de l'année jusqu'à period
  const year = period.split("-")[0];
  const ytdPeriods = await prisma.financialPeriod.findMany({
    where: {
      tenantId: session.tenantId,
      period: { gte: `${year}-01`, lte: period, not: { contains: "BUDGET" } },
    },
  });
  const ytd = ytdPeriods.reduce<PnLData>(
    (acc, p) => {
      const pnl = p.pnl as unknown as PnLData;
      return {
        products: {
          revenue: acc.products.revenue + pnl.products.revenue,
          otherProducts: acc.products.otherProducts + pnl.products.otherProducts,
        },
        expenses: {
          purchases: acc.expenses.purchases + pnl.expenses.purchases,
          personnel: acc.expenses.personnel + pnl.expenses.personnel,
          subcontracting: acc.expenses.subcontracting + pnl.expenses.subcontracting,
          depreciation: acc.expenses.depreciation + pnl.expenses.depreciation,
          other: acc.expenses.other + pnl.expenses.other,
        },
        operatingResult: acc.operatingResult + pnl.operatingResult,
        financialResult: acc.financialResult + pnl.financialResult,
        exceptionalResult: acc.exceptionalResult + pnl.exceptionalResult,
        netResult: acc.netResult + pnl.netResult,
      };
    },
    {
      products: { revenue: 0, otherProducts: 0 },
      expenses: { purchases: 0, personnel: 0, subcontracting: 0, depreciation: 0, other: 0 },
      operatingResult: 0,
      financialResult: 0,
      exceptionalResult: 0,
      netResult: 0,
    }
  );

  return NextResponse.json({
    period,
    compareMode: compare,
    comparePeriod,
    current: current.pnl,
    comparison: comp?.pnl ?? null,
    ytd,
    locked: current.locked,
  });
}
