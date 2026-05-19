"use client";

import { useQuery } from "@tanstack/react-query";
import type { Role } from "@prisma/client";

export interface CptDashboard {
  scope: {
    label: string;
    isDirection: boolean;
    siteCount: number;
    sites: Array<{ id: string; code: string; name: string }>;
    cumulatedBudget: number;
  };
  kpis: {
    todayEntries: number;
    draftEntries: number;
    invoicesToAccount: number;
    invoicesDueSoon: number;
  };
  priorities: Array<{ kind: string; label: string; severity: "info" | "warning" | "danger" }>;
  recentEntries: Array<{
    id: string;
    reference: string;
    description: string;
    journalCode: string;
    entryDate: string;
    siteCode: string | null;
    status: string;
    createdBy: string;
    createdByRole: Role;
  }>;
  entriesEvolution: Array<{ date: string; count: number }>;
  journalDistribution: Array<{ code: string; label: string; count: number }>;
}

export function useCptDashboard() {
  return useQuery({
    queryKey: ["comptable", "dashboard"],
    queryFn: async (): Promise<CptDashboard> => {
      const res = await fetch("/api/comptable/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
