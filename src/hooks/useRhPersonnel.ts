"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PersonnelRow {
  id: string;
  matricule: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  position: string;
  category: string;
  contractType: string;
  site: string;
  region: string | null;
  hireDate: string;
  cnpsNumber: string | null;
  isSynthetic: boolean;
}

export interface PersonnelList {
  items: PersonnelRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  facets: {
    categories: string[];
    sites: string[];
    contracts: string[];
    statuses: string[];
  };
}

export interface PersonnelFiche extends PersonnelRow {
  avatarUrl: string | null;
  professionalCategory: string | null;
  echelon: string | null;
  classCategory: string | null;
  indiceSalarial: number | null;
  coefficientSalarial: number | null;
  baseSalary: number | null;
  salaryGrade: string | null;
  department: string | null;
  familyStatus: string | null;
  cnpsCardNumber: string | null;
  niu: string | null;
  bankName: string | null;
  bankAgency: string | null;
  rib: string | null;
  profile: {
    identityCard: string | null;
    familyStatus: string | null;
    childrenCount: number;
    address: { city?: string; neighborhood?: string; line1?: string } | null;
    emergencyContact: { name?: string; phone?: string | null; relation?: string } | null;
    bankAccount: { bank?: string; iban?: string; swift?: string } | null;
  } | null;
  documents: Array<{ id: string; type: string; title: string; fileUrl: string; uploadedAt: string }>;
}

export interface PersonnelClassificationPatch {
  avatarUrl?: string | null;
  professionalCategory?: string | null;
  echelon?: string | null;
  classCategory?: string | null;
  indiceSalarial?: number | null;
  coefficientSalarial?: number | null;
  baseSalary?: number | null;
  salaryGrade?: string | null;
  // Si baseSalary modifié, ces 2 champs précisent la raison/note
  salaryChangeReason?: "HIRING" | "ANNUAL_REVIEW" | "PROMOTION" | "NEGOTIATION" | "CCM_ADJUSTMENT" | "CORRECTION" | "OTHER";
  salaryChangeNotes?: string;
  department?: string | null;
  familyStatus?: string | null;
  cnpsNumber?: string | null;
  cnpsCardNumber?: string | null;
  niu?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  rib?: string | null;
}

export function usePersonnel(filters: {
  search?: string;
  status?: string;
  category?: string;
  site?: string;
  contract?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("search", filters.search);
  if (filters.status) sp.set("status", filters.status);
  if (filters.category) sp.set("category", filters.category);
  if (filters.site) sp.set("site", filters.site);
  if (filters.contract) sp.set("contract", filters.contract);
  sp.set("page", String(filters.page ?? 1));
  sp.set("limit", String(filters.limit ?? 8));

  return useQuery({
    queryKey: ["rh", "personnel", filters],
    queryFn: async (): Promise<PersonnelList> => {
      const res = await fetch(`/api/rh/personnel?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });
}

export function usePersonnelFiche(id: string | null) {
  return useQuery({
    queryKey: ["rh", "personnel", "fiche", id],
    queryFn: async (): Promise<PersonnelFiche> => {
      const res = await fetch(`/api/rh/personnel/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export interface SalaryHistoryItem {
  id: string;
  effectiveAt: string;
  baseSalary: number;
  previousBase: number | null;
  variation: number | null;
  reason: string;
  reasonLabel: string;
  notes: string | null;
  decidedBy: string | null;
  createdAt: string;
}

export function useSalaryHistory(id: string | null) {
  return useQuery({
    queryKey: ["rh", "personnel", "salary-history", id],
    queryFn: async (): Promise<{ items: SalaryHistoryItem[] }> => {
      const res = await fetch(`/api/rh/personnel/${id}/salary-history`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(id) && !id?.startsWith("syn_"),
  });
}

export function useUpdatePersonnelClassification(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: PersonnelClassificationPatch) => {
      const res = await fetch(`/api/rh/personnel/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rh", "personnel", "fiche", id] });
      qc.invalidateQueries({ queryKey: ["rh", "personnel"] });
      // Si une révision salariale a eu lieu, on recharge aussi l'historique
      qc.invalidateQueries({ queryKey: ["rh", "personnel", "salary-history", id] });
    },
  });
}
