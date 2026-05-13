"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CorrespondenceConfidentiality,
  CorrespondenceDirection,
  CorrespondenceStatus,
  Role,
} from "@prisma/client";

export interface CorrespondenceListItem {
  id: string;
  reference: string;
  direction: CorrespondenceDirection;
  date: string;
  correspondentName: string;
  correspondentEntity: string | null;
  subject: string;
  summary: string | null;
  confidentiality: CorrespondenceConfidentiality;
  status: CorrespondenceStatus;
  dueDate: string | null;
  handledAt: string | null;
  requiresDgSignature: boolean;
  submittedToDgAt: string | null;
  signedByDgAt: string | null;
  documentUrl: string | null;
  archivedInGedAt: string | null;
  assignedTo: { id: string; fullName: string; role: Role } | null;
}

export interface CorrespondencesListResponse {
  items: CorrespondenceListItem[];
  counts: {
    incomingMonth: number;
    outgoingMonth: number;
    awaitingDg: number;
    handledYtd: number;
    drafts: number;
    archived: number;
    total: number;
  };
}

export interface CorrespondencesFilters {
  direction?: CorrespondenceDirection;
  status?: CorrespondenceStatus | "DRAFTS" | "AWAITING_DG";
  date_from?: string;
  date_to?: string;
  q?: string;
}

export function useCorrespondences(filters: CorrespondencesFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.direction) qs.set("direction", filters.direction);
  if (filters.status) qs.set("status", filters.status);
  if (filters.date_from) qs.set("date_from", filters.date_from);
  if (filters.date_to) qs.set("date_to", filters.date_to);
  if (filters.q) qs.set("q", filters.q);
  return useQuery({
    queryKey: ["sg", "correspondences", filters],
    queryFn: async (): Promise<CorrespondencesListResponse> => {
      const r = await fetch(`/api/sg/correspondences?${qs.toString()}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur courriers");
      return r.json();
    },
  });
}

export interface CorrespondenceDetail extends CorrespondenceListItem {
  dgSignatureRef: string | null;
  timeline: Array<{ at: string; label: string; actor?: string }>;
}

export function useCorrespondenceDetail(id: string | null) {
  return useQuery({
    queryKey: ["sg", "correspondence-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<CorrespondenceDetail> => {
      const r = await fetch(`/api/sg/correspondences/${id}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur courrier");
      return r.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["sg", "correspondences"] });
  qc.invalidateQueries({ queryKey: ["sg", "correspondences-analytics"] });
  if (id) qc.invalidateQueries({ queryKey: ["sg", "correspondence-detail", id] });
}

export interface CreateCorrespondencePayload {
  direction: CorrespondenceDirection;
  date?: string;
  correspondentName: string;
  correspondentEntity?: string;
  subject: string;
  summary?: string;
  confidentiality?: CorrespondenceConfidentiality;
  assignedToRole?: Role;
  dueInDays?: number;
  requiresDgSignature?: boolean;
  documentUrl?: string;
}

export function useCreateCorrespondence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCorrespondencePayload) => {
      const r = await fetch("/api/sg/correspondences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ id: string; reference: string }>;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCorrespondence(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<{
      subject: string;
      summary: string;
      confidentiality: CorrespondenceConfidentiality;
      documentUrl: string;
      requiresDgSignature: boolean;
      dueDate: string | null;
      assignedToRole: Role | null;
      status: CorrespondenceStatus;
    }>) => {
      const r = await fetch(`/api/sg/correspondences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => invalidate(qc, id),
  });
}

function workflowAction(action: "submit-to-dg" | "sign" | "send" | "archive") {
  return function useAction(id: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (payload?: { signatureRef?: string; comment?: string }) => {
        const r = await fetch(`/api/sg/correspondences/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: payload ? JSON.stringify(payload) : "{}",
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      },
      onSuccess: () => invalidate(qc, id),
    });
  };
}

export const useSubmitToDg = workflowAction("submit-to-dg");
export const useSignCorrespondence = workflowAction("sign");
export const useSendCorrespondence = workflowAction("send");
export const useArchiveCorrespondence = workflowAction("archive");

export interface AnalyticsResponse {
  month: string;
  totalThisMonth: number;
  byAdmin: Array<{ id: string; label: string; count: number }>;
  breakdown: { incoming: number; outgoing: number };
}

export function useCorrespondencesAnalytics() {
  return useQuery({
    queryKey: ["sg", "correspondences-analytics"],
    queryFn: async (): Promise<AnalyticsResponse> => {
      const r = await fetch("/api/sg/correspondences/analytics", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur analytics");
      return r.json();
    },
  });
}
