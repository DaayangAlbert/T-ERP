"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type WeeklyReportStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";

export interface WeeklyReportListItem {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string | null;
  status: WeeklyReportStatus;
  author: string;
  sitesCount: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface SiteSnapshot {
  id?: string;
  siteId: string;
  site?: {
    id: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    physicalProgress?: number;
    financialProgress?: number;
  };
  physicalProgressPercent: number;
  financialProgressPercent: number;
  valueProducedXAF: string;
  avgWorkforce: number;
  hseIncidentsCount: number;
  milestonesAchieved: string | null;
  milestonesAtRisk: string | null;
  notes: string | null;
}

export interface WeeklyReportDetail {
  id: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string | null;
  status: WeeklyReportStatus;
  workingDays: number;
  weatherDays: number;
  subcontractorsPresent: number;
  globalSummary: string | null;
  keyAchievements: string | null;
  transverseIssues: string | null;
  scheduleSlippages: string | null;
  arbitrationsNeeded: string | null;
  nextWeekPlan: string | null;
  sites: SiteSnapshot[];
  author: { id: string; name: string; position: string | null };
  validatedBy: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AvailableSite {
  id: string;
  code: string;
  name: string;
  client: string;
  region: string | null;
  progress: number;
  physicalProgress: number;
  financialProgress: number;
  manager: string | null;
  suggestedAvgWorkforce: number;
  suggestedHseIncidents: number;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useWeeklyReports(filters: { status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["cdt", "weekly-reports", filters],
    queryFn: () => getJson<{ items: WeeklyReportListItem[] }>(`/api/cdt/weekly-reports?${sp.toString()}`),
  });
}

export function useWeeklyReport(id: string | null) {
  return useQuery({
    queryKey: ["cdt", "weekly-report", id],
    enabled: !!id,
    queryFn: () => getJson<WeeklyReportDetail>(`/api/cdt/weekly-reports/${id}`),
  });
}

export function useAvailableSites() {
  return useQuery({
    queryKey: ["cdt", "available-sites"],
    queryFn: () => getJson<{ items: AvailableSite[] }>(`/api/cdt/available-sites`),
  });
}

export function useCreateWeeklyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { weekStart: string; weekEnd: string; weekLabel?: string }) =>
      getJson<{ id: string }>(`/api/cdt/weekly-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "weekly-reports"] }),
  });
}

export function useUpdateWeeklyReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/cdt/weekly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cdt", "weekly-reports"] });
      qc.invalidateQueries({ queryKey: ["cdt", "weekly-report", id] });
    },
  });
}

export function useDeleteWeeklyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/cdt/weekly-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "weekly-reports"] }),
  });
}

export function useSubmitWeeklyReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/cdt/weekly-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cdt", "weekly-reports"] });
      qc.invalidateQueries({ queryKey: ["cdt", "weekly-report", id] });
    },
  });
}
