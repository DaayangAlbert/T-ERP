"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MilestoneType, MilestoneStatus, ArbitrationStatus, SiteStatus } from "@prisma/client";

interface GanttItem {
  id: string;
  code: string;
  name: string;
  status: SiteStatus;
  startDate: string;
  endDate: string;
  progress: number;
}

interface ResourceRow {
  key: string;
  label: string;
  points: Array<{ month: string; load: number }>;
}

interface MilestoneItem {
  id: string;
  type: MilestoneType;
  title: string;
  date: string;
  siteId: string | null;
  critical: boolean;
  status: MilestoneStatus;
  notes: string | null;
  createdAt: string;
}

interface ConflictItem {
  id: string;
  resourceType: "CREW" | "EQUIPMENT" | string;
  resourceLabel: string;
  periodStart: string;
  periodEnd: string;
  demandLevel: number;
  siteIds: string[];
  resolved: boolean;
  resolution: string | null;
  arbitration: boolean;
  arbitrationStatus: ArbitrationStatus;
  arbitrationNote: string | null;
  createdAt: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useGantt() {
  return useQuery({
    queryKey: ["planning", "gantt"],
    queryFn: () => getJson<{ items: GanttItem[] }>(`/api/planning/gantt`),
  });
}

export function useResourceLoad(view: "skill" | "equipment") {
  return useQuery({
    queryKey: ["planning", "resources", view],
    queryFn: () => getJson<{ view: string; rows: ResourceRow[]; conflictsCount: number }>(
      `/api/planning/resources?view=${view}`
    ),
  });
}

export function useMilestones(filters: { type?: string; from?: string; to?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.type) sp.set("type", filters.type);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  return useQuery({
    queryKey: ["planning", "milestones", filters],
    queryFn: () => getJson<{ items: MilestoneItem[] }>(`/api/planning/milestones?${sp.toString()}`),
  });
}

export function useCreateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; title: string; date: string; siteId?: string | null; critical?: boolean; notes?: string }) =>
      getJson(`/api/planning/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning", "milestones"] }),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      getJson(`/api/planning/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planning", "milestones"] }),
  });
}

export function useConflicts() {
  return useQuery({
    queryKey: ["planning", "conflicts"],
    queryFn: () => getJson<{ items: ConflictItem[] }>(`/api/planning/conflicts`),
  });
}

export function useResolveConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: string }) =>
      getJson(`/api/planning/conflicts/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning", "conflicts"] });
      qc.invalidateQueries({ queryKey: ["planning", "arbitrations"] });
    },
  });
}

export function useArbitrations() {
  return useQuery({
    queryKey: ["planning", "arbitrations"],
    queryFn: () => getJson<{ items: ConflictItem[] }>(`/api/planning/dg-arbitrations`),
  });
}

export function useDecideArbitration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) =>
      getJson(`/api/planning/dg-arbitrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planning", "arbitrations"] });
      qc.invalidateQueries({ queryKey: ["planning", "conflicts"] });
    },
  });
}
