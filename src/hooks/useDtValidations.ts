"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface DtValidationItem {
  id: string;
  type: string;
  reference: string;
  title: string;
  amount: number | null;
  priority: string;
  createdAt: string;
  initiator: string | null;
  ageHours: number;
  workflow: { steps: Array<{ key: string; label: string; status: string }> };
}

export interface DtValidationsResponse {
  items: DtValidationItem[];
  kpis: {
    pendingCount: number;
    pendingAmount: number;
    avgDelayHours: number;
    monthValidatedCount: number;
  };
}

export function useDtValidationsPending() {
  return useQuery({
    queryKey: ["dt", "validations", "pending"],
    queryFn: async (): Promise<DtValidationsResponse> => {
      const res = await fetch("/api/dt/validations/pending", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useDtValidationApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const res = await fetch(`/api/dt/validations/${id}/approve`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "validations"] }),
  });
}

export function useDtValidationReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/dt/validations/${id}/reject`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "validations"] }),
  });
}

export function useDtValidationsBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/dt/validations/bulk-approve", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "validations"] }),
  });
}
