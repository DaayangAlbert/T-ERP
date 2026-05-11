"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtCapacityResponse {
  kpis: {
    crewCount: number;
    totalCapacityWeek: number;
    totalPlannedWeek: number;
    utilizationPercent: number;
    overloadsCount: number;
  };
  weeks: string[];
  crews: Array<{
    id: string;
    name: string;
    specialty: string;
    leader: string | null;
    capacityHoursPerWeek: number;
    cells: Array<{
      weekIso: string;
      plannedHours: number;
      pct: number;
      siteName: string | null;
    }>;
  }>;
  overloads: Array<{
    id: string;
    crewName: string;
    site: string;
    weekIso: string;
    overloadPercent: number;
    plannedHours: number;
  }>;
}

export function useDtCapacity() {
  return useQuery({
    queryKey: ["dt", "capacity"],
    queryFn: async (): Promise<DtCapacityResponse> => {
      const res = await fetch("/api/dt/crews", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
