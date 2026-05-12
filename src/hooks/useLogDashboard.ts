"use client";

import { useQuery } from "@tanstack/react-query";

export interface LogDashboardResponse {
  banner: { consolidatedStockValue: number; sitesCount: number };
  greeting: {
    firstName: string;
    poTracked: number;
    suppliersCount: number;
    equipmentCount: number;
    poToValidate: number;
  };
  kpis: {
    poInProgress: number;
    poToValidate: number;
    poN2Daf: number;
    fleetActive: number;
    fleetTotal: number;
    fleetAvailability: number;
    savingsYtd: number;
  };
  alerts: Array<{
    id: string;
    severity: "low" | "medium" | "high";
    title: string;
    details: string;
    link?: string;
  }>;
  purchasesByCategory: {
    items: Array<{ category: string; value: number; color: string }>;
    total: number;
  };
  topSuppliers: Array<{ name: string; volume: number }>;
  stocksTopSites: Array<{
    code: string;
    name: string;
    stockValue: number;
    rupturesCount: number;
    status: string;
  }>;
}

export function useLogDashboard() {
  return useQuery({
    queryKey: ["log", "dashboard"],
    queryFn: async (): Promise<LogDashboardResponse> => {
      const res = await fetch("/api/log/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
