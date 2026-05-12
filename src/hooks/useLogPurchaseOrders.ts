"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LogPO {
  id: string;
  reference: string;
  label: string;
  category: string;
  amount: number;
  status: string;
  createdAt: string;
  supplier: string;
  supplierId: string;
  site: string | null;
  siteCode: string | null;
}

export interface LogPOResponse {
  items: LogPO[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  facets: { suppliers: Array<{ id: string; name: string }> };
  kpis: {
    inProgressCount: number;
    toValidateCount: number;
    n2DafCount: number;
    receivedMonthCount: number;
  };
}

export function useLogPurchaseOrders(params: {
  status?: string;
  supplier?: string;
  site?: string;
  category?: string;
  search?: string;
  page?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return useQuery({
    queryKey: ["log", "po", params],
    queryFn: async (): Promise<LogPOResponse> => {
      const res = await fetch(`/api/log/purchase-orders?${qs.toString()}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useCreateLogPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { supplierId: string; siteId?: string | null; label: string; amount: number; category: string }) => {
      const res = await fetch("/api/log/purchase-orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["log", "po"] }),
  });
}
