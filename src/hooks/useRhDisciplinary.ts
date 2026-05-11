"use client";

import { useQuery } from "@tanstack/react-query";
import type { DisciplinarySeverity, DisciplinaryStage, DisciplinarySanction } from "@prisma/client";

export interface DisciplinaryCase {
  id: string;
  employeeKey: string;
  employeeName: string;
  reason: string;
  severity: DisciplinarySeverity;
  severityLabel: string;
  stage: DisciplinaryStage;
  stageLabel: string;
  sanction: DisciplinarySanction | null;
  sanctionLabel: string | null;
  openedAt: string;
  resolvedAt: string | null;
  facts: string;
  notes: string | null;
}

export interface DisciplinaryResponse {
  items: DisciplinaryCase[];
  summary: {
    activeCases: number;
    warningsLast12m: number;
    disciplinaryCouncils: number;
    negotiatedDepartures: number;
  };
  mode: string;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDisciplinary(mode: "active" | "history" | "negotiated" = "active") {
  return useQuery({
    queryKey: ["rh", "disciplinary", mode],
    queryFn: () => getJson<DisciplinaryResponse>(`/api/rh/disciplinary?mode=${mode}`),
  });
}
