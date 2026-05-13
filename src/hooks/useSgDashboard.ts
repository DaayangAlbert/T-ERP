"use client";

import { useQuery } from "@tanstack/react-query";

export type SgAlertSeverity = "critical" | "warning" | "info";

export interface SgDashboardResponse {
  greeting: {
    firstName: string;
    tenantName: string;
    activeContracts: number;
    activeCases: number;
    daysToNextMeeting: number | null;
    complianceAlertsCount: number;
  };
  kpis: {
    activeContracts: { count: number; portfolioValue: number };
    nextMeeting: {
      type: "BOARD_MEETING" | "ORDINARY_AG" | "EXTRAORDINARY_AG";
      scheduledAt: string;
      daysToMeeting: number;
    } | null;
    activeCases: { count: number; provisionsTotal: number };
    compliance: { upToDate: boolean; toUpdateCount: number; alertsCount: number };
  };
  alerts: Array<{
    id: string;
    severity: SgAlertSeverity;
    icon: "AlertOctagon" | "Gavel" | "Landmark" | "Banknote" | "Scale" | "Mail";
    title: string;
    detail: string;
    cta?: { label: string; href: string };
  }>;
  capitalStructure: {
    capitalSocial: number;
    totalShares: number;
    sharesNominal: number;
    paidUpPercentage: number;
    currency: string;
    shareholders: Array<{
      id: string;
      name: string;
      entityType: "INDIVIDUAL" | "CORPORATION" | "INVESTMENT_FUND" | "EMPLOYEE_PLAN";
      numberOfShares: number;
      percentage: number;
    }>;
  };
  boardComposition: {
    totalCount: number;
    mandateYears: number;
    cacName: string | null;
    cacMandateRange: string | null;
    members: Array<{
      id: string;
      fullName: string;
      function: string;
      isIndependent: boolean;
      representingEntity: string | null;
    }>;
  };
  officialCalendar: Array<{
    id: string;
    type: "BOARD_MEETING" | "ORDINARY_AG" | "EXTRAORDINARY_AG";
    scheduledAt: string;
    location: string;
    daysToMeeting: number;
  }>;
}

export function useSgDashboard() {
  return useQuery({
    queryKey: ["sg", "dashboard"],
    queryFn: async (): Promise<SgDashboardResponse> => {
      const res = await fetch("/api/sg/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
