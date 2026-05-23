"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ValidationType, ValidationStatus, ValidationPriority, Role } from "@prisma/client";

interface PendingValidation {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  description: string | null;
  amount: string | null;
  priority: ValidationPriority;
  status: ValidationStatus;
  currentStep: string | null;
  initiator: string;
  initiatorPosition: string | null;
  currentApprover: string | null;
  workflow: unknown;
  dueDate: string | null;
  createdAt: string;
}

interface HistoryValidation {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  amount: string | null;
  status: ValidationStatus;
  initiator: string;
  decidedBy: string | null;
  decisionAt: string | null;
  decisionReason: string | null;
  createdAt: string;
}

interface DetailValidation {
  id: string;
  type: ValidationType;
  reference: string;
  title: string;
  description: string | null;
  amount: string | null;
  priority: ValidationPriority;
  status: ValidationStatus;
  currentStep: string | null;
  initiator: { id: string; name: string; position: string | null; email: string };
  currentApprover: { id: string; name: string } | null;
  decidedBy: { id: string; name: string } | null;
  decisionAt: string | null;
  decisionReason: string | null;
  workflow: { steps: Array<{ key: string; label: string; role: Role; status: string; decidedByName?: string; decidedAt?: string; comment?: string }> };
  comments: Array<{ id: string; type: string; authorName: string; message: string; createdAt: string }>;
  dueDate: string | null;
  createdAt: string;
}

interface DelegationItem {
  id: string;
  from: { name: string; role: Role };
  to: { name: string; role: Role };
  types: ValidationType[];
  maxAmount: string | null;
  startDate: string;
  endDate: string | null;
  active: boolean;
  reason: string | null;
  createdAt: string;
}

interface EligibleApprover {
  id: string;
  name: string;
  role: Role;
  position: string | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useValidations(filters: { type?: string; priority?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.type) sp.set("type", filters.type);
  if (filters.priority) sp.set("priority", filters.priority);
  return useQuery({
    queryKey: ["validations", filters],
    queryFn: () => fetchJson<{ items: PendingValidation[]; total: number }>(`/api/validations?${sp.toString()}`),
  });
}

export function useValidationDetail(id: string) {
  return useQuery({
    queryKey: ["validation", id],
    queryFn: () => fetchJson<DetailValidation>(`/api/validations/${id}`),
    enabled: Boolean(id),
  });
}

export function useValidationHistory(filters: {
  page?: number;
  q?: string;
  type?: string;
  status?: string;
  since?: string;
} = {}) {
  const sp = new URLSearchParams();
  if (filters.page) sp.set("page", String(filters.page));
  if (filters.q) sp.set("q", filters.q);
  if (filters.type) sp.set("type", filters.type);
  if (filters.status) sp.set("status", filters.status);
  if (filters.since) sp.set("since", filters.since);
  return useQuery({
    queryKey: ["validations", "history", filters],
    queryFn: () =>
      fetchJson<{
        items: HistoryValidation[];
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      }>(`/api/validations/history?${sp.toString()}`),
  });
}

export function useApproveValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      fetchJson(`/api/validations/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["validations"] });
      qc.invalidateQueries({ queryKey: ["validation", vars.id] });
    },
  });
}

// DG → demande l'autorisation du Propriétaire / PCA pour une validation.
export function useEscalateOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      fetchJson(`/api/dg/validations/${id}/escalate-owner`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg", "validations"] });
      qc.invalidateQueries({ queryKey: ["validations"] });
    },
  });
}

export function useRejectValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      fetchJson(`/api/validations/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["validations"] });
      qc.invalidateQueries({ queryKey: ["validation", vars.id] });
    },
  });
}

export function useRequestInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      fetchJson(`/api/validations/${id}/request-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["validation", vars.id] });
    },
  });
}

export function useBulkApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, comment }: { ids: string[]; comment?: string }) =>
      fetchJson<{ approved: number; advanced: number; total: number }>(`/api/validations/bulk-approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, comment }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["validations"] });
    },
  });
}

export function useDelegations() {
  return useQuery({
    queryKey: ["validations", "delegations"],
    queryFn: () => fetchJson<{ items: DelegationItem[] }>(`/api/validations/delegations`),
  });
}

export function useCreateDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      toUserId: string;
      types: string[];
      maxAmount?: string | null;
      startDate: string;
      endDate?: string | null;
      reason?: string;
    }) =>
      fetchJson(`/api/validations/delegations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["validations", "delegations"] }),
  });
}

export function useToggleDelegation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      fetchJson(`/api/validations/delegations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["validations", "delegations"] }),
  });
}

export function useEligibleApprovers() {
  return useQuery({
    queryKey: ["validations", "approvers"],
    queryFn: () => fetchJson<{ items: EligibleApprover[] }>(`/api/validations/eligible-approvers`),
  });
}
