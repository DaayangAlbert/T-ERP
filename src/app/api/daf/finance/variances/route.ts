import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

const COST_CENTERS: Array<{ key: string; budget: number; actual: number }> = [
  { key: "Achats matières", budget: 580_000_000, actual: 620_000_000 },
  { key: "Sous-traitance", budget: 320_000_000, actual: 298_000_000 },
  { key: "Personnel direct", budget: 280_000_000, actual: 295_000_000 },
  { key: "Carburant et énergie", budget: 95_000_000, actual: 112_000_000 },
  { key: "Services extérieurs", budget: 78_000_000, actual: 71_000_000 },
  { key: "Frais généraux", budget: 65_000_000, actual: 68_500_000 },
  { key: "Frais financiers", budget: 32_000_000, actual: 38_700_000 },
];

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  let variances = await prisma.budgetVariance.findMany({
    where: { tenantId: session.tenantId, period },
    orderBy: { variance: "desc" },
  });

  // Auto-create deterministic snapshot if absent for the period
  if (variances.length === 0) {
    for (const cc of COST_CENTERS) {
      const variance = cc.actual - cc.budget;
      const variancePercent = cc.budget === 0 ? 0 : (variance / cc.budget) * 100;
      await prisma.budgetVariance.upsert({
        where: {
          tenantId_period_costCenter: {
            tenantId: session.tenantId,
            period,
            costCenter: cc.key,
          },
        },
        update: {},
        create: {
          tenantId: session.tenantId,
          period,
          costCenter: cc.key,
          budgetAmount: BigInt(cc.budget),
          actualAmount: BigInt(cc.actual),
          variance: BigInt(variance),
          variancePercent,
        },
      });
    }
    variances = await prisma.budgetVariance.findMany({
      where: { tenantId: session.tenantId, period },
      orderBy: { variance: "desc" },
    });
  }

  const totalBudget = variances.reduce((s, v) => s + v.budgetAmount, 0n);
  const totalActual = variances.reduce((s, v) => s + v.actualAmount, 0n);
  const totalVariance = totalActual - totalBudget;
  const totalVariancePercent = totalBudget === 0n ? 0 : (Number(totalVariance) / Number(totalBudget)) * 100;

  return NextResponse.json({
    period,
    items: variances.map((v) => ({
      id: v.id,
      costCenter: v.costCenter,
      budgetAmount: v.budgetAmount.toString(),
      actualAmount: v.actualAmount.toString(),
      variance: v.variance.toString(),
      variancePercent: v.variancePercent,
      comment: v.comment,
      commentAuthor: v.commentAuthor,
      commentAt: v.commentAt?.toISOString() ?? null,
    })),
    totals: {
      budget: totalBudget.toString(),
      actual: totalActual.toString(),
      variance: totalVariance.toString(),
      variancePercent: totalVariancePercent,
    },
  });
}
