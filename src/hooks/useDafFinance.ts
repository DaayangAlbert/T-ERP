"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface VarianceItem {
  id: string;
  costCenter: string;
  budgetAmount: string;
  actualAmount: string;
  variance: string;
  variancePercent: number;
  comment: string | null;
  commentAuthor: string | null;
  commentAt: string | null;
}

export interface VarianceTotals {
  budget: string;
  actual: string;
  variance: string;
  variancePercent: number;
}

export interface ProfitabilityRow {
  siteId: string;
  code: string;
  name: string;
  client: string;
  region: string | null;
  status: string;
  progress: number;
  budget: string;
  revenueYtd: string;
  directCosts: string;
  indirectCosts: string;
  grossMargin: string;
  marginPercent: number;
}

export interface ProfitabilitySummary {
  totalSites: number;
  inDanger: number;
  inWarn: number;
  inOk: number;
  weightedMargin: number;
}

export interface SiteBreakdown {
  site: {
    id: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    status: string;
    progress: number;
    type: string;
    budget: string;
  };
  revenueYtd: string;
  totalCost: string;
  grossMargin: string;
  marginPercent: number;
  breakdown: Array<{ key: string; label: string; amount: string; share: number }>;
}

export interface ScenarioParameters {
  cementPriceVar?: number;
  ironPriceVar?: number;
  fuelPriceVar?: number;
  salaryVar?: number;
  delayDays?: number;
}

export interface ScenarioResults {
  plImpact: string;
  bfrImpact: string;
  treasuryImpact: string;
  breakdown: Array<{ key: string; label: string; impact: string }>;
}

export interface ScenarioItem {
  id: string;
  name: string;
  description: string | null;
  parameters: ScenarioParameters;
  results: ScenarioResults;
  createdAt: string;
  authorId: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafVariances(period: string) {
  return useQuery({
    queryKey: ["daf", "finance", "variances", period],
    queryFn: () =>
      getJson<{ period: string; items: VarianceItem[]; totals: VarianceTotals }>(
        `/api/daf/finance/variances?period=${period}`
      ),
    enabled: Boolean(period),
  });
}

export function useCommentVariance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      getJson(`/api/daf/finance/variances/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "finance", "variances"] }),
  });
}

export function useSiteProfitability(sortBy: "margin" | "revenue" | "code" = "margin", order: "asc" | "desc" = "asc") {
  return useQuery({
    queryKey: ["daf", "finance", "site-profitability", sortBy, order],
    queryFn: () =>
      getJson<{ items: ProfitabilityRow[]; summary: ProfitabilitySummary }>(
        `/api/daf/finance/site-profitability?sortBy=${sortBy}&order=${order}`
      ),
  });
}

export function useSiteBreakdown(siteId: string | null) {
  return useQuery({
    queryKey: ["daf", "finance", "site-profitability", "detail", siteId],
    queryFn: () => getJson<SiteBreakdown>(`/api/daf/finance/site-profitability/${siteId}`),
    enabled: Boolean(siteId),
  });
}

export function useScenarios() {
  return useQuery({
    queryKey: ["daf", "finance", "scenarios"],
    queryFn: () => getJson<{ items: ScenarioItem[] }>(`/api/daf/finance/scenarios`),
  });
}

export function usePreviewScenario() {
  return useMutation({
    mutationFn: (parameters: ScenarioParameters) =>
      getJson<{ preview: true; results: ScenarioResults; parameters: ScenarioParameters }>(
        `/api/daf/finance/scenarios`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ save: false, parameters }),
        }
      ),
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; parameters: ScenarioParameters }) =>
      getJson<ScenarioItem>(`/api/daf/finance/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, save: true }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "finance", "scenarios"] }),
  });
}
