"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CurrentPayslipResponse {
  payslip: {
    id: string;
    period: string;
    periodLabel: string | null;
    paymentDate: string;
    paymentReference: string | null;
    paymentBankAccount: string | null;
    paymentMode: string;
    status: string;
    baseSalary: number;
    overtimeAmount: number;
    overtimeHours: number;
    seniorityBonus: number;
    transportAllowance: number;
    otherBonuses: unknown;
    grossAmount: number;
    cnpsAmount: number;
    irppAmount: number;
    otherDeductions: number;
    netAmount: number;
    workedDays: number;
    reportedHours: number;
  } | null;
}

export interface HistoryPayslip {
  id: string;
  period: string;
  periodLabel: string | null;
  paymentDate: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  overtimeHours: number;
}

export interface PayslipHistoryResponse {
  total: number;
  cumulNet: number;
  payslips: HistoryPayslip[];
}

export function useCurrentPayslip() {
  return useQuery<CurrentPayslipResponse>({
    queryKey: ["ouv", "payslips", "current"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/payslips/current", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture bulletin courant impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function usePayslipHistory(opts: { year?: number; limit?: number } = {}) {
  const query = new URLSearchParams();
  if (opts.year) query.set("year", String(opts.year));
  if (opts.limit) query.set("limit", String(opts.limit));
  const qs = query.toString();
  return useQuery<PayslipHistoryResponse>({
    queryKey: ["ouv", "payslips", "history", opts],
    queryFn: async () => {
      const res = await fetch(`/api/ouv/payslips/history${qs ? `?${qs}` : ""}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Lecture historique bulletins impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function useShareWhatsApp() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true; shareUrl: string; waUrl: string; expiresInHours: number },
    Error,
    { id: string; to?: string }
  >({
    mutationFn: async ({ id, to }) => {
      const res = await fetch(`/api/ouv/payslips/${id}/share-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Partage échoué");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "payslips"] });
    },
  });
}
