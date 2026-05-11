"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface DtCircuitItem {
  id: string;
  reference: string;
  type: string;
  title: string;
  amount: number | null;
  initiator: string | null;
  currentStep: string | null;
  currentApprover: string | null;
  currentApproverRole: string | null;
  stuckDays: number;
  createdAt: string;
}

export function useDtCircuit() {
  return useQuery({
    queryKey: ["dt", "validations", "circuit"],
    queryFn: async (): Promise<{ items: DtCircuitItem[] }> => {
      const res = await fetch("/api/dt/validations/circuit", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export interface DtDelegation {
  id: string;
  toUser: string;
  toUserRole: string;
  types: string[];
  maxAmount: number | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  reason: string | null;
}

export function useDtDelegations() {
  return useQuery({
    queryKey: ["dt", "validations", "delegations"],
    queryFn: async (): Promise<{ items: DtDelegation[] }> => {
      const res = await fetch("/api/dt/validations/delegations", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      toUserId: string;
      startDate: string;
      endDate: string;
      reason: string;
      maxAmount?: number;
    }) => {
      const res = await fetch("/api/dt/validations/delegations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "validations", "delegations"] }),
  });
}

export function useRevokeDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dt/validations/delegations/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dt", "validations", "delegations"] }),
  });
}
