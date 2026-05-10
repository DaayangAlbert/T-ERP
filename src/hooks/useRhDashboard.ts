"use client";

import { useQuery } from "@tanstack/react-query";

export interface RhDashboard {
  kpis: {
    totalHeadcount: number;
    presentToday: number;
    presentRate: number;
    hiringInProgress: number;
    pendingValidations: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    details: string | null;
    link: string | null;
    createdAt: string;
  }>;
  headcountEvolution12m: Array<{ period: string; headcount: number }>;
  categoryBreakdown: Array<{ category: string; count: number; color: string }>;
  hiringPipeline: Array<{
    candidateName: string;
    position: string;
    site: string;
    stage: string;
    expectedStartDate: string;
  }>;
}

export function useRhDashboard() {
  return useQuery({
    queryKey: ["rh", "dashboard"],
    queryFn: async (): Promise<RhDashboard> => {
      const res = await fetch("/api/rh/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
