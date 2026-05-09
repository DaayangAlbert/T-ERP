"use client";

import { useQuery } from "@tanstack/react-query";

interface DashboardResponse {
  consolidatedPosition: {
    value: string;
    dailyDelta: number;
    creditLines: { granted: string; used: string; available: string };
    totalAvailable: string;
  };
  primaryKpis: {
    receipts: { value: string; trend: Array<{ day: number; value: number }> };
    payments: { value: string; trend: Array<{ day: number; value: number }> };
    pendingValidations: { count: number; amount: string };
    dso: { value: number; alert: boolean };
  };
  secondaryKpis: {
    taxDeadlines: { count: number; amount: string; urgent: number };
    overdueReceivables: { amount: string };
    ytdMargin: { value: number };
    bfr: { days: number };
  };
  priorities: Array<{ type: string; title: string; urgency: string; link: string }>;
  treasuryEvolution30d: Array<{ date: string; value: number }>;
  outflowsBreakdown7d: Array<{ category: string; amount: number; color: string }>;
}

export function useDafDashboard() {
  return useQuery({
    queryKey: ["daf", "dashboard"],
    queryFn: async (): Promise<DashboardResponse> => {
      const res = await fetch("/api/daf/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
