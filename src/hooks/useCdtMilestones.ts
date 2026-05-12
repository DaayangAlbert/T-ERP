"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CdtMilestoneStatus } from "@prisma/client";

export interface MilestoneDeliverable {
  key: string;
  label: string;
  done: boolean;
}

export interface MilestoneItem {
  id: string;
  code: string;
  designation: string;
  contractDate: string;
  forecastDate: string;
  actualDate: string | null;
  status: CdtMilestoneStatus;
  deliverables: MilestoneDeliverable[];
  preparation: number;
  reservations: number;
}

export interface MilestonesResponse {
  items: MilestoneItem[];
  kpis: { reached: number; total: number; nextCode: string | null; daysToNext: number | null; openReservations: number; onTime: boolean };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useMilestones() {
  return useQuery({
    queryKey: ["cdt", "milestones"],
    queryFn: () => getJson<MilestonesResponse>("/api/cdt/milestones"),
  });
}

export function useToggleDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, key, done }: { milestoneId: string; key: string; done: boolean }) =>
      getJson(`/api/cdt/milestones/${milestoneId}/deliverable`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, done }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "milestones"] }),
  });
}
