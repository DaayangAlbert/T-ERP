"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type QhseReportStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";

export interface QhseListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: QhseReportStatus;
  author: string;
  totalIncidents: number;
  lostTimeIncidents: number;
  tf1: number;
  tg: number;
  daysWithoutAccident: number;
  ncOpened: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
}

export interface QhseReportDetail {
  id: string;
  period: string;
  periodLabel: string | null;
  status: QhseReportStatus;
  totalHoursWorked: string;
  totalIncidents: number;
  lostTimeIncidents: number;
  noLostTimeIncidents: number;
  daysLost: number;
  tf1: number;
  tg: number;
  daysWithoutAccident: number;
  cutsCount: number;
  fallsCount: number;
  electricalCount: number;
  chemicalCount: number;
  vehiclesCount: number;
  otherCount: number;
  internalAudits: number;
  externalAudits: number;
  inspectionsCount: number;
  observationsCount: number;
  ncOpened: number;
  ncClosed: number;
  ncCritical: number;
  ncOverdue: number;
  safetyTrainings: number;
  trainingHours: number;
  personsTrained: number;
  epiDistributed: number;
  epiCheckCompliance: number;
  executiveSummary: string | null;
  incidentsAnalysis: string | null;
  auditFindings: string | null;
  ncAnalysis: string | null;
  trainingsAnalysis: string | null;
  epiAnalysis: string | null;
  actionPlans: string | null;
  trendsAnalysis: string | null;
  chsctRecommendations: string | null;
  author: { id: string; name: string; position: string | null };
  validatedBy: string | null;
  submittedAt: string | null;
  validatedAt: string | null;
  rejectionReason: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useQhseReports(filters: { status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["qhse", "monthly-reports", filters],
    queryFn: () => getJson<{ items: QhseListItem[] }>(`/api/qhse/monthly-reports?${sp.toString()}`),
  });
}

export function useQhseReport(id: string | null) {
  return useQuery({
    queryKey: ["qhse", "monthly-report", id],
    enabled: !!id,
    queryFn: () => getJson<QhseReportDetail>(`/api/qhse/monthly-reports/${id}`),
  });
}

export function useCreateQhseReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; periodLabel?: string }) =>
      getJson<{ id: string }>(`/api/qhse/monthly-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qhse", "monthly-reports"] }),
  });
}

export function useUpdateQhseReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/qhse/monthly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qhse", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["qhse", "monthly-report", id] });
    },
  });
}

export function useDeleteQhseReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/qhse/monthly-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qhse", "monthly-reports"] }),
  });
}

export function useSubmitQhseReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/qhse/monthly-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qhse", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["qhse", "monthly-report", id] });
    },
  });
}
