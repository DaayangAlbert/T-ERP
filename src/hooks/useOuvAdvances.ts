"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface AdvanceItem {
  id: string;
  amountXAF: number;
  maxAllowedXAF: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "PAID" | "RECOVERED" | "REJECTED" | "CANCELLED";
  validatedAt: string | null;
  validatorName: string | null;
  validatorRole: string | null;
  payoutAt: string | null;
  payoutMethod: string | null;
  rejectionReason: string | null;
  recoveryMonth: string | null;
  recoveredAt: string | null;
  createdAt: string;
}

export interface AdvancesResponse {
  advances: AdvanceItem[];
  quota: {
    baseSalaryXAF: number;
    maxAllowedXAF: number;
    lastPayslipPeriodLabel: string | null;
    hasOpenAdvance: boolean;
  };
}

export interface AdvanceCreateResult {
  id: string;
  amountXAF: number;
  status: string;
  validatorRole: "AUTO" | "HR" | "DAF" | "DG";
  autoApproved: boolean;
  message: string;
}

export function useAdvances() {
  return useQuery<AdvancesResponse>({
    queryKey: ["ouv", "advances"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/advances", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture avances impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useRequestAdvance() {
  const qc = useQueryClient();
  return useMutation<
    AdvanceCreateResult,
    Error,
    { amountXAF: number; reason: string; payoutMethod?: "BANK_TRANSFER" | "MOBILE_MONEY" | "CASH" }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Demande refusée");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "advances"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export function useCancelAdvance() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/ouv/advances/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Annulation refusée");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "advances"] }),
  });
}
