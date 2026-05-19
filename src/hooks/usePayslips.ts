"use client";

import { useQuery } from "@tanstack/react-query";
import type { PayslipLineCategory, PayslipStatus } from "@prisma/client";

export interface PayslipItem {
  id: string;
  period: string;
  periodEnd: string | null;
  paymentDate: string;
  paymentMode: string;
  paymentBankAccount: string | null;
  grossAmount: string;
  netAmount: string;
  socialCharges: string;
  fiscalCharges: string;
  status: PayslipStatus;
  pdfUrl: string | null;
  verificationUuid: string | null;
  verificationCode: string | null;
  verifiedPublicUrl: string | null;
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
  category: PayslipLineCategory;
}

export interface PayslipDetail {
  id: string;
  bulletinNumber: string;
  period: string;
  paymentDate: string;
  paymentMode: string;
  paymentMethod: string;
  paymentBankAccount: string | null;
  paymentReference: string | null;
  grossAmount: string;
  taxableGross: string;
  netAmount: string;
  socialCharges: string;
  fiscalCharges: string;
  employerCharges: string;
  cnpsAmount: string;
  irppAmount: string;
  otherDeductions: string;
  netInWords: string;
  status: PayslipStatus;
  pdfUrl: string | null;
  periodEnd: string | null;
  generatedIp: string | null;
  verificationUuid: string;
  verificationCode: string;
  verifiedPublicUrl: string;
  issuedAt: string | null;
  workedDays: number;
  reportedHours: number;
  lines: PayslipLine[];
  user: {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    employeeId: string | null;
    matricule: string | null;
    position: string | null;
    category: string | null;
    professionalCategory: string | null;
    echelon: string | null;
    classCategory: string | null;
    indiceSalarial: number | null;
    coefficientSalarial: number | null;
    department: string | null;
    cnpsNumber: string | null;
    cnpsCardNumber: string | null;
    niu: string | null;
    hireDate: string | null;
    contractType: string | null;
    familyStatus: string | null;
    bankName: string | null;
    bankAgency: string | null;
    rib: string | null;
  };
  snapshot: {
    fullName: string;
    matricule: string;
    position: string | null;
    category: string | null;
    contractType: string | null;
    hireDate: string | null;
    cnpsNumber: string | null;
    bankName: string | null;
    bankAccount: string | null;
    profilePhotoUrl: string | null;
  } | null;
  tenant: {
    name: string;
    legalForm: string | null;
    taxId: string | null;
    cnpsId: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    contactAddress: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    websiteUrl: string | null;
    signatureImageUrl: string | null;
    stampImageUrl: string | null;
    drhSignatoryName: string | null;
  };
  cumul: {
    salary: string;
    bonuses: string;
    overtime: string;
    taxable: string;
    deductions: string;
    net: string;
  };
  leave: {
    acquired: number;
    taken: number;
    remaining: number;
    unjustifiedAbsenceDays: number;
    delayHours: number;
  };
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
