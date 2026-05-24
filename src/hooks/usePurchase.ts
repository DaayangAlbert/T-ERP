"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ContractStatus, PoStatus } from "@prisma/client";

interface PendingPo {
  id: string;
  reference: string;
  label: string;
  amount: string;
  category: string;
  supplier: string;
  supplierCategory: string;
  dafApprovedAt: string | null;
  createdAt: string;
  ageDays: number;
}

interface SupplierItem {
  id: string;
  name: string;
  category: string;
  paymentTerms: number;
  ratingQuality: number | null;
  ratingDelay: number | null;
  ratingPrice: number | null;
  strategic: boolean;
  blocked: boolean;
  blockReason: string | null;
  volumeYTD: string;
  poCount: number;
}

interface SupplierDetail extends SupplierItem {
  taxId: string | null;
  rccm: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  history: Array<{ id: string; reference: string; label: string; amount: string; status: PoStatus; createdAt: string }>;
  evaluations: Array<{ id: string; period: string; ratingQuality: number; ratingDelay: number; ratingPrice: number; comments: string | null; createdAt: string }>;
  activeContracts: Array<{ id: string; reference: string; subject: string; maxAmount: string; usedAmount: string; endDate: string }>;
}

interface ContractItem {
  id: string;
  reference: string;
  subject: string;
  maxAmount: string;
  usedAmount: string;
  remaining: string;
  usagePct: number;
  startDate: string;
  endDate: string;
  conditions: unknown;
  status: ContractStatus;
  supplier: { name: string; category: string };
}

interface AnalyticsResponse {
  series: Array<{ period: string; amount: number }>;
  byCategory: Array<{ category: string; volume: string }>;
  top10: Array<{ name: string; category: string; volume: number }>;
  materials: Array<{ name: string; currentPrice: number; variation12m: number }>;
  summary: { totalSuppliers: number; totalVolumeYTD: string };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePendingPos() {
  return useQuery({
    queryKey: ["purchase", "pending-dg"],
    queryFn: () =>
      getJson<{ items: PendingPo[]; summary: { total: number; totalAmount: string; averageAgeDays: number } }>(
        `/api/purchase/orders/pending-dg`
      ),
  });
}

export interface PurchaseOrderItem {
  id: string;
  reference: string;
  label: string;
  supplier: string;
  category: string;
  chantier: string | null;
  amount: string;
  status: PoStatus;
  createdAt: string;
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ["purchase", "orders"],
    queryFn: () => getJson<{ items: PurchaseOrderItem[]; canManage: boolean }>(`/api/purchase/orders`),
  });
}

export interface PoLineInput {
  designation: string;
  quantity: number;
  unitPrice: string;
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { supplierId: string; category: string; lines: PoLineInput[]; siteId?: string | null }) =>
      getJson<{ id: string; reference: string; status: PoStatus }>(`/api/purchase/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purchase", "orders"] });
      qc.invalidateQueries({ queryKey: ["purchase", "pending-dg"] });
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; taxId?: string; rccm?: string; phone?: string; email?: string; city?: string; address?: string; strategic?: boolean }) =>
      getJson<{ id: string }>(`/api/purchase/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase", "suppliers"] }),
  });
}

export function useApprovePo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      getJson(`/api/purchase/orders/${id}/dg-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase", "pending-dg"] }),
  });
}

export function useRejectPo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      getJson(`/api/purchase/orders/${id}/dg-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase", "pending-dg"] }),
  });
}

export function useSuppliers(filters: { strategic?: boolean; q?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.strategic) sp.set("strategic", "true");
  if (filters.q) sp.set("q", filters.q);
  return useQuery({
    queryKey: ["purchase", "suppliers", filters],
    queryFn: () =>
      getJson<{
        items: SupplierItem[];
        summary: { total: number; strategic: number; blocked: number; totalVolumeYTD: string };
      }>(`/api/purchase/suppliers?${sp.toString()}`),
  });
}

export function useSupplier(id: string | null) {
  return useQuery({
    queryKey: ["purchase", "supplier", id],
    queryFn: () => getJson<SupplierDetail>(`/api/purchase/suppliers/${id}`),
    enabled: Boolean(id),
  });
}

export function useEvaluateSupplier(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; ratingQuality: number; ratingDelay: number; ratingPrice: number; comments?: string }) =>
      getJson(`/api/purchase/suppliers/${id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase", "supplier", id] }),
  });
}

export function useFrameworkContracts() {
  return useQuery({
    queryKey: ["purchase", "contracts"],
    queryFn: () => getJson<{ items: ContractItem[] }>(`/api/purchase/framework-contracts`),
  });
}

export function usePurchaseAnalytics() {
  return useQuery({
    queryKey: ["purchase", "analytics"],
    queryFn: () => getJson<AnalyticsResponse>(`/api/purchase/analytics`),
  });
}
