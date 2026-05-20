"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BankSyncStatus, MovementDirection } from "@prisma/client";

export interface BankAccountItem {
  id: string;
  bank: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: string;
  creditLineGranted: string;
  creditLineUsed: string;
  creditLineAvailable: string;
  lastSyncAt: string | null;
  syncStatus: BankSyncStatus;
  primaryColor: string;
  contact: { name?: string; phone?: string; email?: string } | null;
}

interface MovementItem {
  id: string;
  direction: MovementDirection;
  amount: string;
  label: string;
  counterparty: string | null;
  bank: string;
  occurredAt: string;
}

interface TreasuryResponse {
  items: BankAccountItem[];
  summary: {
    totalBalance: string;
    totalGranted: string;
    totalUsed: string;
    totalAvailable: string;
    consolidatedPosition: string;
  };
  dailyKpis: {
    receipts: string;
    payments: string;
    projectedJ7: string;
    dueTomorrow: string;
  };
  evolution7d: Array<{ date: string; value: number }>;
  latestMovements: MovementItem[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafTreasury() {
  return useQuery({
    queryKey: ["daf", "treasury"],
    queryFn: () => getJson<TreasuryResponse>(`/api/daf/banks`),
  });
}

export function useSyncBanks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson<{ ok: true; syncedCount: number; note: string }>(`/api/daf/banks/sync`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "treasury"] }),
  });
}

// ─── Comptes bancaires : création / édition / clôture ──────────────────────

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export interface BankFormInput {
  bank: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: string;
  creditLineGranted: string;
  contact?: { name?: string; phone?: string; email?: string };
}

export function useCreateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BankFormInput) =>
      getJson<{ id: string }>(`/api/finance/banks`, jsonBody("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "treasury"] }),
  });
}

export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<BankFormInput> & { id: string; isActive?: boolean }) =>
      getJson<{ ok: true }>(`/api/finance/banks/${id}`, jsonBody("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "treasury"] }),
  });
}

// ─── Caisses chantier : liste / création / édition / clôture / approvisionnement ─

export interface CashboxItem {
  id: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  balance: string;
  custodianId: string;
  custodianName: string | null;
  isActive: boolean;
  closedAt: string | null;
}

interface CashboxesResponse {
  items: CashboxItem[];
  summary: { total: number; activeTotal: string };
}

export function useCashboxes() {
  return useQuery({
    queryKey: ["finance", "cashboxes"],
    queryFn: () => getJson<CashboxesResponse>(`/api/finance/cashboxes`),
  });
}

export function useCreateCashbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { siteId: string; custodianId?: string; initialBalance: string }) =>
      getJson<{ id: string }>(`/api/finance/cashboxes`, jsonBody("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "cashboxes"] }),
  });
}

export function useUpdateCashbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; custodianId?: string; isActive?: boolean }) =>
      getJson<{ ok: true }>(`/api/finance/cashboxes/${id}`, jsonBody("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance", "cashboxes"] }),
  });
}

export function useFundCashbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      bankAccountId: string;
      amount: string;
      reason?: string;
      reference?: string;
    }) => getJson<{ ok: true }>(`/api/finance/cashboxes/${id}/fund`, jsonBody("POST", data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance", "cashboxes"] });
      qc.invalidateQueries({ queryKey: ["daf", "treasury"] });
    },
  });
}
