"use client";

import { useQuery } from "@tanstack/react-query";

export interface CdtDashboard {
  site: { id: string; name: string; code: string; progress: number; physicalProgress: number };
  today: string;
  weather: string;
  kpis: {
    teamsAtWork: number;
    teamsTotal: number;
    tasksToday: number;
    tasksActive: number;
    qcTodo: number;
    openReserves: number;
  };
  activePhase: {
    label: string;
    progress: number;
    nextMilestone: { code: string; designation: string; daysToNext: number } | null;
  };
  planTodayPending: boolean;
  planTeamsToAssign: number;
  alerts: Array<{
    key: string;
    level: "critical" | "warning" | "info";
    title: string;
    detail: string;
    link: string;
  }>;
  upcomingVisits: Array<{ id: string; visitorName: string; organization: string; scheduledAt: string; visitorType: string }>;
  subcontractorsOnSite: Array<{ id: string; name: string; workerCount: number; supervisor: string }>;
}

export function useCdtDashboard() {
  return useQuery({
    queryKey: ["cdt", "dashboard"],
    queryFn: async (): Promise<CdtDashboard> => {
      const res = await fetch("/api/cdt/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
