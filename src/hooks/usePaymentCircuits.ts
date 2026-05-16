"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CircuitStep {
  id: string;
  order: number;
  label: string;
  description: string | null;
  contactName: string | null;
  contactRole: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  estimatedDays: number | null;
}

export interface CircuitTemplate {
  id: string;
  name: string;
  clientName: string;
  description: string | null;
  archivedAt: string | null;
  stepCount: number;
  trackCount: number;
  steps: CircuitStep[];
  createdAt: string;
  updatedAt: string;
}

export type PaymentStepStatus = "PENDING" | "IN_PROGRESS" | "VALIDATED" | "BLOCKED";

export interface PaymentTrackStepDoc {
  id: string;
  label: string;
  provided: boolean;
  providedAt: string | null;
  providedNote: string | null;
}

export interface PaymentTrackStep {
  id: string;
  order: number;
  label: string;
  status: PaymentStepStatus;
  validatedAt: string | null;
  validatedBy: { id: string; firstName: string; lastName: string } | null;
  blockedReason: string | null;
  blockedSince: string | null;
  blockedBy: { id: string; firstName: string; lastName: string } | null;
  documents: PaymentTrackStepDoc[];
}

export interface PaymentTrack {
  id: string;
  template: { id: string; name: string; clientName: string };
  receivable: {
    id: string;
    invoiceRef: string;
    clientName: string;
    amount: string;
    dueDate: string;
    status: string;
  };
  assignedTo: { id: string; firstName: string; lastName: string; position: string | null } | null;
  createdBy: { id: string; firstName: string; lastName: string };
  startedAt: string;
  completedAt: string | null;
  steps: PaymentTrackStep[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Templates ─────────────────────────────────────────────────────────────

export function useCircuitTemplates() {
  return useQuery({
    queryKey: ["daf", "payment-circuits"],
    queryFn: () => getJson<{ items: CircuitTemplate[] }>("/api/daf/payment-circuits"),
  });
}

export function useCreateCircuitTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      getJson<{ id: string; name: string }>("/api/daf/payment-circuits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "payment-circuits"] }),
  });
}

export function useArchiveCircuitTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: true }>(`/api/daf/payment-circuits/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "payment-circuits"] }),
  });
}

// ─── Tracks ───────────────────────────────────────────────────────────────

export function usePaymentTrack(trackId: string | null) {
  return useQuery({
    queryKey: ["daf", "payment-tracks", trackId],
    queryFn: () => getJson<PaymentTrack>(`/api/daf/payment-tracks/${trackId}`),
    enabled: !!trackId,
  });
}

export function useApplyCircuit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { receivableId: string; templateId: string; assignedToId?: string | null }) =>
      getJson<{ id: string }>(`/api/daf/receivables/${input.receivableId}/apply-circuit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: input.templateId, assignedToId: input.assignedToId ?? null }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "active-reminders"] });
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks"] });
    },
  });
}

export function useAssignTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackId: string; assignedToId: string | null }) =>
      getJson<{ ok: true }>(`/api/daf/payment-tracks/${input.trackId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: input.assignedToId }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks", vars.trackId] });
    },
  });
}

export function useValidateStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackId: string; stepId: string }) =>
      getJson<{ ok: true }>(
        `/api/daf/payment-tracks/${input.trackId}/steps/${input.stepId}/validate`,
        { method: "POST" },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks", vars.trackId] });
    },
  });
}

export function useBlockStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackId: string; stepId: string; reason: string; requiredDocuments: string[] }) =>
      getJson<{ ok: true }>(
        `/api/daf/payment-tracks/${input.trackId}/steps/${input.stepId}/block`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: input.reason, requiredDocuments: input.requiredDocuments }),
        },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks", vars.trackId] });
    },
  });
}

export function useUnblockStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackId: string; stepId: string }) =>
      getJson<{ ok: true }>(
        `/api/daf/payment-tracks/${input.trackId}/steps/${input.stepId}/unblock`,
        { method: "POST" },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks", vars.trackId] });
    },
  });
}

export function useToggleDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackId: string; stepId: string; docId: string; note?: string }) =>
      getJson<{ ok: true; provided: boolean }>(
        `/api/daf/payment-tracks/${input.trackId}/steps/${input.stepId}/documents/${input.docId}/provide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: input.note ?? null }),
        },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["daf", "payment-tracks", vars.trackId] });
    },
  });
}
