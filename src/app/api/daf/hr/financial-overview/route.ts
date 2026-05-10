import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

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

  // Coût total chargé par catégorie (synthétique : 4 catégories)
  const lastCycle = cycles[0];
  const lastTotal = lastCycle ? Number(lastCycle.grossAmount) + Number(lastCycle.employerCharges) : 0;
  const byCategory = [
    { category: "Cadres", share: 0.32, headcount: 18 },
    { category: "Maîtrise", share: 0.26, headcount: 34 },
    { category: "Ouvriers qualifiés", share: 0.28, headcount: 96 },
    { category: "Manœuvres / journaliers", share: 0.14, headcount: 142 },
  ].map((c) => ({
    ...c,
    chargedCost: Math.round(lastTotal * c.share),
    avgPerEmployee: c.headcount === 0 ? 0 : Math.round((lastTotal * c.share) / c.headcount),
  }));

  // Coût horaire par catégorie (167h moyennes/mois)
  const hourlyCost = byCategory.map((c) => ({
    category: c.category,
    hourly: c.headcount === 0 ? 0 : Math.round(c.chargedCost / c.headcount / 167),
  }));

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
      pensionFund: 184_000_000,
      mutualFund: 47_500_000,
      total: 231_500_000,
    },
  });
}
