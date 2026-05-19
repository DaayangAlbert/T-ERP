"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PayrollCycleSummary {
  id: string;
  period: string;
  status: string;
  startedAt: string;
  calculatedAt: string | null;
  n1ValidatedAt: string | null;
  n2ValidatedAt: string | null;
  n3ValidatedAt: string | null;
  paidAt: string | null;
  totalBulletins: number;
  kpis: {
    totalBulletins: number;
    inputsSaved: number;
    journaliersTotal: number;
    overtimeHours: number;
    advancesCount: number;
  };
}

export interface PayrollInputRow {
  employeeKey: string;
  matricule: string;
  firstName: string;
  lastName: string;
  site: string;
  category: string;
  dailyRate: number;
  daysWorked: number;
  overtimeHours: number;
  primaryBonus: number;
  advances: string;
  totalGross: number;
  isSynthetic: boolean;
  savedAt: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useCurrentPayrollCycle() {
  return useQuery({
    queryKey: ["rh", "payroll", "current-cycle"],
    queryFn: () => getJson<PayrollCycleSummary>("/api/rh/payroll/current-cycle"),
  });
}

export function useCycleInputs(cycleId: string | null, category: string, search: string) {
  return useQuery({
    queryKey: ["rh", "payroll", "inputs", cycleId, category, search],
    queryFn: () =>
      getJson<{
        cycleId: string;
        cyclePeriod: string;
        cycleStatus: string;
        category: string;
        items: PayrollInputRow[];
        totalInPool: number;
      }>(`/api/rh/payroll/cycles/${cycleId}/inputs?category=${encodeURIComponent(category)}&search=${encodeURIComponent(search)}`),
    enabled: Boolean(cycleId),
    placeholderData: (prev) => prev,
  });
}

export function useSaveInput(cycleId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeKey, ...patch }: { employeeKey: string; daysWorked?: number; overtimeHours?: number; primaryBonus?: number; advances?: string; category?: string }) =>
      getJson(`/api/rh/payroll/cycles/${cycleId}/inputs/${employeeKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rh", "payroll", "inputs", cycleId] });
      qc.invalidateQueries({ queryKey: ["rh", "payroll", "current-cycle"] });
    },
  });
}

export function useCalculatePayroll(cycleId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/rh/payroll/cycles/${cycleId}/calculate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "payroll"] }),
  });
}

export function useValidateN1(cycleId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/rh/payroll/cycles/${cycleId}/validate-n1`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "payroll"] }),
  });
}
