import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.LOGISTICS, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Logisticien" }, { status: 403 });
  }

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);

  const [purchaseOrders, sites] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        tenantId: { in: scopeIds },
        createdAt: { gte: new Date(year - 1, 0, 1) },
        status: { not: "REJECTED" },
      },
      select: { amount: true, category: true, siteId: true, createdAt: true, status: true },
    }),
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds } },
      select: { id: true, code: true, name: true, budget: true },
    }),
  ]);

  const ytdPos = purchaseOrders.filter((p) => p.createdAt >= yearStart);
  const totalYtd = ytdPos.reduce((s, p) => s + Number(p.amount), 0);

  // Évolution mensuelle (6 derniers mois)
  const monthlyEvolution: Array<{ month: string; value: number; projected: boolean }> = [];
  const currentMonth = now.getMonth();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(year, currentMonth - i, 1);
    const monthEnd = new Date(year, currentMonth - i + 1, 0, 23, 59, 59);
    const monthPos = purchaseOrders.filter(
      (p) => p.createdAt >= month && p.createdAt <= monthEnd
    );
    const value = monthPos.reduce((s, p) => s + Number(p.amount), 0);
    // Mois courant = projection (extrapolé sur jours passés)
    const isCurrent = i === 0;
    const projected = isCurrent;
    let finalValue = value;
    if (isCurrent && now.getDate() > 0) {
      const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
      finalValue = Math.round((value / now.getDate()) * daysInMonth);
    }
    monthlyEvolution.push({
      month: month.toLocaleDateString("fr-FR", { month: "short" }),
      value: finalValue,
      projected,
    });
  }

  // Par chantier
  const bySite = new Map<string, number>();
  for (const p of ytdPos) {
    if (!p.siteId) continue;
    bySite.set(p.siteId, (bySite.get(p.siteId) ?? 0) + Number(p.amount));
  }
  const bySiteArr = Array.from(bySite.entries())
    .map(([siteId, value]) => {
      const site = sites.find((s) => s.id === siteId);
      if (!site) return null;
      const budgetEstimated = Number(site.budget) * 0.25; // 25 % du budget chantier = achats estimés
      return {
        code: site.code,
        name: site.name,
        purchases: value,
        budget: Math.round(budgetEstimated),
        gap: value - budgetEstimated,
        gapPercent: budgetEstimated > 0 ? ((value - budgetEstimated) / budgetEstimated) * 100 : 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.purchases - a.purchases)
    .slice(0, 7);

  // Par catégorie (déjà calculé pour le dashboard mais on remet ici)
  const byCategory = new Map<string, number>();
  for (const p of ytdPos) {
    byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + Number(p.amount));
  }
  const byCategoryArr = Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val], i) => ({
      category: cat,
      value: val,
      pct: totalYtd > 0 ? (val / totalYtd) * 100 : 0,
      color: ["#A855F7", "#3B82F6", "#F97316", "#10B981", "#EAB308", "#EF4444", "#06B6D4"][i % 7],
    }));

  return NextResponse.json({
    kpis: {
      totalYtd,
      savings: 62_000_000,
      savingsPercent: 6.5,
      avgPaymentDays: 42,
      paymentTarget: 45,
      onTimeDeliveryRate: 88,
    },
    monthlyEvolution,
    bySite: bySiteArr,
    byCategory: byCategoryArr,
  });
}
