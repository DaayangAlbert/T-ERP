"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReportType, ReportStatus } from "@prisma/client";

interface ListReport {
  id: string;
  type: ReportType;
  title: string;
  period: string;
  status: ReportStatus;
  author: string;
  pdfUrl: string | null;
  scheduledRule: string | null;
  recipientCount: number;
  generatedAt: string | null;
  createdAt: string;
}

interface ScheduledReport {
  id: string;
  type: ReportType;
  title: string;
  rule: string | null;
  author: string;
  blocks: unknown;
  recipients: Array<{ email: string; name?: string }>;
  createdAt: string;
}

interface ReportDetail {
  id: string;
  type: ReportType;
  title: string;
  period: string;
  status: ReportStatus;
  parameters: { scope?: string; signature?: string };
  blocks: string[];
  data: unknown;
  pdfUrl: string | null;
  scheduledRule: string | null;
  recipients: Array<{ email: string; name?: string; sentAt?: string }>;
  author: { name: string; email: string };
  generatedAt: string | null;
  createdAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useReports(filters: { type?: string; status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.type) sp.set("type", filters.type);
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["reports", filters],
    queryFn: () => fetchJson<{ items: ListReport[]; total: number }>(`/api/reports?${sp.toString()}`),
  });
}

export function useReportDetail(id: string) {
  return useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchJson<ReportDetail>(`/api/reports/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: string;
      title: string;
      period: string;
      scope: string;
      blocks: string[];
      signature?: string;
    }) =>
      fetchJson<{ id: string }>(`/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useSendReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recipients,
      message,
    }: {
      id: string;
      recipients: Array<{ email: string; name?: string }>;
      message?: string;
    }) =>
      fetchJson<{ ok: true; sent: number; note: string }>(`/api/reports/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients, message }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report", vars.id] });
    },
  });
}

export function useRegenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/reports/${id}/regenerate`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report", id] });
    },
  });
}

export function useScheduledReports() {
  return useQuery({
    queryKey: ["reports", "scheduled"],
    queryFn: () => fetchJson<{ items: ScheduledReport[] }>(`/api/reports/scheduled`),
  });
}

export function useCreateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: string;
      title: string;
      rule: string;
      blocks: string[];
      recipients: Array<{ email: string; name?: string }>;
    }) =>
      fetchJson<{ id: string }>(`/api/reports/scheduled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports", "scheduled"] }),
  });
}
