"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DafReportStatus = "DRAFT" | "SUBMITTED" | "VALIDATED" | "REJECTED";

export interface DafReportListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  status: DafReportStatus;
  author: string;
  revenueMonthXAF: string;
  cashBalanceXAF: string;
  grossMarginPercent: number;
  overdueReceivablesXAF: string;
  dso: number;
  submittedAt: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface DafReportAuthor {
  id: string;
  name: string;
  position: string | null;
}

export interface DafReportDetail extends Omit<DafReportListItem, "author"> {
  author: DafReportAuthor;

  revenueYtdXAF: string;
  revenueBudgetMonthXAF: string;
  expensesMonthXAF: string;
  grossMarginXAF: string;
  netMarginXAF: string;
  netMarginPercent: number;
  ebitdaXAF: string;
  ebitdaPercent: number;

  cashVariationXAF: string;
  creditLinesUsedXAF: string;
  creditLinesAvailableXAF: string;
  capacityAutofinancingXAF: string;

  accountsReceivableXAF: string;
  doubtfulReceivablesXAF: string;

  accountsPayableXAF: string;
  overduePayablesXAF: string;
  dpo: number;

  workingCapitalNeedXAF: string;
  financialDebtLtXAF: string;
  financialDebtStXAF: string;
  gearingPercent: number;
  capexMonthXAF: string;

  payrollMassMonthXAF: string;
  payrollHeadcount: number;
  payrollVsRevenuePercent: number;

  vatCollectedXAF: string;
  vatDeductibleXAF: string;
  vatDueXAF: string;
  corporateTaxProvisionXAF: string;
  socialChargesUpToDate: boolean;
  fiscalDeadlinesNext30d: number;

  executiveSummary: string | null;
  performanceAnalysis: string | null;
  cashFlowAnalysis: string | null;
  receivablesAnalysis: string | null;
  payablesAnalysis: string | null;
  fiscalAnalysis: string | null;
  financialRisks: string | null;
  financialDecisions: string | null;
  recommendations: string | null;
  nextMonthOutlook: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafMonthlyReports(filters: { status?: string } = {}) {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  return useQuery({
    queryKey: ["daf", "monthly-reports", filters],
    queryFn: () => getJson<{ items: DafReportListItem[] }>(`/api/daf/monthly-reports?${sp.toString()}`),
  });
}

export function useDafMonthlyReport(id: string | null) {
  return useQuery({
    queryKey: ["daf", "monthly-report", id],
    enabled: !!id,
    queryFn: () => getJson<DafReportDetail>(`/api/daf/monthly-reports/${id}`),
  });
}

export function useCreateDafReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { period: string; periodLabel?: string }) =>
      getJson<{ id: string }>(`/api/daf/monthly-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "monthly-reports"] }),
  });
}

export function useUpdateDafReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      getJson(`/api/daf/monthly-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["daf", "monthly-report", id] });
    },
  });
}

export function useDeleteDafReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/monthly-reports/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "monthly-reports"] }),
  });
}

export function useSubmitDafReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/daf/monthly-reports/${id}/submit`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["daf", "monthly-report", id] });
    },
  });
}

export interface AutoFillResult {
  ok: true;
  filledFields: string[];
  sources: {
    tenantIds: string[];
    billings: number;
    invoices: number;
    payslips: number;
    banks: number;
  };
}

export function useAutoFillDafReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson<AutoFillResult>(`/api/daf/monthly-reports/${id}/auto-fill`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daf", "monthly-reports"] });
      qc.invalidateQueries({ queryKey: ["daf", "monthly-report", id] });
    },
  });
}
