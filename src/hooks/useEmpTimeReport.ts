"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface TodayStatus {
  hasReport: boolean;
  status: string;
  arrivalLabel: string;
  arrivalTime?: string | null;
  departureTime?: string | null;
  pointerName?: string | null;
  totalHours?: number;
  overtimeHours?: number;
}

export interface MonthDay {
  id: string;
  date: string;
  status: string;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  overtimeType: string | null;
  contested: boolean;
  resolvedAt: string | null;
}

export interface CurrentMonthResponse {
  month: string;
  monthLabel: string;
  currentDay: number;
  totalDays: number;
  pointerName: string;
  lastSyncAt: string | null;
  kpis: { totalHours: number; overtimeHours: number; lates: number; absences: number };
  days: MonthDay[];
}

export function useTimeToday() {
  return useQuery<TodayStatus>({
    queryKey: ["emp", "timereport", "today"],
    queryFn: async () => {
      const r = await fetch("/api/emp/timereport/today", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur statut du jour");
      return r.json();
    },
  });
}

export function useCurrentMonth() {
  return useQuery<CurrentMonthResponse>({
    queryKey: ["emp", "timereport", "current-month"],
    queryFn: async () => {
      const r = await fetch("/api/emp/timereport/current-month", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur pointage mensuel");
      return r.json();
    },
  });
}

export function useContestTimeReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; kind: string; expectedTime: string; reason: string }) => {
      const r = await fetch(`/api/emp/timereport/${input.id}/contest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur signalement");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp", "timereport"] });
    },
  });
}
