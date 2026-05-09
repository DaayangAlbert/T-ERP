"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PayrollCycleStatus } from "@prisma/client";

interface CycleResponse {
  id: string;
  period: string;
  status: PayrollCycleStatus;
  totalBulletins: number;
  grossAmount: string;
  employerCharges: string;
  netToPay: string;
  startedAt: string;
  calculatedAt: string | null;
  n1ValidatedAt: string | null;
  n2ValidatedAt: string | null;
  n3ValidatedAt: string | null;
  paidAt: string | null;
  dipeSubmittedAt: string | null;
  warnings: Array<{ severity: "OK" | "WARNING" | "INFO"; type: string; message: string; count?: number }>;
  massHistory: Array<{ period: string; gross: number }>;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useCurrentPayrollCycle() {
  return useQuery({
    queryKey: ["daf", "payroll", "current"],
    queryFn: () => getJson<CycleResponse>(`/api/daf/payroll/current`),
  });
}

export function useValidatePayrollN2(period: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/daf/payroll/${period}/validate-n2`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "payroll"] }),
  });
}
