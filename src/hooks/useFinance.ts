"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommitmentStatus, CommitmentType } from "@prisma/client";

interface PnLResponse {
  period: string;
  compareMode: string;
  comparePeriod: string;
  current: unknown;
  comparison: unknown;
  ytd: unknown;
  locked: boolean;
}

interface BfrResponse {
  series: Array<{ period: string; dso: number; dpo: number; stockRotation: number; bfr: number; treasury: number }>;
  benchmark: { dso: number; dpo: number; stockRotation: number };
  latest: { period: string; dso: number; dpo: number; stockRotation: number; bfr: number; treasury: number } | null;
}

interface CommitmentItem {
  id: string;
  type: CommitmentType;
  reference: string | null;
  bank: string | null;
  beneficiary: string | null;
  amount: string;
  siteId: string | null;
  issueDate: string;
  maturityDate: string;
  status: CommitmentStatus;
  notes: string | null;
  createdAt: string;
}

interface BankItem {
  id: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: string;
  creditLineGranted: string;
  creditLineUsed: string;
  creditLineAvailable: string;
  renewalDate: string | null;
  contact: { name?: string; phone?: string; email?: string } | null;
  history12m: Array<{ month: string; balance: number }>;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePnL(period: string, compare: "YOY" | "BUDGET" = "YOY") {
  return useQuery({
    queryKey: ["finance", "pnl", period, compare],
    queryFn: () => getJson<PnLResponse>(`/api/finance/pnl?period=${period}&compare=${compare}`),
    enabled: Boolean(period),
  });
}

export function useBalance(period: string) {
  return useQuery({
    queryKey: ["finance", "balance", period],
    queryFn: () => getJson<{ period: string; balance: unknown; locked: boolean }>(`/api/finance/balance?period=${period}`),
    enabled: Boolean(period),
  });
}

export function useBfr() {
  return useQuery({
    queryKey: ["finance", "bfr"],
    queryFn: () => getJson<BfrResponse>(`/api/finance/bfr`),
  });
}

export function useCommitments() {
  return useQuery({
    queryKey: ["finance", "commitments"],
    queryFn: () =>
      getJson<{
        items: CommitmentItem[];
        summary: { total: number; active: number; expired: number; totalActiveAmount: string; equityProxy: string; ratioToEquity: number };
      }>(`/api/finance/commitments`),
  });
}

export function useCreateCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      reference?: string;
      bank?: string;
      beneficiary?: string;
      amount: string;
      siteId?: string | null;
      issueDate: string;
      maturityDate: string;
      notes?: string;
    }) =>
      getJson(`/api/finance/commitments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "commitments"] }),
  });
}

export function useBanks() {
  return useQuery({
    queryKey: ["finance", "banks"],
    queryFn: () =>
      getJson<{
        items: BankItem[];
        summary: { total: number; totalBalance: string; totalGranted: string; totalUsed: string; totalAvailable: string };
      }>(`/api/finance/banks`),
  });
}

export function useBank(id: string | null) {
  return useQuery({
    queryKey: ["finance", "bank", id],
    queryFn: () => getJson<BankItem>(`/api/finance/banks/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateBank(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/finance/banks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "banks"] });
      qc.invalidateQueries({ queryKey: ["finance", "bank", id] });
    },
  });
}
