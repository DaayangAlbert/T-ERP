/**
 * Agrégateur pour les rapports stratégiques (Phase 2 / Bloc 2 — fn 2.2).
 *
 * Calcule un snapshot des données au moment de la génération du rapport,
 * en se basant sur les blocs sélectionnés. Réutilise la logique du board
 * report generator pour rester cohérent.
 */

import { prisma } from "@/lib/prisma";
import { getTenantScopeIds } from "@/lib/tenant";
import { SiteStatus } from "@prisma/client";

export interface ReportSnapshot {
  generatedAt: string;
  period: string;
  scope: "GROUP" | "TENANT" | "SITES";
  kpis: {
    revenue: number;
    margin: number;
    treasury: number;
    activeSites: number;
    headcount: number;
    backlog: number;
  };
  topSites: Array<{
    code: string;
    name: string;
    progress: number;
    margin: number;
    budget: string;
  }>;
  subsidiaries: Array<{
    name: string;
    revenue: number;
    margin: number;
    sites: number;
  }>;
}

export async function generateReportSnapshot(
  tenantId: string,
  period: string,
  scope: ReportSnapshot["scope"] = "GROUP"
): Promise<ReportSnapshot> {
  const scopeIds = scope === "TENANT" ? [tenantId] : await getTenantScopeIds(tenantId);

  const [sites, headcount, subTenants] = await Promise.all([
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
      select: { code: true, name: true, budget: true, progress: true, margin: true, status: true, tenantId: true },
    }),
    prisma.user.count({ where: { tenantId: { in: scopeIds }, status: "ACTIVE" } }),
    prisma.tenant.findMany({
      where: { id: { in: scopeIds } },
      select: { id: true, name: true },
    }),
  ]);

  const ACTIVE: SiteStatus[] = [SiteStatus.ACTIVE, SiteStatus.DRIFTING, SiteStatus.AT_RISK];
  const activeSites = sites.filter((s) => ACTIVE.includes(s.status));
  const totalBudget = sites.reduce((sum, s) => sum + Number(s.budget), 0);
  const earnedRevenue = sites.reduce((sum, s) => sum + (Number(s.budget) * s.progress) / 100, 0);
  const weightedMargin = totalBudget
    ? sites.reduce((sum, s) => sum + s.margin * Number(s.budget), 0) / totalBudget
    : 0;
  const treasury = Math.round(earnedRevenue * 0.18);
  const backlog = sites.reduce((sum, s) => {
    if (s.status === SiteStatus.COMPLETED) return sum;
    return sum + Math.max(0, Number(s.budget) * (1 - s.progress / 100));
  }, 0);

  const topSites = activeSites
    .slice()
    .sort((a, b) => Number(b.budget) - Number(a.budget))
    .slice(0, 5)
    .map((s) => ({
      code: s.code,
      name: s.name,
      progress: s.progress,
      margin: Number(s.margin.toFixed(1)),
      budget: s.budget.toString(),
    }));

  // Synthèse par filiale
  const subsidiaries = subTenants.map((t) => {
    const tSites = sites.filter((s) => s.tenantId === t.id);
    const tBudget = tSites.reduce((sum, s) => sum + Number(s.budget), 0);
    const tEarned = tSites.reduce((sum, s) => sum + (Number(s.budget) * s.progress) / 100, 0);
    const tMargin = tBudget
      ? tSites.reduce((sum, s) => sum + s.margin * Number(s.budget), 0) / tBudget
      : 0;
    return {
      name: t.name,
      revenue: Math.round(tEarned),
      margin: Number(tMargin.toFixed(1)),
      sites: tSites.length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    period,
    scope,
    kpis: {
      revenue: Math.round(earnedRevenue),
      margin: Number(weightedMargin.toFixed(1)),
      treasury,
      activeSites: activeSites.length,
      headcount,
      backlog: Math.round(backlog),
    },
    topSites,
    subsidiaries,
  };
}
