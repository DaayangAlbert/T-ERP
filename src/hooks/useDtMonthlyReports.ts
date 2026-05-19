"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DtReportStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";

export interface DtReportListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: DtReportStatus;
  author: string; // route liste renvoie une string concaténée
  sitesCount: number;
  avgPhysicalProgress: number;
  portfolioMarginPercent: number;
  hseTotalIncidents: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DtReportAuthor {
  id: string;
  name: string;
  position: string | null;
}

export interface DtSiteSnapshot {
  id?: string;
  siteId: string;
  site?: { id: string; code: string; name: string; client: string; region: string | null };
  physicalProgressPercent: number;
  financialProgressPercent: number;
  marginPercent: number;
  revenueMonthXAF: string;
  hseIncidentsCount: number;
  ncOpenCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  notes: string | null;
}

export interface DtReportDetail extends Omit<DtReportListItem, "author"> {
  author: DtReportAuthor; // route détail renvoie un objet
  sitesActiveCount: number;
  sitesCompletedCount: number;
  sitesAtRiskCount: number;
  avgFinancialProgress: number;
  totalRevenueXAF: string;
  totalSpentXAF: string;
  hseTf1: number;
  hseAuditsConducted: number;
  hseNcOpen: number;
  subcontractorsActive: number;
  subcontractorsAtRisk: number;
  executiveSummary: string | null;
  financialAnalysis: string | null;
  qhseAnalysis: string | null;
  subcontractingAnalysis: string | null;
  majorRisks: string | null;
  technicalDecisions: string | null;
  recommendations: string | null;
  nextMonthOutlook: string | null;
  sites: DtSiteSnapshot[];
}

export interface PortfolioSite {
  id: string;
  code: string;
  name: string;
  client: string;
  region: string | null;
  status: string;
  budget: string;
  progress: number;
  physicalProgress: number;
  financialProgress: number;
  margin: number;
  suggestedHseIncidents: number;
  suggestedNcOpen: number;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDtMonthlyReports(filters: { status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["dt", "monthly-reports", filters],
    queryFn: () => getJson<{ items: DtReportListItem[] }>(`/api/dt/monthly-reports?${sp.toString()}`),
  });
}

export function useDtMonthlyReport(id: string | null) {
  return useQuery({
    queryKey: ["dt", "monthly-report", id],
    enabled: !!id,
    queryFn: () => getJson<DtReportDetail>(`/api/dt/monthly-reports/${id}`),
  });
}

export function usePortfolioSites() {
  return useQuery({
    queryKey: ["dt", "portfolio-sites"],
    queryFn: () => getJson<{ items: PortfolioSite[] }>(`/api/dt/portfolio-sites`),
  });
}

export function useCreateDtReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; periodLabel?: string }) =>
      getJson<{ id: string }>(`/api/dt/monthly-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "monthly-reports"] }),
  });
}

export function useUpdateDtReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/dt/monthly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dt", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["dt", "monthly-report", id] });
    },
  });
}

export function useDeleteDtReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/dt/monthly-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "monthly-reports"] }),
  });
}

export function useSubmitDtReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/dt/monthly-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dt", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["dt", "monthly-report", id] });
    },
  });
}

export interface DtAutoFillResult {
  ok: true;
  filledFields: string[];
  sources: { tenantIds: string[]; sites: number; billings: number; incidents: number };
}

export function useAutoFillDtReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      getJson<DtAutoFillResult>(`/api/dt/monthly-reports/${id}/auto-fill`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dt", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["dt", "monthly-report", id] });
    },
  });
}
