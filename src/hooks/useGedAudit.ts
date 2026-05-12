"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface GedAuditResponse {
  kpis: {
    complianceScore: number;
    complianceTarget: number;
    pendingAccessRequests: number;
    activeAnomalies: number;
    ytdEvents: number;
  };
  alerts: Array<{
    id: string;
    severity: "high" | "medium" | "low";
    title: string;
    details: string;
    actorName: string;
    createdAt: string;
  }>;
  accessRequests: Array<{
    id: string;
    requester: string;
    requesterRole: string;
    documentName: string;
    documentRef: string | null;
    reason: string;
    requestedAt: string;
  }>;
  journal: Array<{
    id: string;
    createdAt: string;
    action: string;
    actorName: string;
    actorRole: string | null;
    documentName: string | null;
    documentRef: string | null;
    spaceName: string | null;
    ipAddress: string | null;
    anomaly: boolean;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export function useGedAudit(params: { action?: string; anomaly?: boolean; page?: number }) {
  const qs = new URLSearchParams();
  if (params.action) qs.set("action", params.action);
  if (params.anomaly) qs.set("anomaly", "1");
  if (params.page) qs.set("page", String(params.page));
  return useQuery({
    queryKey: ["ged", "audit", params],
    queryFn: async (): Promise<GedAuditResponse> => {
      const res = await fetch(`/api/ged/audit?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useDecideAccessRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "approve" | "deny"; reason?: string }) => {
      const res = await fetch(`/api/ged/audit/access-requests/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ged", "audit"] }),
  });
}

export interface AnomalyDetail {
  id: string;
  action: string;
  createdAt: string;
  resolvedAt: string | null;
  resolverName: string | null;
  resolutionNotes: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  actor: { id: string; name: string; role: string } | null;
  document: { id: string; name: string; internalReference: string | null } | null;
  space: { id: string; name: string; icon: string | null } | null;
}

export function useAnomalyDetail(id: string | null) {
  return useQuery<AnomalyDetail>({
    queryKey: ["ged", "anomaly-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/ged/audit/anomalies/${id}`, { credentials: "same-origin" });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export function useUpdateAnomaly(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { action: "INVESTIGATE" | "RESOLVE"; notes?: string }) => {
      const res = await fetch(`/api/ged/audit/anomalies/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ ok: true; resolved: boolean }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "audit"] });
      qc.invalidateQueries({ queryKey: ["ged", "anomaly-detail", id] });
    },
  });
}

export interface ComplianceReport {
  period: string;
  periodFrom: string;
  periodTo: string;
  overallScore: number;
  scoreComponents: {
    indexation: number;
    workflowSla: number;
    workflowCompletion: number;
    anomalyResolution: number;
  };
  indexation: {
    totalDocs: number;
    indexedDocs: number;
    rate: number;
    bySpace: Array<{ code: string; name: string; total: number; indexed: number; rate: number }>;
  };
  workflows: { total: number; completed: number; completionRate: number; slaRate: number };
  accessRequests: { total: number; approved: number; approvalRate: number; avgDecisionDays: number };
  anomalies: { total: number; resolved: number; resolutionRate: number };
  retention: { pendingDestruction: number; overdueDuaWithoutHold: number };
  spacesCount: number;
}

export function useComplianceReport(period: "YTD" | "month" | "year", enabled = false) {
  return useQuery<ComplianceReport>({
    queryKey: ["ged", "compliance-report", period],
    enabled,
    queryFn: async () => {
      const res = await fetch(`/api/ged/audit/compliance-report?period=${period}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export interface Iso9001Item {
  key: string;
  label: string;
  target: number;
  value: number;
  ok: boolean;
}

export interface Iso9001Response {
  readiness: number;
  targetIso9001: number;
  checklist: Iso9001Item[];
  nextAuditWindow: string;
}

export function useIso9001Readiness(enabled = false) {
  return useQuery<Iso9001Response>({
    queryKey: ["ged", "iso9001-readiness"],
    enabled,
    queryFn: async () => {
      const res = await fetch("/api/ged/audit/iso9001-readiness", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
