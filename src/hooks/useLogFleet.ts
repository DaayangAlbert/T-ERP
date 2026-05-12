"use client";

import { useQuery } from "@tanstack/react-query";

export interface LogFleetResponse {
  kpis: {
    total: number;
    inService: number;
    maintenance: number;
    breakdown: number;
    availability: number;
    totalValue: number;
    fuelLitersWeek: number;
    fuelCostWeek: number;
    maintenancesUpcoming: number;
  };
  countByType: Record<string, number>;
  items: Array<{
    id: string;
    registration: string;
    designation: string;
    type: string;
    status: string;
    counter: number;
    counterUnit: string;
    currentValue: number;
    site: string;
    driver: string;
    nextMaintenance: { type: string; scheduledAt: string | null; description: string } | null;
    insuranceUntil: string | null;
  }>;
}

export function useLogFleet(params: { type?: string; status?: string; search?: string }) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return useQuery({
    queryKey: ["log", "fleet", params],
    queryFn: async (): Promise<LogFleetResponse> => {
      const res = await fetch(`/api/log/equipment?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
