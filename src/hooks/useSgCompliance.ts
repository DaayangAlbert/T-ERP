"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RegisterStatus, RegisterType } from "@prisma/client";

export type Severity = "rose" | "amber" | "violet" | "emerald";
export type DeadlineCategory =
  | "REGISTER_REVIEW"
  | "APPROVAL_RENEWAL"
  | "GOVERNANCE_AG"
  | "GOVERNANCE_BOARD"
  | "BANK_GUARANTEE";

export interface ComplianceDeadline {
  id: string;
  category: DeadlineCategory;
  label: string;
  detail: string;
  dueDate: string;
  daysAway: number;
  severity: "rose" | "amber" | "violet";
}

export interface ComplianceDashboardResponse {
  complianceScore: number;
  counts: {
    registers: number;
    registersUpToDate: number;
    registersToUpdate: number;
    registersOverdue: number;
    approvalsValid: number;
    approvalsExpiring: number;
    approvalsExpired: number;
    approvalsTotal: number;
    deadlines90d: number;
    deadlinesUrgent: number;
  };
  deadlines: ComplianceDeadline[];
}

export function useComplianceDashboard() {
  return useQuery({
    queryKey: ["sg", "compliance", "dashboard"],
    queryFn: async (): Promise<ComplianceDashboardResponse> => {
      const r = await fetch("/api/sg/compliance/dashboard", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur dashboard conformité");
      return r.json();
    },
  });
}

export interface RegisterListItem {
  id: string;
  registerType: RegisterType;
  name: string;
  description: string | null;
  legalBasis: string;
  status: RegisterStatus;
  entriesCount: number;
  lastEntryDate: string | null;
  nextReviewDate: string;
  daysToReview: number;
  responsible: { id: string; fullName: string; role: string };
  severity: "rose" | "amber" | "emerald";
}

export function useRegisters() {
  return useQuery({
    queryKey: ["sg", "compliance", "registers"],
    queryFn: async (): Promise<{
      items: RegisterListItem[];
      counts: { total: number; upToDate: number; toUpdate: number; overdue: number };
    }> => {
      const r = await fetch("/api/sg/compliance/registers", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur chargement registres");
      return r.json();
    },
  });
}

export interface RegisterDetail extends RegisterListItem {
  recentEntries: Array<{ date: string; label: string; ref?: string }>;
}

export function useRegisterDetail(id: string | null) {
  return useQuery({
    queryKey: ["sg", "compliance", "register-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<RegisterDetail> => {
      const r = await fetch(`/api/sg/compliance/registers/${id}`, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur registre");
      return r.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["sg", "compliance"] });
  if (id) qc.invalidateQueries({ queryKey: ["sg", "compliance", "register-detail", id] });
}

export function useAuditRegister(registerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      newStatus: "UP_TO_DATE" | "TO_UPDATE" | "OVERDUE";
      notes?: string;
      nextReviewInDays?: number;
    }) => {
      const r = await fetch(`/api/sg/compliance/registers/${registerId}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; nextReviewDate: string }>;
    },
    onSuccess: () => invalidate(qc, registerId),
  });
}

export function useAddRegisterEntry(registerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { label: string; description?: string }) => {
      const r = await fetch(`/api/sg/compliance/registers/${registerId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; newEntriesCount: number; label: string }>;
    },
    onSuccess: () => invalidate(qc, registerId),
  });
}
