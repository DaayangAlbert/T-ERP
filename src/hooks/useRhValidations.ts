"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ValidationPriority, ValidationType } from "@prisma/client";

export interface RhPendingValidation {
  id: string;
  reference: string;
  type: ValidationType;
  title: string;
  description: string | null;
  amount: string | null;
  priority: ValidationPriority;
  currentStep: string | null;
  initiator: string;
  initiatorPosition: string | null;
  workflow: unknown;
  dueDate: string | null;
  ageDays: number;
  createdAt: string;
}

export interface RhPendingSummary {
  total: number;
  totalAmount: string;
  averageDelayDays: number;
}

export interface RhCircuitItem {
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

export interface RhDelegationItem {
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

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useRhPendingValidations(type?: string) {
  return useQuery({
    queryKey: ["rh", "validations", "pending", type ?? "all"],
    queryFn: () => getJson<{ items: RhPendingValidation[]; summary: RhPendingSummary }>(
      `/api/rh/validations/pending${type ? `?type=${type}` : ""}`
    ),
  });
}

export function useRhCircuit() {
  return useQuery({
    queryKey: ["rh", "validations", "circuit"],
    queryFn: () => getJson<{
      items: RhCircuitItem[];
      summary: { total: number; byStep: { RH: number; DAF: number; DG: number }; blockedCount: number };
    }>("/api/rh/validations/circuit"),
  });
}

export function useApproveRhValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/rh/validations/${id}/approve`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "validations"] }),
  });
}

export function useRejectRhValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      getJson(`/api/rh/validations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "validations"] }),
  });
}

export function useRhDelegations() {
  return useQuery({
    queryKey: ["rh", "validations", "delegations"],
    queryFn: () => getJson<{ outgoing: RhDelegationItem[]; incoming: RhDelegationItem[]; history: RhDelegationItem[] }>(
      `/api/rh/validations/delegations`
    ),
  });
}
