"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VisitorType, VisitStatus } from "@prisma/client";

export interface UpcomingVisit {
  id: string;
  visitorType: VisitorType;
  visitorName: string;
  organization: string;
  scheduledAt: string;
  purpose: string;
  hoursUntil: number;
}

export interface RecentVisit {
  id: string;
  visitorType: VisitorType;
  visitorName: string;
  organization: string;
  scheduledAt: string;
  completedAt: string | null;
  purpose: string;
  reservations: number;
  reportContent: string | null;
  status: VisitStatus;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useVisits() {
  return useQuery({
    queryKey: ["cdt", "visits"],
    queryFn: () => getJson<{ upcoming: UpcomingVisit[]; recent: RecentVisit[] }>("/api/cdt/visits"),
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { visitorType: VisitorType; visitorName: string; organization: string; scheduledAt: string; purpose: string }) =>
      getJson(`/api/cdt/visits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "visits"] }),
  });
}

export function useReportVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reportContent, reservations }: { id: string; reportContent: string; reservations: number }) =>
      getJson(`/api/cdt/visits/${id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportContent, reservations }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cdt", "visits"] }),
  });
}
