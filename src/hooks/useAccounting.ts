"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PeriodStatus, ClosureStatus } from "@prisma/client";

interface LedgerMovement {
  id: string;
  account: string;
  label: string;
  reference: string;
  date: string;
  journal: string;
  entryLabel: string;
  debit: string;
  credit: string;
  balance: string;
}

interface BalanceRow {
  account: string;
  label: string;
  debit: string;
  credit: string;
  balance: string;
  anomaly: string | null;
}

interface PeriodItem {
  id: string;
  period: string;
  status: PeriodStatus;
  closedAt: string | null;
  closedBy: string | null;
  totalEntries: number;
  totalDebit: string;
  totalCredit: string;
  balanced: boolean;
}

interface ClosureItem {
  id: string;
  fiscalYear: number;
  status: ClosureStatus;
  pnlValidated: boolean;
  balanceValidated: boolean;
  adjustmentsValidated: boolean;
  draftGenerated: boolean;
  adjustments: unknown;
  dgValidatedAt: string | null;
  dgValidatedBy: string | null;
  submittedToDgi: boolean;
  dsfFileUrl: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useGeneralLedger(account: string | null, period?: string) {
  return useQuery({
    queryKey: ["accounting", "ledger", account, period],
    queryFn: () =>
      getJson<{
        account: string;
        movements: LedgerMovement[];
        summary: { totalDebit: string; totalCredit: string; finalBalance: string; count: number };
      }>(`/api/accounting/general-ledger/${account}${period ? `?period=${period}` : ""}`),
    enabled: Boolean(account),
  });
}

export function useBalance(level: "class" | "account", period?: string) {
  return useQuery({
    queryKey: ["accounting", "balance", level, period],
    queryFn: () =>
      getJson<{
        level: string;
        rows: BalanceRow[];
        summary: { totalDebit: string; totalCredit: string; balanced: boolean; anomalies: number };
      }>(`/api/accounting/balance?level=${level}${period ? `&period=${period}` : ""}`),
  });
}

export function usePeriods() {
  return useQuery({
    queryKey: ["accounting", "periods"],
    queryFn: () => getJson<{ items: PeriodItem[] }>(`/api/accounting/periods`),
  });
}

export function useClosePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: string) =>
      getJson(`/api/accounting/periods/${period}/close`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting", "periods"] }),
  });
}

export function useClosure(year: number) {
  return useQuery({
    queryKey: ["accounting", "closure", year],
    queryFn: () => getJson<ClosureItem>(`/api/accounting/closures/${year}`),
  });
}

export function useValidateClosureStep(year: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (step: "pnl" | "balance" | "adjustments" | "draft" | "validate" | "submit") =>
      getJson(`/api/accounting/closures/${year}/validate-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting", "closure", year] }),
  });
}
