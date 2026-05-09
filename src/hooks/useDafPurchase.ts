"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PoN2Item {
  id: string;
  reference: string;
  label: string;
  amount: string;
  category: string;
  supplier: string;
  supplierCategory: string;
  initiator: string;
  justification: string;
  budgetRemainingPercent: number;
  marketPriceCheck: "OK" | "ABOVE";
  createdAt: string;
  ageDays: number;
}

export interface PoN2Summary {
  total: number;
  totalAmount: string;
  criticalCount: number;
}

export interface SupplierFinancialItem {
  id: string;
  name: string;
  category: string;
  strategic: boolean;
  volumeYTD: string;
  sharePercent: number;
  poCount: number;
  paymentTermsContract: number;
  paymentTermsActual: number;
  paymentDelayDelta: number;
  financialRating: string | null;
  financialRatingSource: string | null;
  incidentsCount: number;
  outstanding: string;
}

export interface CommitmentItem {
  id: string;
  supplier: string;
  supplierCategory: string;
  poRef: string;
  amount: string;
  deliveredAmount: string;
  invoicedAmount: string;
  remaining: string;
  expectedDeliveryDate: string | null;
  status: string;
}

export interface ProvisionItem {
  id: string;
  supplier: string;
  category: string;
  poRef: string;
  delivered: string;
  invoiced: string;
  provisionAmount: string;
  odReference: string;
}

export interface SupplierPaymentHistory {
  supplier: {
    id: string;
    name: string;
    category: string;
    paymentTermsContract: number;
    paymentTermsActual: number;
    financialRating: string | null;
    financialRatingSource: string | null;
    incidentsCount: number;
  };
  months: Array<{ month: string; avgDelay: number; invoicesPaid: number; latePayments: number }>;
  incidents: Array<{ date: string; type: string; amount: string; resolved: boolean }>;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePoN2Pending() {
  return useQuery({
    queryKey: ["daf", "purchase", "n2-pending"],
    queryFn: () => getJson<{ items: PoN2Item[]; summary: PoN2Summary }>(`/api/daf/purchase/n2-pending`),
  });
}

export function useN2Decision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "APPROVE" | "REJECT" | "REQUEST_INFO"; note?: string }) =>
      getJson(`/api/daf/purchase/n2-validate/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "purchase"] }),
  });
}

export function useSuppliersFinancial() {
  return useQuery({
    queryKey: ["daf", "purchase", "suppliers-financial"],
    queryFn: () =>
      getJson<{
        items: SupplierFinancialItem[];
        summary: { total: number; totalVolume: string; withIncidents: number; avgPaymentDelta: number };
      }>(`/api/daf/purchase/suppliers-financial`),
  });
}

export function useSupplierPaymentHistory(id: string | null) {
  return useQuery({
    queryKey: ["daf", "purchase", "supplier-history", id],
    queryFn: () => getJson<SupplierPaymentHistory>(`/api/daf/purchase/suppliers/${id}/payment-history`),
    enabled: Boolean(id),
  });
}

export function useCommitments() {
  return useQuery({
    queryKey: ["daf", "purchase", "commitments"],
    queryFn: () =>
      getJson<{
        items: CommitmentItem[];
        summary: { count: number; total: string; delivered: string; invoiced: string; remaining: string; due30d: string };
      }>(`/api/daf/purchase/commitments`),
  });
}

export function useProvisions() {
  return useQuery({
    queryKey: ["daf", "purchase", "provisions"],
    queryFn: () =>
      getJson<{ items: ProvisionItem[]; summary: { count: number; totalProvision: string } }>(
        `/api/daf/purchase/provisions-to-book`
      ),
  });
}
