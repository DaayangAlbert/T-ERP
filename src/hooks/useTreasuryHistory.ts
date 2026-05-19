"use client";

import { useQuery } from "@tanstack/react-query";
import type { Role } from "@prisma/client";

export interface TreasuryHistoryItem {
  id: string;
  source: "ENTRY" | "CASHBOX";
  sourceLabel: string;
  direction: "IN" | "OUT";
  amount: string;
  label: string;
  reference: string | null;
  counterparty: string | null;
  siteId: string | null;
  siteCode: string | null;
  occurredAt: string;
}

export interface TreasuryHistoryResponse {
  items: TreasuryHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: {
    totalIn: string;
    totalOut: string;
    net: string;
    countEntry: number;
    countCashbox: number;
  };
  scope: {
    role: Role;
    restrictedToSites: boolean;
    isDirection: boolean;
  };
}

export interface TreasuryHistoryFilters {
  from?: string;
  to?: string;
  direction?: "IN" | "OUT";
  source?: "ENTRY" | "CASHBOX";
  siteId?: string;
  q?: string;
  page?: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTreasuryHistory(filters: TreasuryHistoryFilters = {}) {
  const sp = new URLSearchParams();
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.direction) sp.set("direction", filters.direction);
  if (filters.source) sp.set("source", filters.source);
  if (filters.siteId) sp.set("siteId", filters.siteId);
  if (filters.q) sp.set("q", filters.q);
  if (filters.page) sp.set("page", String(filters.page));
  const qs = sp.toString();
  return useQuery({
    queryKey: ["treasury", "history", filters],
    queryFn: () =>
      fetchJson<TreasuryHistoryResponse>(`/api/treasury/history${qs ? `?${qs}` : ""}`),
    // Refresh quand une autre tab fait bouger l'argent (paiement de facture,
    // enregistrement caisse, etc.)
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
