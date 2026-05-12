"use client";

import { useQuery } from "@tanstack/react-query";

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
