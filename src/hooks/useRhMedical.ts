"use client";

import { useQuery } from "@tanstack/react-query";
import type { FitnessVerdict, MedicalVisitType } from "@prisma/client";

export interface MedicalVisit {
  id: string;
  employeeKey: string;
  employeeName: string;
  type: MedicalVisitType;
  typeLabel: string;
  scheduledAt: string;
  completedAt: string | null;
  fitnessVerdict: FitnessVerdict | null;
  verdictLabel: string | null;
  restrictions: string | null;
  doctor: string | null;
  overdue: boolean;
  daysToScheduled: number;
  status: "OVERDUE" | "SOON" | "PLANNED" | "COMPLETED";
}

export interface MedicalResponse {
  items: MedicalVisit[];
  summary: {
    scheduledThisMonth: number;
    overdue: number;
    fitWithoutRestrictions: number;
    fitWithRestrictions: number;
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

export function useMedicalVisits(mode: "all" | "upcoming" | "overdue" = "all") {
  return useQuery({
    queryKey: ["rh", "medical", mode],
    queryFn: () => getJson<MedicalResponse>(`/api/rh/medical?mode=${mode}`),
  });
}
