"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ValidationPriority, ValidationType } from "@prisma/client";

export interface CircuitItem {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  amount: string | null;
  priority: ValidationPriority;
  currentStep: string | null;
  currentApprover: string;
  initiator: string;
  ageDays: number;
  blockedDays: number | null;
  createdAt: string;
}

export interface CircuitSummary {
  total: number;
  totalAmount: string;
  byStep: { RH: number; DAF: number; DG: number; OTHER: number };
  blockedCount: number;
}

export interface ValidationStats {
  avgByStep: Array<{ step: string; averageHours: number; count: number }>;
  byType: Array<{ type: string; label: string; averageHours: number; count: number }>;
  topSlowValidators: Array<{ userId: string; name: string; averageAgeDays: number; pendingCount: number }>;
  rejectionByStep: Array<{ step: string; total: number; rejected: number; percent: number }>;
  heatmap: Array<{ hour: number; count: number }>;
  period: { sinceDays: number; total: number };
}

export interface DelegationItem {
  id: string;
  to?: string;
  toPosition?: string | null;
  from?: string;
  fromPosition?: string | null;
  types: string[];
  maxAmount: string | null;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  endedAt?: string | null;
}

export interface DelegationsData {
  outgoing: DelegationItem[];
  incoming: DelegationItem[];
  history: DelegationItem[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useAllCircuit(filters: { step?: string; type?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.step) sp.set("step", filters.step);
  if (filters.type) sp.set("type", filters.type);
  const qs = sp.toString();
  return useQuery({
    queryKey: ["daf", "validations", "all-circuit", filters],
    queryFn: () =>
      getJson<{ items: CircuitItem[]; summary: CircuitSummary }>(
        `/api/daf/validations/all-circuit${qs ? `?${qs}` : ""}`
      ),
  });
}

export function useUnblock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "RELANCE" | "TAKE_OVER"; note?: string }) =>
      getJson(`/api/daf/validations/${id}/unblock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "validations"] }),
  });
}

export function useValidationStats() {
  return useQuery({
    queryKey: ["daf", "validations", "stats"],
    queryFn: () => getJson<ValidationStats>(`/api/daf/validations/stats`),
  });
}

export function useDelegations() {
  return useQuery({
    queryKey: ["daf", "validations", "delegations"],
    queryFn: () => getJson<DelegationsData>(`/api/daf/validations/delegations`),
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      toUserId: string;
      types: string[];
      maxAmount?: string;
      startDate: string;
      endDate?: string;
      reason?: string;
    }) =>
      getJson(`/api/daf/validations/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "validations", "delegations"] }),
  });
}

export function useEndDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/validations/delegations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "validations", "delegations"] }),
  });
}
