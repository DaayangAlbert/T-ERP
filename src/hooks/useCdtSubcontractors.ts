"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ActiveSubcontractor {
  id: string;
  subcontractorId: string;
  name: string;
  contractLabel: string;
  workerCount: number;
  headcountTarget: number;
  supervisor: string;
  activityNotes: string | null;
  progress: number;
  startedAt: string;
  endDate: string;
  totalAmount: number;
  qualityRating: number;
}

export interface UpcomingSubcontractor {
  id: string;
  name: string;
  contractLabel: string;
  startsAt: string;
  durationDays: number;
  totalAmount: number;
}

export interface SubcontractorsResponse {
  active: ActiveSubcontractor[];
  upcoming: UpcomingSubcontractor[];
  totalEngagedAmount: number;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useSubcontractors() {
  return useQuery({
    queryKey: ["cdt", "subcontractors"],
    queryFn: () => getJson<SubcontractorsResponse>("/api/cdt/subcontractors"),
  });
}

export function useRecordAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subcontractorId: string; workerCount: number; supervisorOnSite: string; activityNotes?: string }) =>
      getJson(`/api/cdt/subcontractor-attendance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt"] }),
  });
}
