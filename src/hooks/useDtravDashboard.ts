"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtravDashboard {
  site: {
    id: string;
    code: string;
    name: string;
    client: string;
    budget: number;
    physicalProgress: number;
    financialProgress: number;
    margin: number;
    plannedEndDate: string;
    lat: number | null;
    lng: number | null;
  };
  kpis: {
    workforcePresent: number;
    workforcePlanned: number;
    productionValue: number;
    pendingValidations: number;
    monthInvoiced: number;
    monthPaid: number;
    todayReportStatus: string | null;
  };
  alerts: Array<{
    id: string;
    severity: string;
    priority: string;
    type: string;
    message: string;
    actionUrl: string | null;
    actionLabel: string | null;
    createdAt: string;
  }>;
  todayActivity: Array<{ kind: string; label: string; time: string }>;
}

export function useDtravDashboard(siteId: string | null) {
  return useQuery({
    queryKey: ["dtrav", "dashboard", siteId],
    enabled: !!siteId,
    queryFn: async (): Promise<DtravDashboard> => {
      const res = await fetch(`/api/dtrav/sites/${siteId}/dashboard`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
