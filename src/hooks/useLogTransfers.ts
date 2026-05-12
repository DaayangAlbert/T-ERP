"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LogTransfersResponse {
  kpis: {
    pendingCount: number;
    validatedYtdCount: number;
    ytdSavings: number;
  };
  pending: Array<{
    id: string;
    reference: string;
    category: string;
    priority: string;
    status: string;
    estimatedSavings: number;
    context: string | null;
    fromSite: string;
    fromSiteCode: string;
    toSite: string;
    toSiteCode: string;
    items: Array<{ designation: string; quantity: number; unit: string }>;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    reference: string;
    category: string;
    status: string;
    estimatedSavings: number;
    fromSite: string;
    toSite: string;
    completedAt: string | null;
    arbitratedAt: string | null;
  }>;
}

export function useLogTransfers() {
  return useQuery({
    queryKey: ["log", "transfers"],
    queryFn: async (): Promise<LogTransfersResponse> => {
      const res = await fetch("/api/log/transfers", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useArbitrateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "approve" | "reject" | "schedule" | "complete"; note?: string }) => {
      const res = await fetch(`/api/log/transfers/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["log", "transfers"] }),
  });
}
