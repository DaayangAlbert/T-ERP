"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface WorkflowInstanceRow {
  id: string;
  reference: string;
  documentName: string;
  documentReference: string | null;
  templateCode: string;
  templateName: string;
  status: "IN_PROGRESS" | "OVERDUE" | "COMPLETED" | "REJECTED" | "CANCELLED";
  currentStepIndex: number;
  currentStepName: string;
  currentStepRole: string;
  totalSteps: number;
  initiatorName: string;
  dueAt: string | null;
  daysToDue: number | null;
  startedAt: string;
  stepsHistory: Array<{ stepIndex: number; stepName: string; status: string; decidedAt: string | null }>;
  pipeline: Array<{ stepIndex: number; name: string; role: string; status: "DONE" | "ACTIVE" | "OVERDUE" | "PENDING" }>;
}

export interface WorkflowsResponse {
  kpis: {
    inProgress: number;
    avgDelayDays: number;
    overdue: number;
    completionRate: number;
    completedYtd: number;
  };
  critical: WorkflowInstanceRow | null;
  instances: WorkflowInstanceRow[];
  templates: Array<{ id: string; code: string; name: string; stepsCount: number }>;
}

export function useGedWorkflows() {
  return useQuery({
    queryKey: ["ged", "workflows"],
    queryFn: async (): Promise<WorkflowsResponse> => {
      const res = await fetch("/api/ged/workflows", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface WorkflowDetail {
  id: string;
  reference: string;
  status: "IN_PROGRESS" | "OVERDUE" | "COMPLETED" | "REJECTED" | "CANCELLED";
  currentStep: number;
  startedAt: string;
  dueAt: string | null;
  completedAt: string | null;
  daysToDue: number | null;
  isOverdue: boolean;
  template: { id: string; code: string; name: string; description: string | null; stepsTotal: number };
  document: { id: string; name: string; internalReference: string | null; confidentiality: string; space: { id: string; name: string; icon: string | null } | null };
  initiator: { id: string; name: string; role: string } | null;
  pipeline: Array<{ stepIndex: number; name: string; role: string; slaHours: number; status: "DONE" | "ACTIVE" | "OVERDUE" | "PENDING" }>;
  steps: Array<{
    id: string;
    index: number;
    name: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";
    decidedAt: string | null;
    comment: string | null;
    assignedTo: { id: string; name: string; role: string } | null;
  }>;
}

export function useWorkflowDetail(id: string | null) {
  return useQuery({
    queryKey: ["ged", "workflow-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<WorkflowDetail> => {
      const res = await fetch(`/api/ged/workflows/${id}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["ged", "workflows"] });
  qc.invalidateQueries({ queryKey: ["ged", "workflow-detail"] });
  qc.invalidateQueries({ queryKey: ["ged", "dashboard"] });
}

export function useDecideWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { decision: "APPROVE" | "REJECT"; comment?: string }) => {
      const res = await fetch(`/api/ged/workflows/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export function useEscalateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { message?: string }) => {
      const res = await fetch(`/api/ged/workflows/${id}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ ok: true; notifiedUserId: string | null; notifiedUserName: string | null }>;
    },
    onSuccess: () => invalidateAll(qc),
  });
}

// ─────────────────────────────────────────────────────────────────────
// CRUD Templates de workflow
// ─────────────────────────────────────────────────────────────────────

export type WorkflowStepRole =
  | "DG"
  | "DAF"
  | "SECRETARY_GENERAL"
  | "HR"
  | "TECH_DIRECTOR"
  | "WORKS_DIRECTOR"
  | "WORKS_MANAGER"
  | "SITE_MANAGER"
  | "WORKER"
  | "ACCOUNTANT"
  | "LOGISTICS"
  | "WAREHOUSE"
  | "ARCHIVIST"
  | "EMPLOYEE"
  | "EXTERNAL";

export interface WorkflowStepInput {
  stepIndex: number;
  name: string;
  role: WorkflowStepRole;
  mandatory: boolean;
  slaHours: number;
}

export interface WorkflowTemplate {
  id: string;
  code: string;
  name: string;
  description: string | null;
  steps: WorkflowStepInput[];
  active: boolean;
  instancesCount: number;
  classificationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplateDetail extends Omit<WorkflowTemplate, "classificationsCount"> {
  classifications: Array<{ id: string; prefix: string; name: string; active: boolean }>;
}

export function useGedWorkflowTemplates() {
  return useQuery({
    queryKey: ["ged", "workflow-templates"],
    queryFn: async (): Promise<{ templates: WorkflowTemplate[] }> => {
      const res = await fetch("/api/ged/workflows/templates", { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export function useGedWorkflowTemplate(id: string | null) {
  return useQuery({
    queryKey: ["ged", "workflow-template", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<WorkflowTemplateDetail> => {
      const res = await fetch(`/api/ged/workflows/templates/${id}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

function invalidateTemplates(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["ged", "workflow-templates"] });
  qc.invalidateQueries({ queryKey: ["ged", "workflow-template"] });
  qc.invalidateQueries({ queryKey: ["ged", "workflows"] });
}

export interface CreateTemplateInput {
  code: string;
  name: string;
  description?: string | null;
  steps: WorkflowStepInput[];
  classificationIds?: string[];
}

export function useCreateWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const res = await fetch("/api/ged/workflows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{
        ok: true;
        template: { id: string; code: string; name: string };
      }>;
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  steps?: WorkflowStepInput[];
  active?: boolean;
  classificationIds?: string[];
}

export function useUpdateWorkflowTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      const res = await fetch(`/api/ged/workflows/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

export function useDeleteWorkflowTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => {
      const res = await fetch(
        `/api/ged/workflows/templates/${id}${force ? "?force=1" : ""}`,
        { method: "DELETE", credentials: "same-origin" },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ ok: true; deleted: "soft" | "hard" }>;
    },
    onSuccess: () => invalidateTemplates(qc),
  });
}

export function useCancelWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reason: string }) => {
      const res = await fetch(`/api/ged/workflows/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => invalidateAll(qc),
  });
}
