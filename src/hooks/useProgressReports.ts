"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ReportListItem {
  id: string;
  siteId: string;
  site: { id: string; code: string; name: string };
  reportType: "WEEKLY" | "MONTHLY" | "AD_HOC";
  period: string;
  periodLabel: string | null;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";
  physicalProgressPercent: number;
  previousProgressPercent: number | null;
  valueProducedXAF: string;
  valueProducedCumulXAF: string;
  avgWorkforce: number;
  hseIncidentsCount: number;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  pdfUrl: string | null;
  author: string;
  validatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportDetail extends ReportListItem {
  mainAchievements: string | null;
  delaysIdentified: string | null;
  photos: string[];
  maxWorkforce: number;
  overtimeHoursTotal: number;
  billingStatus: string | null;
  daysWithoutAccident: number;
  issuesEncountered: string | null;
  supportNeeded: string | null;
  attachmentDocumentIds: string[];
  attachments: Array<{ id: string; title: string; category: string; fileUrl: string; fileName: string }>;
  nextPeriodPriorities: string | null;
}

export interface ReportListResponse {
  items: ReportListItem[];
  summary: { total: number; drafts: number; submitted: number; validated: number; rejected: number };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useProgressReports(filters: { siteId?: string; status?: string; reportType?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.siteId) sp.set("siteId", filters.siteId);
  if (filters.status) sp.set("status", filters.status);
  if (filters.reportType) sp.set("reportType", filters.reportType);
  return useQuery({
    queryKey: ["cc", "progress-reports", filters],
    queryFn: () => getJson<ReportListResponse>(`/api/cc/progress-reports?${sp.toString()}`),
  });
}

export function useProgressReport(id: string | null) {
  return useQuery({
    queryKey: ["cc", "progress-reports", "detail", id],
    queryFn: () => getJson<ReportDetail>(`/api/cc/progress-reports/${id}`),
    enabled: !!id,
  });
}

export function useCreateProgressReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      siteId: string;
      reportType: "WEEKLY" | "MONTHLY" | "AD_HOC";
      period: string;
      periodLabel?: string | null;
      physicalProgressPercent: number;
      previousProgressPercent?: number | null;
    }) =>
      getJson<{ id: string }>(`/api/cc/progress-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "progress-reports"] }),
  });
}

export function useUpdateProgressReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/cc/progress-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc", "progress-reports"] });
      qc.invalidateQueries({ queryKey: ["cc", "progress-reports", "detail", id] });
    },
  });
}

export function useSubmitProgressReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      getJson(`/api/cc/progress-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc", "progress-reports"] });
      qc.invalidateQueries({ queryKey: ["cc", "progress-reports", "detail", id] });
    },
  });
}

export function useDeleteProgressReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/cc/progress-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "progress-reports"] }),
  });
}
