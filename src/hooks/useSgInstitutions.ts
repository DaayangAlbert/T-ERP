"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApprovalStatus,
  ContractPhase,
  CorrespondenceDirection,
  CorrespondenceStatus,
  InstitutionCategory,
  InstitutionType,
  LegalCaseStatus,
  RelationshipStatus,
} from "@prisma/client";

export interface InstitutionListItem {
  id: string;
  name: string;
  type: InstitutionType;
  category: InstitutionCategory;
  primaryContactName: string | null;
  primaryContactRole: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  relationshipStatus: RelationshipStatus;
  relationshipNotes: string | null;
  website: string | null;
}

export interface InstitutionsListResponse {
  items: InstitutionListItem[];
  counts: {
    total: number;
    ministries: number;
    municipalities: number;
    associations: number;
    partners: number;
    sensitive: number;
  };
}

export interface InstitutionsFilters {
  type?: InstitutionType;
  category?: InstitutionCategory;
  status?: RelationshipStatus;
  q?: string;
}

export function useSgInstitutions(filters: InstitutionsFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.type) qs.set("type", filters.type);
  if (filters.category) qs.set("category", filters.category);
  if (filters.status) qs.set("status", filters.status);
  if (filters.q) qs.set("q", filters.q);
  return useQuery({
    queryKey: ["sg", "institutions", filters],
    queryFn: async (): Promise<InstitutionsListResponse> => {
      const r = await fetch(`/api/sg/institutions?${qs.toString()}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur institutions");
      return r.json();
    },
  });
}

export interface InstitutionDetail extends InstitutionListItem {
  address: string | null;
  history: {
    contracts: Array<{
      id: string;
      reference: string;
      title: string;
      amountHT: number;
      phase: ContractPhase;
      signatureDate: string | null;
    }>;
    cases: Array<{
      id: string;
      reference: string;
      title: string;
      status: LegalCaseStatus;
      amountAtStake: number;
    }>;
    correspondences: Array<{
      id: string;
      reference: string;
      subject: string;
      direction: CorrespondenceDirection;
      date: string;
      status: CorrespondenceStatus;
    }>;
  };
}

export function useInstitutionDetail(id: string | null) {
  return useQuery({
    queryKey: ["sg", "institution-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<InstitutionDetail> => {
      const r = await fetch(`/api/sg/institutions/${id}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur institution");
      return r.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["sg", "institutions"] });
  qc.invalidateQueries({ queryKey: ["sg", "approvals"] });
  qc.invalidateQueries({ queryKey: ["sg", "compliance"] });
  if (id) qc.invalidateQueries({ queryKey: ["sg", "institution-detail", id] });
}

export function useCreateInstitution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      type: InstitutionType;
      category: InstitutionCategory;
      primaryContactName?: string;
      primaryContactRole?: string;
      primaryContactPhone?: string;
      primaryContactEmail?: string;
      address?: string;
      website?: string;
      relationshipStatus?: RelationshipStatus;
      relationshipNotes?: string;
    }) => {
      const r = await fetch("/api/sg/institutions", {
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

export function useUpdateInstitution(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<{
      name: string;
      primaryContactName: string;
      primaryContactRole: string;
      primaryContactPhone: string;
      primaryContactEmail: string;
      address: string;
      website: string;
      relationshipStatus: RelationshipStatus;
      relationshipNotes: string;
    }>) => {
      const r = await fetch(`/api/sg/institutions/${id}`, {
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

export interface ApprovalItem {
  id: string;
  approvalName: string;
  deliveringAuthority: string;
  approvalNumber: string;
  issuedAt: string;
  expiresAt: string;
  daysToExpiry: number;
  renewable: boolean;
  status: ApprovalStatus;
  documentUrl: string | null;
  renewalReminderSent: boolean;
  severity: "rose" | "amber" | "violet" | "emerald";
}

export function useApprovals() {
  return useQuery({
    queryKey: ["sg", "approvals"],
    queryFn: async (): Promise<{
      items: ApprovalItem[];
      counts: { total: number; valid: number; expiringSoon: number; expired: number };
    }> => {
      const r = await fetch("/api/sg/approvals", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur agréments");
      return r.json();
    },
  });
}

export function useStartApprovalRenewal(approvalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      newExpiresAt: string;
      newApprovalNumber?: string;
      documentUrl?: string;
      notes?: string;
    }) => {
      const r = await fetch(`/api/sg/approvals/${approvalId}/start-renewal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; newExpiresAt: string }>;
    },
    onSuccess: () => invalidate(qc),
  });
}
