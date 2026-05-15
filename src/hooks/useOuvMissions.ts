"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MissionStatus =
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type MissionPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface MissionItem {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  startDate: string;
  endDate: string | null;
  estimatedDays: number | null;
  progressPercent: number;
  priority: MissionPriority;
  status: MissionStatus;
  workerAcceptedAt: string | null;
  workerQuestionsRaised: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  progressPhotoUrls: string[];
  createdAt: string;
  site: { id: string; code: string; name: string };
  assignedBy: { id: string; firstName: string; lastName: string; role: string; fullName: string };
}

export interface MissionsResponse {
  active: MissionItem | null;
  pending: MissionItem[];
  history: MissionItem[];
  counts: {
    pendingAcceptance: number;
    inProgress: number;
    completed: number;
  };
}

export function useMissions() {
  return useQuery<MissionsResponse>({
    queryKey: ["ouv", "missions"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/missions", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture missions impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useAcceptMission() {
  const qc = useQueryClient();
  return useMutation<{ id: string; status: string; message: string }, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/ouv/missions/${id}/accept`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Acceptation refusée");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "missions"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export function useRaiseQuestions() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true; message: string },
    Error,
    { id: string; questions: string }
  >({
    mutationFn: async ({ id, questions }) => {
      const res = await fetch(`/api/ouv/missions/${id}/raise-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Envoi refusé");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "missions"] }),
  });
}

export function useUpdateMissionProgress() {
  const qc = useQueryClient();
  return useMutation<
    {
      id: string;
      status: MissionStatus;
      progressPercent: number;
      completedAt: string | null;
      message: string;
    },
    Error,
    { id: string; percent: number; photo?: string; note?: string }
  >({
    mutationFn: async ({ id, percent, photo, note }) => {
      const res = await fetch(`/api/ouv/missions/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percent, photo, note }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "MAJ refusée");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "missions"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export function useCompleteMission() {
  const qc = useQueryClient();
  return useMutation<
    { id: string; status: string; message: string },
    Error,
    { id: string; notes?: string }
  >({
    mutationFn: async ({ id, notes }) => {
      const res = await fetch(`/api/ouv/missions/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Clôture refusée");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "missions"] }),
  });
}
