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
