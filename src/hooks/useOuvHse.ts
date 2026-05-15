"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OuvHseType, OuvHseSeverity, OuvHseReportInput } from "@/schemas/ouv-hse";

export interface HseReportItem {
  id: string;
  type: OuvHseType;
  typeLabel: string;
  typeEmoji: string;
  severity: OuvHseSeverity;
  title: string;
  description: string;
  locationDetail: string | null;
  photosCount: number;
  status: "OPEN" | "INVESTIGATING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  isAnonymous: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  assignedToName: string | null;
  assignedToRole: string | null;
  reportedToCnps: boolean;
  reportedToCnpsAt: string | null;
  createdAt: string;
}

export interface EmergencyContact {
  fullName: string;
  phone: string | null;
  phoneE164: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
}

export interface EmergencyContacts {
  nationalEmergencies: Array<{ label: string; number: string; telUrl: string }>;
  siteManager: EmergencyContact | null;
  worksDirector: EmergencyContact | null;
}

export function useHseReports() {
  return useQuery<{ reports: HseReportItem[] }>({
    queryKey: ["ouv", "hse", "reports"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/hse/reports/mine", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture signalements impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useEmergencyContacts() {
  return useQuery<EmergencyContacts>({
    queryKey: ["ouv", "hse", "emergency-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/hse/emergency-contacts", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture contacts urgence impossible");
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

export function useReportHse() {
  const qc = useQueryClient();
  return useMutation<
    {
      report: {
        id: string;
        type: string;
        typeLabel: string;
        severity: string;
        status: string;
        createdAt: string;
      };
      cnpsDeclarationRequired: boolean;
      message: string;
    },
    Error,
    OuvHseReportInput
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/hse/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Signalement refusé");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "hse"] }),
  });
}

export function useAddHseInfo() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string; additionalInfo: string }>({
    mutationFn: async ({ id, additionalInfo }) => {
      const res = await fetch(`/api/ouv/hse/reports/${id}/add-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalInfo }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Ajout refusé");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "hse"] }),
  });
}

export function useAddHsePhotos() {
  const qc = useQueryClient();
  return useMutation<
    { ok: true; totalPhotos: number; droppedOverflow: number },
    Error,
    { id: string; photos: string[] }
  >({
    mutationFn: async ({ id, photos }) => {
      const res = await fetch(`/api/ouv/hse/reports/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Upload refusé");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "hse"] }),
  });
}
