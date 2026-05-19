import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, CptEntryStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

/**
 * Cost centers DAF — budget mensuel paramétré, actual calculé en temps réel
 * depuis les écritures comptables validées sur les comptes SYSCOHADA mappés.
 */
const COST_CENTERS: Array<{ key: string; monthlyBudget: number; prefixes: string[] }> = [
  { key: "Achats matières", monthlyBudget: 580_000_000, prefixes: ["60"] },
  { key: "Sous-traitance", monthlyBudget: 320_000_000, prefixes: ["611"] },
  { key: "Personnel direct", monthlyBudget: 280_000_000, prefixes: ["641", "645"] },
  { key: "Carburant et énergie", monthlyBudget: 95_000_000, prefixes: ["605", "624"] },
  { key: "Services extérieurs", monthlyBudget: 78_000_000, prefixes: ["612", "613", "614", "615", "616", "618"] },
  { key: "Frais généraux", monthlyBudget: 65_000_000, prefixes: ["62", "63"] },
  { key: "Frais financiers", monthlyBudget: 32_000_000, prefixes: ["66"] },
];

function periodRange(period: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(period)) return null;
  const [yy, mm] = period.split("-").map(Number);
  return { start: new Date(yy, mm - 1, 1), end: new Date(yy, mm, 1) };
}

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") ?? new Date().toISOString().slice(0, 7);
  const range = periodRange(period);
  if (!range) return NextResponse.json({ error: "Période invalide" }, { status: 400 });

  // Toutes les lignes de charges (6xx) validées sur la période
  const lines = await prisma.entryLine.findMany({
    where: {
      accountCode: { startsWith: "6" },
      entry: {
        tenantId: session.tenantId,
        status: CptEntryStatus.VALIDATED,
        entryDate: { gte: range.start, lt: range.end },
      },
    },
    select: { accountCode: true, debit: true, credit: true },
  });

  // Calcul actual par cost center
  const computed = COST_CENTERS.map((cc) => {
    const matched = lines.filter((l) => cc.prefixes.some((p) => l.accountCode.startsWith(p)));
    const actual = matched.reduce((s, l) => s + l.debit - l.credit, 0n);
    const budget = BigInt(cc.monthlyBudget);
    const variance = actual - budget;
    const variancePercent = budget === 0n ? 0 : (Number(variance) / Number(budget)) * 100;
    return {
      costCenter: cc.key,
      budgetAmount: budget,
      actualAmount: actual,
      variance,
      variancePercent,
    };
  });

  // Upsert pour conserver l'id stable + les commentaires DAF déjà saisis
  const persisted = [];
  for (const c of computed) {
    const row = await prisma.budgetVariance.upsert({
      where: {
        tenantId_period_costCenter: {
          tenantId: session.tenantId,
          period,
          costCenter: c.costCenter,
        },
      },
      update: {
        budgetAmount: c.budgetAmount,
        actualAmount: c.actualAmount,
        variance: c.variance,
        variancePercent: c.variancePercent,
      },
      create: {
        tenantId: session.tenantId,
        period,
        costCenter: c.costCenter,
        budgetAmount: c.budgetAmount,
        actualAmount: c.actualAmount,
        variance: c.variance,
        variancePercent: c.variancePercent,
      },
    });
    persisted.push(row);
  }

  const variances = persisted.sort((a, b) => Number(b.variance) - Number(a.variance));

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
