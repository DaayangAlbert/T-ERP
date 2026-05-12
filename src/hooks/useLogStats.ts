"use client";

import { useQuery } from "@tanstack/react-query";

export interface LogStatsResponse {
  kpis: {
    totalYtd: number;
    savings: number;
    savingsPercent: number;
    avgPaymentDays: number;
    paymentTarget: number;
    onTimeDeliveryRate: number;
  };
  monthlyEvolution: Array<{ month: string; value: number; projected: boolean }>;
  bySite: Array<{
    code: string;
    name: string;
    purchases: number;
    budget: number;
    gap: number;
    gapPercent: number;
  }>;
  byCategory: Array<{ category: string; value: number; pct: number; color: string }>;
}

export function useLogStats() {
  return useQuery({
    queryKey: ["log", "stats"],
    queryFn: async (): Promise<LogStatsResponse> => {
      const res = await fetch("/api/log/stats", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
