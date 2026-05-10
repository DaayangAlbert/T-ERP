"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtDashboardResponse {
  banner: {
    cumulativeProductionYtd: number;
    productionDeltaVsN1: number;
    activeSites: number;
    headcountOnSite: number;
    marginAvg: number;
  };
  kpis: {
    activeSites: number;
    avgProgress: number;
    pendingN2Validations: number;
    hseRecord: number;
  };
  alerts: Array<{
    id: string;
    type: string;
    severity: "low" | "medium" | "high";
    title: string;
    details: string;
    link?: string;
  }>;
  progressVsFinancial: Array<{
    code: string;
    name: string;
    physical: number;
    financial: number;
  }>;
  progressByDirectorOfWorks: Array<{
    name: string;
    production: number;
    sites: number;
    color: string;
  }>;
  sitesToWatch: Array<{
    id: string;
    code: string;
    name: string;
    manager: string;
    physicalProgress: number;
    margin: number;
    marginTarget: number;
    deviationPercent: number;
    plannedEndDate: string;
    status: string;
    alertReason: string;
    severity: "low" | "medium" | "high";
  }>;
}

export function useDtDashboard() {
  return useQuery({
    queryKey: ["dt", "dashboard"],
    queryFn: async (): Promise<DtDashboardResponse> => {
      const res = await fetch("/api/dt/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
