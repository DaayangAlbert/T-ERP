"use client";

import { useQuery } from "@tanstack/react-query";

export interface EmpDashboard {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    professionalCategory: string | null;
    teamLeader: boolean;
    preferredLanguage: string;
    seniorityYears: number;
  };
  kpis: {
    lastNetSalary: number;
    lastPeriodLabel: string | null;
    leavesRemaining: number;
    compensatoryDays: number;
    overtimeHoursMonth: number;
    seniorityYears: number;
  };
  latestPayslip: {
    id: string;
    period: string;
    periodLabel: string | null;
    netAmount: number;
    paymentDate: string;
    paymentReference: string | null;
    paymentBankAccount: string | null;
    status: string;
  } | null;
  site: {
    id: string;
    code: string;
    name: string;
    client: string;
    region: string | null;
    progress: number;
    startDate: string;
    plannedEndDate: string;
    managerName: string | null;
    siteManagerName: string | null;
    workforceCount: number;
    presentCount: number;
  } | null;
  team: {
    specialty: string;
    totalCount: number;
    presentCount: number;
    members: Array<{
      id: string;
      firstName: string;
      lastName: string;
      position: string | null;
      presentToday: boolean;
      arrivalTime: string | null;
      absentReason: string | null;
    }>;
  } | null;
}

export function useEmpDashboard() {
  return useQuery({
    queryKey: ["emp", "dashboard"],
    queryFn: async (): Promise<EmpDashboard> => {
      const res = await fetch("/api/emp/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    staleTime: 30_000,
  });
}
