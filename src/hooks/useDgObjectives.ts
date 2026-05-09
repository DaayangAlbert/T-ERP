"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ObjectiveCategory, ObjectivePeriod, ObjectiveStatus } from "@prisma/client";

export interface ObjectiveItem {
  id: string;
  category: ObjectiveCategory;
  title: string;
  description: string | null;
  targetValue: number;
  actualValue: number;
  unit: string;
  period: ObjectivePeriod;
  year: number;
  quarter: number | null;
  weight: number;
  status: ObjectiveStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ObjectiveTrajectoryPoint {
  month: string;
  monthIndex: number;
  forecast: number;
  actual: number | null;
  target: number;
}

export interface ObjectiveDetail extends Omit<ObjectiveItem, "createdAt" | "updatedAt"> {
  trajectory: ObjectiveTrajectoryPoint[];
}

export interface ObjectivesFilter {
  year?: number;
  period?: ObjectivePeriod;
  quarter?: number;
}

export function useDgObjectives(filter: ObjectivesFilter = {}) {
  const params = new URLSearchParams();
  if (filter.year) params.set("year", String(filter.year));
  if (filter.period) params.set("period", filter.period);
  if (filter.quarter) params.set("quarter", String(filter.quarter));
  return useQuery({
    queryKey: ["dg-objectives", filter],
    queryFn: async (): Promise<{ items: ObjectiveItem[]; total: number }> => {
      const res = await fetch(`/api/dg/objectives?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useObjectiveDetail(id: string | null) {
  return useQuery({
    queryKey: ["dg-objective", id],
    queryFn: async (): Promise<ObjectiveDetail> => {
      const res = await fetch(`/api/dg/objectives/${id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useUpsertObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; payload: Record<string, unknown> }) => {
      const url = input.id ? `/api/dg/objectives/${input.id}` : "/api/dg/objectives";
      const method = input.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg-objectives"] });
    },
  });
}

export function useDeleteObjective() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dg/objectives/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dg-objectives"] });
    },
  });
}

/** Indicateur de pacing : compare progress% à temps écoulé%. */
export function objectivePace(o: { startDate: string; endDate: string; actualValue: number; targetValue: number }) {
  const start = new Date(o.startDate).getTime();
  const end = new Date(o.endDate).getTime();
  const now = Date.now();
  const totalSpan = Math.max(1, end - start);
  const elapsed = Math.max(0, Math.min(1, (now - start) / totalSpan));
  const progress = o.targetValue ? Math.max(0, Math.min(1.5, o.actualValue / o.targetValue)) : 0;
  const ratio = elapsed > 0 ? progress / elapsed : 1;
  let label: "À temps" | "En avance" | "En retard" | "Atteint";
  let tone: "success" | "primary" | "warning" | "danger";
  if (progress >= 1) {
    label = "Atteint";
    tone = "success";
  } else if (ratio >= 1.05) {
    label = "En avance";
    tone = "primary";
  } else if (ratio >= 0.85) {
    label = "À temps";
    tone = "success";
  } else if (ratio >= 0.6) {
    label = "En retard";
    tone = "warning";
  } else {
    label = "En retard";
    tone = "danger";
  }
  return { progress, elapsed, ratio, label, tone };
}
