import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ProvisionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const [cycles, sites] = await Promise.all([
    prisma.payrollCycle.findMany({
      where: { tenantId: { in: scopeIds } },
      orderBy: { period: "desc" },
      take: 12,
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { in: ["ACTIVE", "AT_RISK", "DRIFTING"] } },
      select: { budget: true, progress: true },
    }),
  ]);

  // CA YTD synthétique = somme(budget * progress%) sur tous les chantiers actifs
  const earnedRevenue = sites.reduce((s, x) => s + Math.round(Number(x.budget) * (x.progress / 100) * 0.85), 0);
  // Annualiser sur le mois courant (mois index +1)
  const monthIndex = new Date().getMonth() + 1;
  const monthlyRevenue = monthIndex === 0 ? 0 : Math.round(earnedRevenue / monthIndex);

  // Trend 12 mois
  const trend = cycles
    .slice()
    .reverse()
    .map((c) => {
      const totalCharged = Number(c.grossAmount) + Number(c.employerCharges);
      const ratio = monthlyRevenue === 0 ? 0 : (totalCharged / monthlyRevenue) * 100;
      return {
        period: c.period,
        massCharged: totalCharged,
        ratio: Math.min(ratio, 100),
      };
    });

  // Coût total chargé par catégorie — vraie répartition depuis les payslips
  // du dernier cycle, groupés par User.category.
  const lastCycle = cycles[0];
  const lastTotal = lastCycle ? Number(lastCycle.grossAmount) + Number(lastCycle.employerCharges) : 0;

  let byCategory: Array<{
    category: string;
    headcount: number;
    chargedCost: number;
    avgPerEmployee: number;
    share: number;
  }> = [];

  if (lastCycle) {
    const payslips = await prisma.payslip.findMany({
      where: { payrollCycleId: lastCycle.id, tenantId: { in: scopeIds } },
      select: {
        grossAmount: true,
        employerCharges: true,
        user: { select: { category: true } },
      },
    });

    const grouped = new Map<string, { headcount: number; cost: number }>();
    for (const p of payslips) {
      const cat = p.user.category ?? "Non catégorisé";
      const cur = grouped.get(cat) ?? { headcount: 0, cost: 0 };
      cur.headcount += 1;
      cur.cost += Number(p.grossAmount) + Number(p.employerCharges);
      grouped.set(cat, cur);
    }

    byCategory = Array.from(grouped.entries())
      .map(([category, agg]) => ({
        category,
        headcount: agg.headcount,
        chargedCost: agg.cost,
        avgPerEmployee: agg.headcount === 0 ? 0 : Math.round(agg.cost / agg.headcount),
        share: lastTotal === 0 ? 0 : agg.cost / lastTotal,
      }))
      .sort((a, b) => b.chargedCost - a.chargedCost);
  }

  // Coût horaire par catégorie (167 h moyennes/mois)
  const hourlyCost = byCategory.map((c) => ({
    category: c.category,
    hourly: c.headcount === 0 ? 0 : Math.round(c.chargedCost / c.headcount / 167),
  }));

  // Engagements long terme — réels depuis SocialProvision (IFC + mutuelle)
  const provisions = await prisma.socialProvision.findMany({
    where: {
      tenantId: session.tenantId,
      type: { in: [ProvisionType.END_OF_CAREER, ProvisionType.MUTUAL] },
    },
    select: { type: true, amount: true },
  });
  const pensionFund = provisions
    .filter((p) => p.type === ProvisionType.END_OF_CAREER)
    .reduce((s, p) => s + Number(p.amount), 0);
  const mutualFund = provisions
    .filter((p) => p.type === ProvisionType.MUTUAL)
    .reduce((s, p) => s + Number(p.amount), 0);

  return NextResponse.json({
    currentMonth: {
      payrollMass: lastTotal,
      monthlyRevenue,
      ratioPercent: monthlyRevenue === 0 ? 0 : (lastTotal / monthlyRevenue) * 100,
    },
    trend,
    byCategory,
    hourlyCost,
    longTermCommitments: {
      pensionFund,
      mutualFund,
      total: pensionFund + mutualFund,
    },
  });
}
