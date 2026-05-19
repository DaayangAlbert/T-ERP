"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TeamMember {
  id: string;
  userId: string;
  role: "MEMBER" | "DEPUTY";
  user: { id: string; firstName: string; lastName: string; role: string };
}

export interface TeamItem {
  id: string;
  siteId: string;
  site: { id: string; code: string; name: string };
  name: string;
  color: string | null;
  active: boolean;
  leader: { id: string; firstName: string; lastName: string; role: string };
  members: TeamMember[];
  tasksCount: number;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  siteId: string;
  site: { id: string; code: string; name: string };
  teamId: string | null;
  team: { id: string; name: string; color: string | null } | null;
  title: string;
  description: string | null;
  location: string | null;
  scheduledDate: string;
  plannedStartTime: string | null;
  plannedEndTime: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "DONE" | "BLOCKED" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH";
  progressPercent: number;
  assigneeUserIds: string[];
  assignees: Array<{ id: string; firstName: string; lastName: string; role: string }>;
  blockedReason: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TasksResponse {
  items: TaskItem[];
  summary: {
    total: number;
    planned: number;
    inProgress: number;
    done: number;
    blocked: number;
    cancelled: number;
  };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ---- Teams ----
export function useCcTeams(opts: { includeInactive?: boolean } = {}) {
  const sp = new URLSearchParams();
  if (opts.includeInactive) sp.set("includeInactive", "true");
  return useQuery({
    queryKey: ["cc", "teams", opts],
    queryFn: () => getJson<{ items: TeamItem[] }>(`/api/cc/teams?${sp.toString()}`),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      siteId: string;
      name: string;
      color?: string | null;
      leaderId: string;
      memberIds?: string[];
    }) =>
      getJson<{ id: string }>(`/api/cc/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "teams"] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      getJson(`/api/cc/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "teams"] }),
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/cc/teams/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "teams"] }),
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId, role }: { teamId: string; userId: string; role?: "MEMBER" | "DEPUTY" }) =>
      getJson(`/api/cc/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "teams"] }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      getJson(`/api/cc/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "teams"] }),
  });
}

// ---- Tasks ----
export function useCcTasks(filters: {
  date?: string;
  from?: string;
  to?: string;
  teamId?: string;
  status?: string;
} = {}) {
  const sp = new URLSearchParams();
  if (filters.date) sp.set("date", filters.date);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.teamId) sp.set("teamId", filters.teamId);
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["cc", "tasks", filters],
    queryFn: () => getJson<TasksResponse>(`/api/cc/tasks?${sp.toString()}`),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      siteId: string;
      teamId?: string | null;
      title: string;
      description?: string | null;
      location?: string | null;
      scheduledDate: string;
      plannedStartTime?: string | null;
      plannedEndTime?: string | null;
      priority?: "LOW" | "NORMAL" | "HIGH";
      assigneeUserIds?: string[];
    }) =>
      getJson<{ id: string }>(`/api/cc/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      getJson(`/api/cc/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson(`/api/cc/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cc", "tasks"] }),
  });
}

// ---- Workforce (collaborateurs disponibles pour assignation) ----
export interface WorkforcePerson {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
  position: string | null;
}

export function useSiteWorkforce() {
  return useQuery({
    queryKey: ["cc", "workforce"],
    queryFn: async () => {
      const res = await fetch(`/api/cc/workforce`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const members: WorkforcePerson[] = (json.members ?? []).map((m: { user: WorkforcePerson }) => ({
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        employeeId: m.user.employeeId ?? null,
        position: m.user.position ?? null,
      }));
      return { members };
    },
  });
}
