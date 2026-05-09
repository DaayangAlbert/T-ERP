"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReconciliationStatus, ClosingStatus } from "@prisma/client";

interface DashboardKpis {
  todayEntries: number;
  draftToValidate: number;
  banksTotal: number;
  banksReconciled: number;
  daysToClose: number;
  checklistProgress: { done: number; total: number };
}

interface EntryItem {
  id: string;
  reference: string;
  journal: string;
  label: string;
  totalDebit: string;
  totalCredit: string;
  enteredBy: string;
  hoursSinceEntry: number;
  date: string;
  linesCount: number;
}

interface ReconciliationItem {
  bankAccountId: string;
  bank: string;
  accountNumber: string;
  primaryColor: string | null;
  bookBalance: string;
  bankBalance: string;
  gap: string;
  status: ReconciliationStatus;
  completedAt: string | null;
  reconciliationId: string | null;
}

interface ChecklistItem {
  key: string;
  label: string;
  status: "PENDING" | "DONE" | "BLOCKED";
}

interface MonthlyClosing {
  id: string;
  period: string;
  items: ChecklistItem[];
  status: ClosingStatus;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafAccountingDashboard() {
  return useQuery({
    queryKey: ["daf", "accounting", "dashboard"],
    queryFn: () => getJson<{ period: string; kpis: DashboardKpis }>(`/api/daf/accounting/dashboard`),
  });
}

export function useEntriesToValidate() {
  return useQuery({
    queryKey: ["daf", "accounting", "entries-to-validate"],
    queryFn: () => getJson<{ items: EntryItem[] }>(`/api/daf/accounting/entries-to-validate`),
  });
}

export function useValidateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/accounting/entries/${id}/validate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}

export function useRejectEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      getJson(`/api/daf/accounting/entries/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}

export function useBankReconciliations(period?: string) {
  const sp = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["daf", "accounting", "reconciliations", period],
    queryFn: () => getJson<{ period: string; items: ReconciliationItem[] }>(`/api/daf/accounting/bank-reconciliations${sp}`),
  });
}

export function useMonthlyClosing(period: string) {
  return useQuery({
    queryKey: ["daf", "accounting", "closing", period],
    queryFn: () => getJson<MonthlyClosing>(`/api/daf/accounting/monthly-closing/${period}`),
    enabled: Boolean(period),
  });
}

export function useCloseMonth(period: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/daf/accounting/monthly-closing/${period}/close`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}
