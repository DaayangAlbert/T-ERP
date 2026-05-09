"use client";

import { useQuery } from "@tanstack/react-query";
import type { ContractType, PayslipStatus } from "@prisma/client";

export interface PayslipItem {
  id: string;
  period: string;
  paymentDate: string;
  paymentMode: string;
  grossAmount: string;
  netAmount: string;
  socialCharges: string;
  fiscalCharges: string;
  status: PayslipStatus;
  pdfUrl: string | null;
}

export interface PayslipsListResponse {
  items: PayslipItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  summary: {
    ytdGross: string;
    ytdNet: string;
    avgNet: string;
  };
}

export interface PayslipLine {
  id: string;
  code: string;
  label: string;
  quantity: number | null;
  base: string | null;
  rate: number | null;
  amountPlus: string | null;
  amountMinus: string | null;
  employerAmount: string | null;
  order: number;
}

export interface PayslipDetail {
  id: string;
  period: string;
  paymentDate: string;
  paymentMode: string;
  grossAmount: string;
  taxableGross: string;
  netAmount: string;
  socialCharges: string;
  fiscalCharges: string;
  employerCharges: string;
  status: PayslipStatus;
  pdfUrl: string | null;
  lines: PayslipLine[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string | null;
    position: string | null;
    category: string | null;
    cnpsNumber: string | null;
    hireDate: string | null;
    contractType: ContractType | null;
  };
  tenant: {
    name: string;
    taxId: string | null;
    cnpsId: string | null;
    primaryColor: string | null;
  } | null;
}

export function useMyPayslips(page = 1) {
  return useQuery({
    queryKey: ["my-payslips", page],
    queryFn: async (): Promise<PayslipsListResponse> => {
      const res = await fetch(`/api/users/me/payslips?page=${page}&limit=12`);
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useMyPayslip(id: string | null) {
  return useQuery({
    queryKey: ["my-payslip", id],
    queryFn: async (): Promise<PayslipDetail> => {
      const res = await fetch(`/api/users/me/payslips/${id}`);
      if (!res.ok) throw new Error("Bulletin introuvable");
      return res.json();
    },
    enabled: Boolean(id),
  });
}
