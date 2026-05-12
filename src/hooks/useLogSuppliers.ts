"use client";

import { useQuery } from "@tanstack/react-query";

export interface LogSuppliersResponse {
  kpis: {
    activeCount: number;
    frameworkCount: number;
    totalEngagementsYtd: number;
    fiscalCompliantCount: number;
    fiscalPendingCount: number;
  };
  frameworks: Array<{
    id: string;
    reference: string;
    supplierId: string;
    supplierName: string;
    category: string;
    subject: string;
    maxAmount: number;
    usedAmount: number;
    endDate: string;
    daysLeft: number;
    expiringSoon: boolean;
  }>;
  suppliers: Array<{
    id: string;
    name: string;
    category: string;
    taxId: string | null;
    ratingQuality: number | null;
    ratingDelay: number | null;
    ratingPrice: number | null;
    strategic: boolean;
    blocked: boolean;
    volumeYTD: number;
    poCount: number;
    frameworkCount: number;
    evaluationsCount: number;
    fiscalOk: boolean;
    fiscalCnps: string;
    fiscalDgi: string;
  }>;
  evaluations: Array<{
    id: string;
    supplierName: string;
    period: string;
    ratingQuality: number;
    ratingDelay: number;
    ratingPrice: number;
    avg: number;
    comments: string | null;
    createdAt: string;
  }>;
}

export function useLogSuppliers() {
  return useQuery({
    queryKey: ["log", "suppliers"],
    queryFn: async (): Promise<LogSuppliersResponse> => {
      const res = await fetch("/api/log/suppliers", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
