"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface RhSignatureConfig {
  authorizedDocs: string[];
  delegates: Array<{ id: string; userId: string; name: string; scope: string; until: string }>;
  availableDocTypes: ReadonlyArray<{ key: string; label: string }>;
}

export interface RhAlertConfig {
  medicalVisitDaysBefore: number;
  trainingRecycleDaysBefore: number;
  cddEndingDaysBefore: number;
  leaveAccumulationThreshold: number;
  payrollInputDeadlineDays: number;
  channels: string[];
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useRhSignature() {
  return useQuery({
    queryKey: ["rh", "profile", "signature"],
    queryFn: () => getJson<RhSignatureConfig>("/api/rh/profile/signature"),
  });
}

export function useUpdateRhSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<RhSignatureConfig, "authorizedDocs" | "delegates">>) =>
      getJson(`/api/rh/profile/signature`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "profile", "signature"] }),
  });
}

export function useRhAlerts() {
  return useQuery({
    queryKey: ["rh", "profile", "alerts"],
    queryFn: () => getJson<RhAlertConfig>("/api/rh/profile/alerts"),
  });
}

export function useUpdateRhAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<RhAlertConfig>) =>
      getJson(`/api/rh/profile/alerts`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "profile", "alerts"] }),
  });
}
