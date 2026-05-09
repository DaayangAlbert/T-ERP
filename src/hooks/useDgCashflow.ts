"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CashFlowType } from "@prisma/client";

export interface WeeklyRow {
  weekIndex: number;
  isoWeek: number;
  isoYear: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  clientPayments: number;
  otherIncome: number;
  totalIncome: number;
  suppliers: number;
  salaries: number;
  taxes: number;
  totalExpense: number;
  closingBalance: number;
  level: "ok" | "warning" | "critical";
}

export interface MajorDueDate {
  id: string;
  type: CashFlowType;
  category: string;
  label: string;
  amount: string;
  expectedDate: string;
  probability: number;
  sourceType: string | null;
}

export interface CashflowResponse {
  weeks: WeeklyRow[];
  summary: {
    initialBalance: number;
    totalIncome: number;
    totalExpense: number;
    finalBalance: number;
    criticalWeeksCount: number;
  };
  thresholds: { critical: number; comfort: number };
  majorDueDates: MajorDueDate[];
  horizon: { startDate: string; endDate: string; weeks: number };
  projectionsCount: number;
}

export function useDgCashflow(weeks = 12) {
  return useQuery({
    queryKey: ["dg-cashflow", weeks],
    queryFn: async (): Promise<CashflowResponse> => {
      const res = await fetch(`/api/dg/cashflow?weeks=${weeks}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useAddManualForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/dg/cashflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-cashflow"] }),
  });
}

export function useUpdateForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/dg/cashflow/${input.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-cashflow"] }),
  });
}

export function useDeleteForecast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dg/cashflow/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-cashflow"] }),
  });
}
