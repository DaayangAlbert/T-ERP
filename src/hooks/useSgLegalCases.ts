"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ContractingAuthorityType,
  LegalCaseStatus,
  LegalPosition,
} from "@prisma/client";

export type UrgencyTone = "rose" | "amber" | "violet" | "slate";

export interface LegalCaseListItem {
  id: string;
  reference: string;
  title: string;
  ourPosition: LegalPosition;
  jurisdiction: string;
  opposingParty: string;
  opposingPartyType: ContractingAuthorityType | null;
  amountAtStake: number;
  provisionAmount: number;
  lawyerName: string;
  lawFirm: string;
  status: LegalCaseStatus;
  nextHearingDate: string | null;
  daysToHearing: number | null;
  openedAt: string;
  closedAt: string | null;
  relatedContract: { id: string; reference: string; title: string } | null;
  urgencyTone: UrgencyTone;
}

export interface LegalCasesListResponse {
  kpis: {
    activeCount: number;
    provisionTotal: number;
    amountAtStakeTotal: number;
    hearingsSoon: number;
    closedYtd: number;
    wonYtd: number;
  };
  items: LegalCaseListItem[];
}

export interface LegalCaseEventEntry {
  id: string;
  eventType: string;
  eventDate: string;
  description: string;
  documentUrl: string | null;
  createdAt: string;
}

export interface LegalCaseDetail extends LegalCaseListItem {
  description: string;
  caseNumber: string | null;
  lawyerContactInfo: any;
  strategy: string | null;
  resolution: string | null;
  events: LegalCaseEventEntry[];
}

export interface LegalCasesFilters {
  status?: "OPEN" | "CLOSED" | LegalCaseStatus;
  jurisdiction?: string;
  q?: string;
}

export function useSgLegalCases(filters: LegalCasesFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.jurisdiction) qs.set("jurisdiction", filters.jurisdiction);
  if (filters.q) qs.set("q", filters.q);

  return useQuery({
    queryKey: ["sg", "legal-cases", filters],
    queryFn: async (): Promise<LegalCasesListResponse> => {
      const r = await fetch(`/api/sg/legal-cases?${qs.toString()}`, { credentials: "same-origin" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
  });
}

export function useLegalCaseDetail(id: string | null) {
  return useQuery({
    queryKey: ["sg", "legal-case-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<LegalCaseDetail> => {
      const r = await fetch(`/api/sg/legal-cases/${id}`, { credentials: "same-origin" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["sg", "legal-cases"] });
  qc.invalidateQueries({ queryKey: ["sg", "hearings-calendar"] });
  qc.invalidateQueries({ queryKey: ["sg", "lawyers"] });
  if (id) qc.invalidateQueries({ queryKey: ["sg", "legal-case-detail", id] });
}

export interface CreateLegalCasePayload {
  reference: string;
  title: string;
  description: string;
  ourPosition: LegalPosition;
  jurisdiction: string;
  caseNumber?: string;
  opposingParty: string;
  opposingPartyType?: ContractingAuthorityType;
  amountAtStake: number;
  provisionAmount: number;
  lawyerName: string;
  lawFirm: string;
  strategy?: string;
  relatedContractId?: string | null;
  nextHearingDate?: string;
}

export function useCreateLegalCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLegalCasePayload) => {
      const r = await fetch("/api/sg/legal-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ id: string }>;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAddLegalCaseEvent(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      eventType: string;
      eventDate?: string;
      description: string;
      documentUrl?: string;
    }) => {
      const r = await fetch(`/api/sg/legal-cases/${caseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ id: string; eventDate: string }>;
    },
    onSuccess: () => invalidate(qc, caseId),
  });
}

export function useAdjustProvision(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { newAmount: number; reason: string; validatedByDafName?: string }) => {
      const r = await fetch(`/api/sg/legal-cases/${caseId}/provision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; oldAmount: number; newAmount: number; delta: number }>;
    },
    onSuccess: () => invalidate(qc, caseId),
  });
}

export function useCloseLegalCase(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      resolution: string;
      finalStatus: "SETTLED" | "WON" | "LOST" | "ABANDONED";
      finalProvisionRelease: boolean;
    }) => {
      const r = await fetch(`/api/sg/legal-cases/${caseId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; status: string; provisionReleased: number }>;
    },
    onSuccess: () => invalidate(qc, caseId),
  });
}

export function useUpdateLegalCase(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title?: string;
      description?: string;
      jurisdiction?: string;
      caseNumber?: string | null;
      opposingParty?: string;
      status?: LegalCaseStatus;
      nextHearingDate?: string | null;
      strategy?: string;
      lawyerName?: string;
      lawFirm?: string;
    }) => {
      const r = await fetch(`/api/sg/legal-cases/${caseId}`, {
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
    onSuccess: () => invalidate(qc, caseId),
  });
}

export interface HearingItem {
  caseId: string;
  reference: string;
  title: string;
  jurisdiction: string;
  opposingParty: string;
  ourPosition: LegalPosition;
  lawyerName: string;
  lawFirm: string;
  hearingDate: string;
  daysAway: number;
  amountAtStake: number;
  provisionAmount: number;
  status: LegalCaseStatus;
  notify: "J-1" | "J-7" | "J-30" | null;
}

export function useHearingsCalendar() {
  return useQuery({
    queryKey: ["sg", "hearings-calendar"],
    queryFn: async (): Promise<{
      items: HearingItem[];
      counts: { total: number; within7d: number; within30d: number };
    }> => {
      const r = await fetch("/api/sg/legal-cases/calendar", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur calendrier audiences");
      return r.json();
    },
  });
}

export interface LawyerEntry {
  lawyerName: string;
  lawFirm: string;
  contactInfo: any;
  activeCases: number;
  totalCases: number;
  totalAtStake: number;
}

export function useLawyers() {
  return useQuery({
    queryKey: ["sg", "lawyers"],
    queryFn: async (): Promise<{ items: LawyerEntry[] }> => {
      const r = await fetch("/api/sg/lawyers", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur annuaire avocats");
      return r.json();
    },
  });
}
