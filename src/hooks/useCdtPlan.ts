"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamStatus } from "@prisma/client";

export interface DailyPlanTeamRow {
  id: string;
  teamId: string;
  teamName: string;
  teamSpecialty: string;
  teamLeaderId: string;
  teamHeadcountTarget: number;
  mainTask: string;
  objective: string | null;
  materialsNeeded: Array<{ article: string; quantity: number; unit: string }>;
  status: TeamStatus;
  extraNotes: string | null;
}

export interface DailyPlanResponse {
  id: string;
  siteId: string;
  planDate: string;
  status: string;
  notes: string | null;
  validatedAt: string | null;
  teams: DailyPlanTeamRow[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTodayPlan() {
  return useQuery({
    queryKey: ["cdt", "plan", "today"],
    queryFn: () => getJson<DailyPlanResponse>("/api/cdt/daily-plans/today"),
  });
}

export function useUpdateTeamAssignment(planId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, ...patch }: { teamId: string; mainTask?: string; objective?: string; status?: TeamStatus; materialsNeeded?: Array<{ article: string; quantity: number; unit: string }>; extraNotes?: string }) =>
      getJson(`/api/cdt/daily-plans/${planId}/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "plan"] }),
  });
}

export function useValidatePlan(planId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/cdt/daily-plans/${planId}/validate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt"] }),
  });
}
