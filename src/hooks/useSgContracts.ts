"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ContractPhase,
  ContractingAuthorityType,
  GuaranteeStatus,
  GuaranteeType,
  LegalContractStatus,
  MarketAmendmentStatus,
  MarketContractStatus,
} from "@prisma/client";

export interface ContractListRow {
  id: string;
  reference: string;
  title: string;
  contractingAuthority: string;
  authorityType: ContractingAuthorityType;
  amountHT: number;
  currency: string;
  phase: ContractPhase;
  status: MarketContractStatus;
  legalStatus: LegalContractStatus;
  signatureDate: string | null;
  executionStartDate: string | null;
  gpaEndDate: string | null;
  siteName: string | null;
  siteCode: string | null;
  guaranteesActive: number;
  guaranteesTotal: number;
  guaranteesBanks: string[];
}

export interface CallForTenderCard {
  id: string;
  reference: string;
  title: string;
  contractingAuthority: string;
  amountHT: number;
  phase: ContractPhase;
  callForTendersCloseDate: string | null;
  daysToClose: number | null;
}

export interface SgContractsResponse {
  counts: { total: number; active: number; submission: number; closed: number };
  kpis: {
    activeContracts: number;
    portfolioValue: number;
    openCallsForTenders: number;
    successRateYtd: number;
    successRateAttempts: number;
    guaranteesTotal: number;
  };
  items: ContractListRow[];
  callsForTenders: CallForTenderCard[];
}

export interface SgContractsFilters {
  q?: string;
  phase?: ContractPhase | "ACTIVE" | "SUBMISSION" | "CLOSED";
  moaType?: ContractingAuthorityType;
  minAmount?: number;
  year?: number;
}

export function useSgContracts(filters: SgContractsFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.phase) qs.set("phase", filters.phase);
  if (filters.moaType) qs.set("moaType", filters.moaType);
  if (filters.minAmount) qs.set("minAmount", String(filters.minAmount));
  if (filters.year) qs.set("year", String(filters.year));

  return useQuery({
    queryKey: ["sg", "contracts", filters],
    queryFn: async (): Promise<SgContractsResponse> => {
      const res = await fetch(`/api/sg/contracts?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface AmendmentDetail {
  id: string;
  amendmentNumber: number;
  reason: string;
  additionalAmount: number;
  additionalDelayDays: number | null;
  submittedAt: string | null;
  approvedAt: string | null;
  signedAt: string | null;
  status: MarketAmendmentStatus;
}

export interface BankGuaranteeDetail {
  id: string;
  type: GuaranteeType;
  amount: number;
  issuingBank: string;
  issuedAt: string;
  expiryDate: string;
  releaseDate: string | null;
  status: GuaranteeStatus;
}

export interface ContractDetail {
  id: string;
  reference: string;
  title: string;
  contractingAuthority: string;
  authorityType: ContractingAuthorityType;
  amountHT: number;
  currency: string;
  vatRate: number;
  phase: ContractPhase;
  status: MarketContractStatus;
  legalStatus: LegalContractStatus;
  callForTendersOpenDate: string | null;
  callForTendersCloseDate: string | null;
  submissionDate: string | null;
  notificationDate: string | null;
  signatureDate: string | null;
  orderServiceDate: string | null;
  executionStartDate: string | null;
  receptionPV: string | null;
  gpaEndDate: string | null;
  site: { id: string; code: string; name: string; status: string; manager: string | null } | null;
  amendments: AmendmentDetail[];
  bankGuarantees: BankGuaranteeDetail[];
  legalCases: Array<{ id: string; reference: string; title: string; status: string; amountAtStake: number }>;
}

export function useContractDetail(id: string | null) {
  return useQuery({
    queryKey: ["sg", "contract-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ContractDetail> => {
      const res = await fetch(`/api/sg/contracts/${id}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["sg", "contracts"] });
  if (id) qc.invalidateQueries({ queryKey: ["sg", "contract-detail", id] });
}

export interface CreateContractPayload {
  reference: string;
  title: string;
  contractingAuthority: string;
  authorityType: ContractingAuthorityType;
  amountHT: number;
  phase?: ContractPhase;
  callForTendersCloseDate?: string;
  submissionDate?: string;
  siteId?: string | null;
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      const res = await fetch("/api/sg/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useTransitionPhase(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { targetPhase: ContractPhase; reason?: string; date?: string }) => {
      const res = await fetch(`/api/sg/contracts/${contractId}/transition-phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => invalidate(qc, contractId),
  });
}

export function useCreateAmendment(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reason: string; additionalAmount: number; additionalDelayDays?: number }) => {
      const res = await fetch(`/api/sg/contracts/${contractId}/amendments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: string; amendmentNumber: number }>;
    },
    onSuccess: () => invalidate(qc, contractId),
  });
}

export function useCreateGuarantee(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: GuaranteeType;
      amount: number;
      issuingBank: string;
      issuedAt: string;
      expiryDate: string;
    }) => {
      const res = await fetch(`/api/sg/contracts/${contractId}/guarantees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => invalidate(qc, contractId),
  });
}

export function useReleaseGuarantee(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { guaranteeId: string; releaseDate?: string }) => {
      const res = await fetch(`/api/sg/contracts/${contractId}/guarantees/${payload.guaranteeId}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ releaseDate: payload.releaseDate }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => invalidate(qc, contractId),
  });
}
