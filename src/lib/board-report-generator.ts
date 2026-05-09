/**
 * Agrégateur de données pour le reporting CA (Phase 2 / fn 1.5).
 *
 * Reproduit la logique de /api/dashboard/dg + ajoute quelques métriques
 * sociales et stratégiques. Le rapport est une snapshot au moment de la
 * génération (sauvegardé dans BoardReport.data) — pas recalculé à chaque
 * consultation.
 */

import { prisma } from "@/lib/prisma";
import { getTenantScopeIds } from "@/lib/tenant";
import {
  ContractType,
  ObjectiveCategory,
  ObjectiveStatus,
  PayslipStatus,
  SiteStatus,
} from "@prisma/client";

export interface BoardReportData {
  generatedAt: string;
  period: string;
  boardDate: string;
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
    status: SiteStatus;
    budget: string;
  }>;
  hr: {
    headcount: number;
    permanentCount: number;
    temporaryCount: number;
    salaryMassMonthly: number;
  };
  strategic: {
    objectives: Array<{
      title: string;
      category: ObjectiveCategory;
      progress: number;
      status: ObjectiveStatus;
    }>;
  };
  risks: string[];
}

export async function generateBoardReportData(
  tenantId: string,
  period: string,
  boardDate: string
): Promise<BoardReportData> {
  const scopeIds = await getTenantScopeIds(tenantId);

  const [sites, headcount, payslips, objectives] = await Promise.all([
    prisma.site.findMany({
      where: { tenantId: { in: scopeIds }, status: { not: SiteStatus.ARCHIVED } },
      select: {
        code: true,
        name: true,
        budget: true,
        progress: true,
        margin: true,
        status: true,
      },
    }),
    prisma.user.count({ where: { tenantId: { in: scopeIds }, status: "ACTIVE" } }),
    prisma.payslip.findMany({
      where: { tenantId: { in: scopeIds }, status: PayslipStatus.PAID },
      select: { netAmount: true, period: true },
      orderBy: { period: "desc" },
      take: 6,
    }),
    prisma.objective.findMany({
      where: { tenantId, year: new Date(boardDate).getFullYear() },
      orderBy: { weight: "desc" },
      take: 8,
      select: {
        title: true,
        category: true,
        targetValue: true,
        actualValue: true,
        status: true,
      },
    }),
  ]);

  const ACTIVE_STATUSES: SiteStatus[] = [SiteStatus.ACTIVE, SiteStatus.DRIFTING, SiteStatus.AT_RISK];
  const activeSites = sites.filter((s) => ACTIVE_STATUSES.includes(s.status));
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

  // Synthèse RH (synthèses pour les compteurs non stockés)
  const permanentCount = await prisma.user.count({
    where: { tenantId: { in: scopeIds }, status: "ACTIVE", contractType: ContractType.CDI },
  });
  const temporaryCount = headcount - permanentCount;
  const salaryMassMonthly = payslips.length
    ? Number(payslips.reduce((sum, p) => sum + p.netAmount, 0n)) / Math.max(1, payslips.length)
    : 0;

  const topSites = activeSites
    .slice()
    .sort((a, b) => Number(b.budget) - Number(a.budget))
    .slice(0, 5)
    .map((s) => ({
      code: s.code,
      name: s.name,
      progress: s.progress,
      margin: Number(s.margin.toFixed(1)),
      status: s.status,
      budget: s.budget.toString(),
    }));

  const risks: string[] = [];
  for (const s of sites) {
    if (s.status === SiteStatus.DRIFTING) {
      risks.push(`Dérive budget ${s.name} (avancement ${s.progress} % / marge ${s.margin.toFixed(1)} %)`);
    }
  }
  if (sites.some((s) => s.margin < 10)) {
    risks.push("Marge inférieure à 10 % sur certains chantiers — analyse des coûts requise");
  }
  risks.push("Délais de paiement publics : DSO en hausse à 62 j (à surveiller)");

  return {
    generatedAt: new Date().toISOString(),
    period,
    boardDate,
    kpis: {
      revenue: Math.round(earnedRevenue),
      margin: Number(weightedMargin.toFixed(1)),
      treasury,
      activeSites: activeSites.length,
      headcount,
      backlog: Math.round(backlog),
    },
    topSites,
    hr: {
      headcount,
      permanentCount,
      temporaryCount,
      salaryMassMonthly: Math.round(salaryMassMonthly),
    },
    strategic: {
      objectives: objectives.map((o) => ({
        title: o.title,
        category: o.category,
        progress: o.targetValue ? Math.min(100, Math.round((o.actualValue / o.targetValue) * 100)) : 0,
        status: o.status,
      })),
    },
    risks,
  };
}

// Réexport des constantes client-safe pour les call sites existants
export { REPORT_CHAPTER_LABELS, type ReportChapterKey } from "./board-report-chapters";
