/**
 * Helpers pour les workflows de validation (Phase 2 / Bloc 2 — fn 2.1).
 *
 * Le workflow d'une validation est stocké en JSON dans Validation.workflow.
 * Forme : { steps: [{ key, label, role, status, decidedById?, decidedAt?, comment? }] }
 *
 * Les workflows par défaut dépendent du type :
 *   - PAYROLL  : Initiateur → RH (N1) → DAF (N2) → DG (N3)
 *   - EXPENSE  : Initiateur → DAF (N1) → DG (N2)
 *   - PURCHASE : Initiateur → DAF (N1) → DG (N2)
 *   - HIRING   : Initiateur → RH (N1) → DG (N2)
 *   - CONTRACT : Initiateur → DAF (N1) → DG (N2)
 *   - LEAVE    : Initiateur → RH (N1) → DG (N2)  (au-delà d'un seuil)
 */

import { Role, ValidationType } from "@prisma/client";

export type WorkflowStepStatus = "PENDING" | "APPROVED" | "REJECTED" | "SKIPPED";

export interface WorkflowStep {
  key: string;
  label: string;
  role: Role;
  status: WorkflowStepStatus;
  decidedById?: string;
  decidedByName?: string;
  decidedAt?: string;
  comment?: string;
}

export interface Workflow {
  steps: WorkflowStep[];
}

export interface CommentEntry {
  id: string;
  type: "COMMENT" | "INFO_REQUEST" | "DELEGATION" | "DECISION";
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
}

const TEMPLATES: Record<ValidationType, Array<{ key: string; label: string; role: Role }>> = {
  PAYROLL: [
    { key: "RH", label: "Validation RH", role: "HR" },
    { key: "DAF", label: "Validation DAF", role: "DAF" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  EXPENSE: [
    { key: "DAF", label: "Validation DAF", role: "DAF" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  PURCHASE: [
    { key: "DAF", label: "Validation DAF", role: "DAF" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  HIRING: [
    { key: "RH", label: "Validation RH", role: "HR" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  CONTRACT: [
    { key: "DAF", label: "Validation DAF", role: "DAF" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  LEAVE: [
    { key: "RH", label: "Validation RH", role: "HR" },
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
  OTHER: [
    { key: "DG", label: "Validation DG", role: "DG" },
  ],
};

export function buildDefaultWorkflow(type: ValidationType): Workflow {
  return {
    steps: TEMPLATES[type].map((s) => ({ ...s, status: "PENDING" as WorkflowStepStatus })),
  };
}

export function currentStepOf(wf: Workflow): WorkflowStep | null {
  return wf.steps.find((s) => s.status === "PENDING") ?? null;
}

/**
 * Marque l'étape courante comme APPROVED et retourne le workflow + l'éventuelle
 * étape suivante. Si toutes les étapes sont approuvées, la validation est terminée.
 */
export function approveCurrentStep(
  wf: Workflow,
  decidedBy: { id: string; name: string },
  comment?: string
): { workflow: Workflow; next: WorkflowStep | null } {
  const idx = wf.steps.findIndex((s) => s.status === "PENDING");
  if (idx < 0) return { workflow: wf, next: null };
  const updated: Workflow = {
    steps: wf.steps.map((s, i) =>
      i === idx
        ? {
            ...s,
            status: "APPROVED" as WorkflowStepStatus,
            decidedById: decidedBy.id,
            decidedByName: decidedBy.name,
            decidedAt: new Date().toISOString(),
            comment,
          }
        : s
    ),
  };
  const next = updated.steps[idx + 1] ?? null;
  return { workflow: updated, next };
}

export function rejectCurrentStep(
  wf: Workflow,
  decidedBy: { id: string; name: string },
  comment: string
): Workflow {
  const idx = wf.steps.findIndex((s) => s.status === "PENDING");
  if (idx < 0) return wf;
  return {
    steps: wf.steps.map((s, i) =>
      i === idx
        ? {
            ...s,
            status: "REJECTED" as WorkflowStepStatus,
            decidedById: decidedBy.id,
            decidedByName: decidedBy.name,
            decidedAt: new Date().toISOString(),
            comment,
          }
        : s
    ),
  };
}

export function appendComment(
  current: CommentEntry[] | unknown,
  entry: Omit<CommentEntry, "id" | "createdAt">
): CommentEntry[] {
  const list = Array.isArray(current) ? (current as CommentEntry[]) : [];
  return [
    ...list,
    {
      ...entry,
      id: cryptoRandomId(),
      createdAt: new Date().toISOString(),
    },
  ];
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
