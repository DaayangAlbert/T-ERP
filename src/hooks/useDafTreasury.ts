"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BankSyncStatus, MovementDirection } from "@prisma/client";

interface BankAccountItem {
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
