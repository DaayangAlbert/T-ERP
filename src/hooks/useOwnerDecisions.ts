"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface OwnerDecision {
  id: string;
  reference: string;
  title: string;
  description: string | null;
  type: string;
  amount: string | null;
  priority: string;
  currentStep: string | null;
  initiator: string;
  demandeur?: string;
  dueDate: string | null;
  createdAt: string;
}

export interface OwnerDecisionHistory {
  id: string;
  reference: string;
  title: string;
  type: string;
  amount: string | null;
  decision: "APPROVED" | "REJECTED";
  motif: string | null;
  decidedAt: string | null;
  initiator: string;
}

export function useOwnerDecisionsHistory() {
  return useQuery({
    queryKey: ["owner", "decisions", "history"],
    queryFn: async () => {
      const res = await fetch("/api/owner/decisions/history", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ resume: { total: number; approuves: number; rejetes: number }; items: OwnerDecisionHistory[] }>;
    },
  });
}

export function useOwnerDecisions() {
  return useQuery({
    queryKey: ["owner", "decisions"],
    queryFn: async () => {
      const res = await fetch("/api/owner/decisions", { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ items: OwnerDecision[]; count: number }>;
    },
  });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: "APPROVE" | "REJECT"; reason?: string }) =>
      fetch(`/api/owner/decisions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ decision, reason }),
      }).then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner", "decisions"] });
      qc.invalidateQueries({ queryKey: ["owner", "cockpit"] });
    },
  });
}
