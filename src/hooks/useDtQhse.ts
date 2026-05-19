"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtQhseResponse {
  banner: { daysSinceMajorAccident: number; fatalYtd: number; tf1: number; tf1Target: number };
  kpis: { incidentsYtd: number; tf1: number; auditsThisMonth: number; openNcCount: number };
  incidents: Array<{
    id: string;
    occurredAt: string;
    site: string;
    siteName: string;
    type: string;
    severity: string;
    victimsCount: number;
    workdaysLost: number;
    description: string;
    status: string;
  }>;
  audits: Array<{
    id: string;
    site: string;
    siteName: string;
    auditType: string;
    scheduledAt: string;
    completedAt: string | null;
    score: number | null;
  }>;
  ncs: Array<{
    id: string;
    siteId: string | null;
    site: string;
    siteName: string;
    category: string;
    criticality: string;
    description: string;
    correctiveAction: string | null;
    dueDate: string | null;
    status: string;
    owner: string | null;
    ownerId: string | null;
    createdAt: string;
    closedAt: string | null;
  }>;
  certifications: Array<{
    id: string;
    standard: string;
    scope: string | null;
    issuedBy: string;
    validUntil: string;
    surveillanceAuditDate: string | null;
    openNcCount: number;
  }>;
  sites: Array<{ id: string; code: string; name: string }>;
  staff: Array<{ id: string; fullName: string; role: string }>;
}

export function useDtQhse() {
  return useQuery({
    queryKey: ["dt", "qhse"],
    queryFn: async (): Promise<DtQhseResponse> => {
      const res = await fetch("/api/dt/qhse/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
