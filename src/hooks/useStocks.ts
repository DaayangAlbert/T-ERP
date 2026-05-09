"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssetCategory, MovementType, InventoryStatus, LossType } from "@prisma/client";

interface AssetItem {
  id: string;
  code: string;
  description: string;
  category: AssetCategory;
  acquisitionDate: string;
  grossValue: string;
  accumulatedDepreciation: string;
  netValue: string;
  usefulLifeMonths: number;
  siteId: string | null;
  condition: string;
  insurance: { company?: string; policyRef?: string; expiresAt?: string; coveredAmount?: string } | null;
  lastRevaluedAt: string | null;
}

interface RenewalItem {
  id: string;
  code: string;
  description: string;
  category: AssetCategory;
  remainingMonths: number;
  netValue: string;
}

interface MovementItem {
  id: string;
  type: MovementType;
  itemCode: string;
  itemLabel: string;
  quantity: number;
  unitValue: string;
  totalValue: string;
  fromSiteId: string | null;
  toSiteId: string | null;
  reason: string | null;
  initiator: string;
  anomalous: boolean;
  anomalyReason: string | null;
  createdAt: string;
}

interface InventoryItem {
  id: string;
  siteId: string | null;
  period: string;
  itemsCount: number;
  gapsCount: number;
  gapsValue: string;
  status: InventoryStatus;
  dgValidated: boolean;
  startDate: string;
  endDate: string | null;
}

interface LossItem {
  id: string;
  type: LossType;
  itemDescription: string;
  value: string;
  siteId: string | null;
  occurredAt: string;
  declaredToInsurance: boolean;
  declaredAt: string | null;
  indemnification: string | null;
  correctiveActions: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useFixedAssets() {
  return useQuery({
    queryKey: ["stocks", "assets"],
    queryFn: () =>
      getJson<{
        items: AssetItem[];
        summary: { total: number; totalGross: string; totalNetValue: string };
        byCategory: Array<{ category: string; count: number; netValue: string }>;
        renewalPlan: RenewalItem[];
      }>(`/api/stocks/fixed-assets`),
  });
}

export function useMovements(filters: { type?: string; anomalous?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (filters.type) sp.set("type", filters.type);
  if (filters.anomalous) sp.set("anomalous", "true");
  return useQuery({
    queryKey: ["stocks", "movements", filters],
    queryFn: () =>
      getJson<{ items: MovementItem[]; summary: { total: number; anomalousCount: number } }>(
        `/api/stocks/movements?${sp.toString()}`
      ),
  });
}

export function useInventories() {
  return useQuery({
    queryKey: ["stocks", "inventories"],
    queryFn: () => getJson<{ items: InventoryItem[] }>(`/api/stocks/inventories`),
  });
}

export function useCreateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { siteId?: string | null; period: string; startDate: string }) =>
      getJson(`/api/stocks/inventories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks", "inventories"] }),
  });
}

export function useValidateInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/stocks/inventories/${id}/validate-dg`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks", "inventories"] }),
  });
}

export function useLosses() {
  return useQuery({
    queryKey: ["stocks", "losses"],
    queryFn: () =>
      getJson<{
        items: LossItem[];
        summary: { total: number; totalValue: string; totalIndemnification: string; netLoss: string };
      }>(`/api/stocks/losses`),
  });
}

export function useCreateLoss() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      type: string;
      itemDescription: string;
      value: string;
      siteId?: string | null;
      occurredAt: string;
      declaredToInsurance: boolean;
      indemnification?: string | null;
      correctiveActions?: string;
    }) =>
      getJson(`/api/stocks/losses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stocks", "losses"] }),
  });
}
