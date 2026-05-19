"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface PayslipListItem {
  id: string;
  period: string;
  periodLabel: string | null;
  paymentDate: string;
  grossAmount: number;
  netAmount: number;
  cnpsAmount: number;
  irppAmount: number;
  overtimeHours: number;
  paymentReference: string | null;
  paymentBankAccount: string | null;
  status: string;
  verifiedPublicUrl: string | null;
}

export interface PayslipsListResponse {
  year: number;
  total: number;
  cumulNet: number;
  payslips: PayslipListItem[];
}

export interface PayslipDetail {
  id: string;
  period: string;
  periodLabel: string | null;
  periodEnd: string | null;
  paymentDate: string;
  paymentMethod: string;
  paymentMode: string;
  paymentBankAccount: string | null;
  paymentReference: string | null;
  baseSalary: number | null;
  overtimeAmount: number;
  overtimeHours: number;
  overtimeHours125: number;
  overtimeHours150: number;
  overtimeHours200: number;
  seniorityBonus: number;
  transportAllowance: number;
  otherBonuses: unknown;
  grossAmount: number;
  cnpsAmount: number;
  irppAmount: number;
  otherDeductions: number;
  netAmount: number;
  workedDays: number;
  reportedHours: number;
  status: string;
  validatedN1At: string | null;
  validatedN2At: string | null;
  paidAt: string | null;
  verifiedPublicUrl: string | null;
  user: {
    firstName: string;
    lastName: string;
    matricule: string | null;
    employeeId: string | null;
    position: string | null;
    professionalCategory: string | null;
    cnpsNumber: string | null;
    niu: string | null;
    hireDate: string | null;
    bankName: string | null;
    bankAgency: string | null;
    rib: string | null;
  };
}

export function useEmpPayslips(year?: number) {
  return useQuery({
    queryKey: ["emp", "payslips", year ?? "current"],
    queryFn: async (): Promise<PayslipsListResponse> => {
      const url = year ? `/api/emp/payslips?year=${year}` : "/api/emp/payslips";
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useEmpPayslipDetail(id: string | null) {
  return useQuery({
    queryKey: ["emp", "payslip", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<PayslipDetail> => {
      const res = await fetch(`/api/emp/payslips/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.payslip;
    },
  });
}

export interface ShareWhatsappResult {
  ok: boolean;
  shareUrl: string;
  expiresInHours: number;
  whatsapp: { providerRef: string; renderedBody: string; toPhone: string };
}

export function useSharePayslipWhatsapp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ payslipId, to }: { payslipId: string; to?: string }): Promise<ShareWhatsappResult> => {
      const res = await fetch(`/api/emp/payslips/${payslipId}/share-whatsapp`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp", "notifications"] });
    },
  });
}
