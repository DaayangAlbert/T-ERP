"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface OvertimeRow {
  id: string;
  date: string;
  arrivalTime: string | null;
  departureTime: string | null;
  totalHours: number;
  standardHours: number;
  overtimeHours: number;
  overtimeType: "evening_125" | "night_150" | "sunday_200" | null;
  outOfGeofence: boolean;
  entrySelfieUrl: string | null;
  exitSelfieUrl: string | null;
  isSelfPointed: boolean;
  user: {
    id: string;
    fullName: string;
    matricule: string | null;
    position: string | null;
    avatarUrl: string | null;
  };
  site: { id: string; code: string; name: string } | null;
}

export interface OvertimePendingResponse {
  period: { start: string; end: string };
  pending: OvertimeRow[];
  validated: OvertimeRow[];
  totals: {
    pending: { count: number; hours: number; hours125: number; hours150: number; hours200: number };
    validated: { count: number; hours: number };
  };
}

export function useOvertimePending(period?: string) {
  const sp = new URLSearchParams();
  if (period) sp.set("period", period);
  return useQuery({
    queryKey: ["cc", "overtime", "pending", period ?? "current"],
    queryFn: async (): Promise<OvertimePendingResponse> => {
      const res = await fetch(`/api/cc/overtime/pending?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export interface OvertimeValidatePayload {
  action: "APPROVE" | "REJECT" | "MODIFY";
  overtimeHours?: number;
  overtimeType?: "evening_125" | "night_150" | "sunday_200";
  reason?: string;
}

export function useValidateOvertime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: OvertimeValidatePayload }) => {
      const res = await fetch(`/api/cc/overtime/${id}/validate`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cc", "overtime", "pending"] });
    },
  });
}

export const OVERTIME_TYPE_LABEL: Record<string, string> = {
  evening_125: "Soir (18h-22h) · +25 %",
  night_150: "Nuit (22h-6h) · +50 %",
  sunday_200: "Dimanche/férié · +100 %",
};
