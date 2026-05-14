"use client";

import { useQuery } from "@tanstack/react-query";

export type OuvClockState = "NOT_CLOCKED" | "IN_PROGRESS" | "DONE";

export interface OuvDashboard {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    initials: string;
    avatarUrl: string | null;
    matricule: string | null;
    workerQualification: string;
    position: string | null;
    professionalCategory: string | null;
    teamLeader: boolean;
    isGuard: boolean;
    seniorityYears: number;
  };
  assignment: {
    siteId: string;
    siteCode: string;
    siteName: string;
    siteLat: number | null;
    siteLng: number | null;
    teamLabel: string;
    payrollDayLabel: string;
    chief: {
      id: string;
      firstName: string;
      lastName: string;
      phoneE164: string | null;
      whatsappUrl: string | null;
    } | null;
  } | null;
  todayClock: {
    state: OuvClockState;
    arrivalTime: string | null;
    departureTime: string | null;
    totalHours: number;
    overtimeHours: number;
  };
  latestPayslip: {
    id: string;
    period: string;
    periodLabel: string | null;
    netAmount: number;
    paymentDate: string;
    paymentReference: string | null;
    status: string;
    isNew: boolean;
  } | null;
  kpis: {
    leavesRemaining: number;
    compensatoryDays: number;
    newMissionsCount: number;
    teamCount: number;
  };
}

export function useOuvDashboard() {
  return useQuery<OuvDashboard>({
    queryKey: ["ouv", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Chargement du tableau de bord impossible");
      return res.json();
    },
    // Refetch fréquent : l'état du pointage change quand l'ouvrier pointe.
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}
