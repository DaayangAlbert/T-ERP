"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ContractType = "CDI" | "CDD" | "STAGE" | "JOURNALIER" | "PRESTATAIRE";
export type ContractStatus =
  | "DRAFT"
  | "PENDING_SIGNATURE"
  | "SIGNED"
  | "ACTIVE"
  | "TERMINATED"
  | "CANCELLED";

export interface ContractListItem {
  id: string;
  reference: string;
  type: ContractType;
  status: ContractStatus;
  jobTitle: string;
  baseSalary: number;
  startDate: string;
  endDate: string | null;
  pdfUrl: string | null;
  employerSignedAt: string | null;
  employeeSignedAt: string | null;
  createdAt: string;
  employee: { id: string; fullName: string; matricule: string | null; avatarUrl: string | null };
  draftedBy: string | null;
}

export interface ContractDetail extends Omit<ContractListItem, "employee"> {
  professionalCategory: string | null;
  trialPeriodDays: number | null;
  workLocation: string | null;
  workingHours: string | null;
  benefits: string[];
  customClauses: Array<{ title: string; body: string }>;
  internshipSchool: string | null;
  internshipTutor: string | null;
  providerCompanyName: string | null;
  providerRccm: string | null;
  providerNiu: string | null;
  dailyRate: number | null;
  cdiMotive: string | null;
  notes: string | null;
  employerSignatureText: string | null;
  employeeSignatureText: string | null;
  archivedDocumentId: string | null;
  updatedAt: string;
  employee: {
    id: string;
    fullName: string;
    firstName: string;
    lastName: string;
    matricule: string | null;
    avatarUrl: string | null;
    email: string | null;
    phone: string | null;
    cnpsNumber: string | null;
    niu: string | null;
    hireDate: string | null;
    identityCard: string | null;
    address: { city?: string; neighborhood?: string; line1?: string } | null;
    familyStatus: string | null;
  };
  employerSigner: string | null;
}

export interface CreateContractPayload {
  userId: string;
  type: ContractType;
  jobTitle: string;
  professionalCategory?: string | null;
  baseSalary: number;
  trialPeriodDays?: number;
  startDate: string;
  endDate?: string | null;
  workLocation?: string | null;
  workingHours?: string;
  benefits?: string[];
  customClauses?: Array<{ title: string; body: string }>;
  internshipSchool?: string | null;
  internshipTutor?: string | null;
  providerCompanyName?: string | null;
  providerRccm?: string | null;
  providerNiu?: string | null;
  dailyRate?: number | null;
  cdiMotive?: string | null;
  notes?: string | null;
}

export function useContracts(filters: { userId?: string; status?: string; type?: string; search?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.userId) sp.set("userId", filters.userId);
  if (filters.status) sp.set("status", filters.status);
  if (filters.type) sp.set("type", filters.type);
  if (filters.search) sp.set("search", filters.search);
  return useQuery({
    queryKey: ["rh", "contracts", filters],
    queryFn: async (): Promise<{ items: ContractListItem[] }> => {
      const res = await fetch(`/api/rh/contracts?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: ["rh", "contracts", "detail", id],
    queryFn: async (): Promise<ContractDetail> => {
      const res = await fetch(`/api/rh/contracts/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContractPayload): Promise<{ id: string; reference: string }> => {
      const res = await fetch("/api/rh/contracts", {
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
      qc.invalidateQueries({ queryKey: ["rh", "contracts"] });
    },
  });
}

type ContractAction =
  | { action: "update"; [k: string]: unknown }
  | { action: "generate-pdf"; pdfUrl: string }
  | { action: "sign-employer"; signatureText: string }
  | { action: "sign-employee"; signatureText: string }
  | { action: "cancel" }
  | { action: "terminate"; reason?: string };

export function useUpdateContract(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ContractAction) => {
      const res = await fetch(`/api/rh/contracts/${id}`, {
        method: "PATCH",
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
      qc.invalidateQueries({ queryKey: ["rh", "contracts"] });
      qc.invalidateQueries({ queryKey: ["rh", "contracts", "detail", id] });
    },
  });
}

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  CDI: "CDI · Durée indéterminée",
  CDD: "CDD · Durée déterminée",
  STAGE: "Convention de stage",
  JOURNALIER: "Contrat journalier",
  PRESTATAIRE: "Prestation de services",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, { label: string; tone: string }> = {
  DRAFT: { label: "Brouillon", tone: "bg-slate-100 text-slate-700" },
  PENDING_SIGNATURE: { label: "Attente signature", tone: "bg-amber-100 text-amber-800" },
  SIGNED: { label: "Signé", tone: "bg-emerald-100 text-emerald-800" },
  ACTIVE: { label: "En vigueur", tone: "bg-emerald-100 text-emerald-800" },
  TERMINATED: { label: "Résilié", tone: "bg-rose-100 text-rose-800" },
  CANCELLED: { label: "Annulé", tone: "bg-slate-100 text-slate-500" },
};
