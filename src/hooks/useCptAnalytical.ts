"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface ProjectAccountItem {
  id: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  client: string;
  siteStatus: string;
  bankAccountId: string | null;
  bankLabel: string | null;
  balance: string;
  debt: string;
  isActive: boolean;
  closedAt: string | null;
}

export interface ProjectMovement {
  id: string;
  type: string;
  typeLabel: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  reason: string;
  reference: string | null;
  balanceAfter: string;
  occurredAt: string;
}

export interface ProjectAccountDetail extends Omit<ProjectAccountItem, "siteCode" | "siteName"> {
  siteCode: string;
  siteName: string;
  movements: ProjectMovement[];
}

interface ProjectAccountsResponse {
  items: ProjectAccountItem[];
  summary: { count: number; totalBalance: string };
  canManage: boolean;
}

export interface SalaryMovement {
  id: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  reason: string;
  reference: string | null;
  siteId: string | null;
  balanceAfter: string;
  occurredAt: string;
}

interface SalaryAccountResponse {
  id: string;
  bankAccountId: string | null;
  bankLabel: string | null;
  balance: string;
  movements: SalaryMovement[];
  canManage: boolean;
}

export interface OverheadBasisLine {
  accountId: string;
  siteId: string;
  code: string;
  name: string;
  marketAmount: string;
  weight: number;
  share: string;
}

export interface OverheadRun {
  id: string;
  period: string;
  totalAmount: string;
  status: "PENDING" | "APPLIED" | "CANCELLED";
  basis: { totalMarket: string; lines: OverheadBasisLine[] } | null;
  executedAt: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const PA_KEY = ["cpt", "project-accounts"];
const SAL_KEY = ["cpt", "salary-account"];
const OVH_KEY = ["cpt", "overhead-runs"];

// ─── Comptes projet ────────────────────────────────────────────────────────
export function useProjectAccounts() {
  return useQuery({ queryKey: PA_KEY, queryFn: () => getJson<ProjectAccountsResponse>(`/api/finance/project-accounts`) });
}

export function useProjectAccount(id: string | null) {
  return useQuery({
    queryKey: [...PA_KEY, id],
    enabled: Boolean(id),
    queryFn: () => getJson<ProjectAccountDetail>(`/api/finance/project-accounts/${id}`),
  });
}

export function useCreateProjectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { siteId: string; bankAccountId?: string | null }) =>
      getJson<{ id: string }>(`/api/finance/project-accounts`, jsonBody("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: PA_KEY }),
  });
}

export function useUpdateProjectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; bankAccountId?: string | null; isActive?: boolean }) =>
      getJson<{ ok: true }>(`/api/finance/project-accounts/${id}`, jsonBody("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: PA_KEY }),
  });
}

export function useFundProjectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; bankAccountId: string; amount: string; reason?: string; reference?: string }) =>
      getJson<{ ok: true }>(`/api/finance/project-accounts/${id}/fund`, jsonBody("POST", data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PA_KEY });
      qc.invalidateQueries({ queryKey: ["daf", "treasury"] });
    },
  });
}

export function useProjectMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      type: string;
      amount: string;
      reason: string;
      reference?: string;
      direction?: "CREDIT" | "DEBIT";
      bankAccountId?: string;
    }) => getJson<{ ok: true }>(`/api/finance/project-accounts/${id}/movements`, jsonBody("POST", data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PA_KEY });
      qc.invalidateQueries({ queryKey: ["daf", "treasury"] });
    },
  });
}

// ─── Compte salaire ──────────────────────────────────────────────────────────
export function useSalaryAccount() {
  return useQuery({ queryKey: SAL_KEY, queryFn: () => getJson<SalaryAccountResponse>(`/api/finance/salary-account`) });
}

export function useLinkSalaryBank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bankAccountId: string | null }) =>
      getJson<{ ok: true }>(`/api/finance/salary-account`, jsonBody("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAL_KEY }),
  });
}

export function useSalaryMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { direction: "CREDIT" | "DEBIT"; amount: string; reason: string; reference?: string }) =>
      getJson<{ ok: true }>(`/api/finance/salary-account/movements`, jsonBody("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: SAL_KEY }),
  });
}

// ─── Répartition charges siège ───────────────────────────────────────────────
export function useOverheadRuns() {
  return useQuery({ queryKey: OVH_KEY, queryFn: () => getJson<{ runs: OverheadRun[] }>(`/api/finance/overhead-runs`) });
}

export function useCreateOverheadRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; totalAmount: string }) =>
      getJson<OverheadRun>(`/api/finance/overhead-runs`, jsonBody("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: OVH_KEY }),
  });
}

export function useApplyOverheadRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: true; applied: string; projects: number }>(`/api/finance/overhead-runs/${id}/apply`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: OVH_KEY });
      qc.invalidateQueries({ queryKey: PA_KEY });
      qc.invalidateQueries({ queryKey: SAL_KEY });
    },
  });
}

export function useDeleteOverheadRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson<{ ok: true }>(`/api/finance/overhead-runs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: OVH_KEY }),
  });
}
