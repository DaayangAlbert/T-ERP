"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enqueueClock } from "@/lib/ouv/clock-offline";
import type { OuvClockState } from "@/hooks/useOuvDashboard";

export interface ClockTodayResponse {
  state: OuvClockState;
  timeReport: {
    id: string;
    date: string;
    siteId: string | null;
    arrivalTime: string | null;
    departureTime: string | null;
    breakMinutes: number;
    totalHours: number;
    standardHours: number;
    overtimeHours: number;
    overtimeType: string | null;
    status: string;
    outOfGeofence: boolean;
    contested: boolean;
    contestReason: string | null;
  } | null;
}

export interface ClockWeekDay {
  id: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  overtimeType: string | null;
  status: string;
  outOfGeofence: boolean;
  contested: boolean;
}

export interface ClockWeekResponse {
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  days: ClockWeekDay[];
  kpis: {
    weekTotalHours: number;
    weekOvertimeHours: number;
    monthTotalHours: number;
    monthOvertimeHours: number;
  };
}

export interface DisputeItem {
  id: string;
  date: string;
  totalHours: number;
  contestedAt: string | null;
  contestReason: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  status: "PENDING" | "RESOLVED";
}

export interface ClockSubmitPayload {
  siteId?: string;
  geo: { lat: number; lng: number; accuracyM: number | null } | null;
  selfie: string | null;
  deviceFingerprint: string | null;
  acknowledgeOutOfGeofence?: boolean;
}

export function useClockToday() {
  return useQuery<ClockTodayResponse>({
    queryKey: ["ouv", "clock", "today"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/clock/today", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture du pointage du jour impossible");
      return res.json();
    },
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });
}

export function useClockWeek() {
  return useQuery<ClockWeekResponse>({
    queryKey: ["ouv", "clock", "week"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/clock/week", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture de la semaine impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useClockDisputes() {
  return useQuery<{ disputes: DisputeItem[] }>({
    queryKey: ["ouv", "clock", "disputes"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/clock/disputes", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture des désaccords impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

interface ClockResult {
  ok: boolean;
  queued?: boolean;
  data?: any;
  errorCode?: string;
  message?: string;
  requiresAcknowledge?: boolean;
  distanceM?: number;
}

// Mutation pointage entrée avec fallback offline.
// Si fetch échoue (offline) ou SW renvoie 503 queued, on enqueue dans IndexedDB.
export function useClockIn() {
  const qc = useQueryClient();
  return useMutation<ClockResult, Error, ClockSubmitPayload>({
    mutationFn: async (payload) => {
      try {
        const res = await fetch("/api/ouv/clock/in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 503 && json?.queued) {
          await enqueueClock({ endpoint: "in", payload });
          return { ok: false, queued: true, message: "Pointage en attente de sync" };
        }
        if (!res.ok) {
          return {
            ok: false,
            errorCode: json.code,
            message: json.error ?? "Erreur",
            requiresAcknowledge: json.requiresAcknowledge,
            distanceM: json.distanceM,
          };
        }
        return { ok: true, data: json };
      } catch {
        // Réseau coupé : on enfile localement et on signale "queued"
        await enqueueClock({ endpoint: "in", payload });
        return { ok: false, queued: true, message: "Pointage stocké hors-ligne" };
      }
    },
    onSuccess: (res) => {
      if (res.ok || res.queued) {
        qc.invalidateQueries({ queryKey: ["ouv", "clock"] });
        qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
      }
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation<ClockResult, Error, Omit<ClockSubmitPayload, "siteId">>({
    mutationFn: async (payload) => {
      try {
        const res = await fetch("/api/ouv/clock/out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 503 && json?.queued) {
          await enqueueClock({ endpoint: "out", payload });
          return { ok: false, queued: true, message: "Pointage en attente de sync" };
        }
        if (!res.ok) {
          return {
            ok: false,
            errorCode: json.code,
            message: json.error ?? "Erreur",
            requiresAcknowledge: json.requiresAcknowledge,
            distanceM: json.distanceM,
          };
        }
        return { ok: true, data: json };
      } catch {
        await enqueueClock({ endpoint: "out", payload });
        return { ok: false, queued: true, message: "Pointage stocké hors-ligne" };
      }
    },
    onSuccess: (res) => {
      if (res.ok || res.queued) {
        qc.invalidateQueries({ queryKey: ["ouv", "clock"] });
        qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
      }
    },
  });
}

export function useDispute() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      const res = await fetch(`/api/ouv/clock/${id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Contestation refusée");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "clock"] });
    },
  });
}
