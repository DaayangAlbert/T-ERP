"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteStatus, SiteType } from "@prisma/client";

export interface DashboardKpi {
  value: number;
  trend: number;
  trendUnit: "%" | "pts" | "";
  trendLabel: string;
  sparkline: number[];
}

export interface DashboardKpis {
  revenue: DashboardKpi;
  margin: DashboardKpi;
  treasury: DashboardKpi;
  headcount: DashboardKpi;
}

export interface RevenueChartPoint {
  month: string;
  revenue: number;
  margin: number;
}

export interface SiteTypeSlice {
  type: SiteType;
  label: string;
  color: string;
  value: number;
  percentage: number;
}

export type AlertSeverity = "danger" | "warning" | "info";

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  link: string;
}

export interface DashboardValidation {
  id: string;
  ref: string;
  type: string;
  amount: number;
  deadline: string;
}

export interface TopSiteRow {
  id: string;
  code: string;
  name: string;
  client: string;
  progress: number;
  margin: number;
  budget: number;
  status: SiteStatus;
}

// === Phase 2 / fn 1.1 : sections enrichies ===
export interface SecondaryKpi {
  value: number;
  label: string;
  hint: string;
}

export interface SecondaryKpis {
  backlog: SecondaryKpi;
  productionForecast: SecondaryKpi;
  hseDaysWithoutAccident: SecondaryKpi;
  customerSatisfaction: SecondaryKpi;
}

export interface DailyKeyStat {
  value: number;
  label: string;
  total?: number;
}

export interface DailyKeyStats {
  caJour: DailyKeyStat;
  encaissements: DailyKeyStat;
  decaissements: DailyKeyStat;
  effectifPresent: DailyKeyStat;
  chantiersActifs: DailyKeyStat;
  notifsNonLues: DailyKeyStat;
}

export interface WeeklyTrendPoint {
  day: string;
  date: string;
  production: number;
}

export interface DashboardDgPayload {
  kpis: DashboardKpis;
  kpisSecondaires: SecondaryKpis;
  chiffresCles: DailyKeyStats;
  tendanceHebdo: WeeklyTrendPoint[];
  revenueChart: RevenueChartPoint[];
  siteTypeBreakdown: SiteTypeSlice[];
  alerts: DashboardAlert[];
  pendingValidations: DashboardValidation[];
  topSites: TopSiteRow[];
  meta: {
    generatedAt: string;
    sitesTotal: number;
    activeSitesTotal: number;
  };
}

async function fetchDashboardDg(): Promise<DashboardDgPayload> {
  const res = await fetch("/api/dashboard/dg");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDashboardDg() {
  return useQuery({
    queryKey: ["dashboard-dg"],
    queryFn: fetchDashboardDg,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
