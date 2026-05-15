"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type EpiType =
  | "HELMET"
  | "HIGH_VIS_VEST"
  | "SAFETY_GLASSES"
  | "GLOVES"
  | "SAFETY_SHOES"
  | "HARNESS"
  | "DUST_MASK"
  | "EAR_PROTECTION";

export type EpiStatus = "OK" | "WORN_OUT" | "DEFECTIVE" | "REPLACED" | "LOST";

export interface EpiItem {
  id: string;
  epiType: EpiType;
  name: string;
  serialNumber: string | null;
  assignedAt: string;
  expectedReplacementAt: string | null;
  status: EpiStatus;
  replacementReason: string | null;
  needsReplacementSoon: boolean;
  isOverdue: boolean;
}

export function useOuvEpi() {
  return useQuery<{ items: EpiItem[] }>({
    queryKey: ["ouv", "epi"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/epi/mine", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture EPI impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function useRequestEpiReplacement() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; message: string }, Error, { epiId: string; reason: string }>({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/epi/replacement-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Demande refusée");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "epi"] }),
  });
}

export function epiEmoji(type: EpiType): string {
  switch (type) {
    case "HELMET":
      return "⛑";
    case "HIGH_VIS_VEST":
      return "🦺";
    case "SAFETY_GLASSES":
      return "👁";
    case "GLOVES":
      return "🧤";
    case "SAFETY_SHOES":
      return "👟";
    case "HARNESS":
      return "🪢";
    case "DUST_MASK":
      return "😷";
    case "EAR_PROTECTION":
      return "🎧";
  }
}
