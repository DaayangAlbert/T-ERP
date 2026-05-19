"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DtravReportStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";

export interface DtravListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: DtravReportStatus;
  author: string;
  revenueProducedXAF: string;
  marginPercent: number;
  receivablesXAF: string;
  cdtCount: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DtravReportDetail {
  id: string;
  period: string;
  periodLabel: string | null;
  status: DtravReportStatus;
  revenueProducedXAF: string;
  revenueDeliveredXAF: string;
  marginPercent: number;
  sitesDelivered: number;
  receivablesXAF: string;
  overdueReceivablesXAF: string;
  dso: number;
  decompteIssuedCount: number;
  decompteIssuedXAF: string;
  amendmentsCount: number;
  penaltiesAppliedXAF: string;
  litigationsOpen: number;
  cdtCount: number;
  cdtReportsValidated: number;
  cdtUnderperforming: number;
  workforceTotal: number;
  workforceOvertimeHours: number;
  workforceCostXAF: string;
  executiveSummary: string | null;
  productionAnalysis: string | null;
  collectionsAnalysis: string | null;
  contractualSituation: string | null;
  cdtPerformance: string | null;
  workforceAnalysis: string | null;
  majorIssues: string | null;
  arbitragesRequested: string | null;
  nextMonthStrategy: string | null;
  author: { id: string; name: string; position: string | null };
  validatedBy: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDtravReports(filters: { status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["dtrav", "monthly-reports", filters],
    queryFn: () => getJson<{ items: DtravListItem[] }>(`/api/dtrav/monthly-reports?${sp.toString()}`),
  });
}

export function useDtravReport(id: string | null) {
  return useQuery({
    queryKey: ["dtrav", "monthly-report", id],
    enabled: !!id,
    queryFn: () => getJson<DtravReportDetail>(`/api/dtrav/monthly-reports/${id}`),
  });
}

export function useCreateDtravReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; periodLabel?: string }) =>
      getJson<{ id: string }>(`/api/dtrav/monthly-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dtrav", "monthly-reports"] }),
  });
}

export function useUpdateDtravReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/dtrav/monthly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["dtrav", "monthly-report", id] });
    },
  });
}

export function useDeleteDtravReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/dtrav/monthly-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dtrav", "monthly-reports"] }),
  });
}

export function useSubmitDtravReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/dtrav/monthly-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["dtrav", "monthly-report", id] });
    },
  });
}
