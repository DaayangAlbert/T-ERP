"use client";

import { useQuery } from "@tanstack/react-query";

export type GedAlertSeverity = "critical" | "warning" | "info";

export interface GedDashboardResponse {
  banner: {
    spacesCount: number;
    activeDocumentsCount: number;
    totalVolumeBytes: number;
  };
  greeting: {
    activeWorkflowsCount: number;
    complianceAlertsCount: number;
    pendingAccessRequestsCount: number;
  };
  kpis: {
    activeDocuments: number;
    pendingValidation: number;
    indexationRate: number;
    indexationTarget: number;
    complianceAlerts: number;
    criticalAlertsCount: number;
  };
  alerts: Array<{
    id: string;
    severity: GedAlertSeverity;
    title: string;
    detail: string;
    link?: string;
  }>;
  spaces: Array<{
    id: string;
    code: string;
    name: string;
    icon: string;
    docsCount: number;
    indexationRate: number;
    spaceType: string;
    childCount?: number; // pour "Chantiers (23 espaces)"
  }>;
  recentActivity: Array<{
    id: string;
    timestamp: string;
    actorName: string;
    actorRole: string;
    action: string;
    documentName: string | null;
    spaceName: string | null;
    isAnomaly: boolean;
  }>;
}

export function useGedDashboard() {
  return useQuery({
    queryKey: ["ged", "dashboard"],
    queryFn: async (): Promise<GedDashboardResponse> => {
      const res = await fetch("/api/ged/dashboard", { credentials: "same-origin" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface GedRecentActivityResponse {
  activity: GedDashboardResponse["recentActivity"];
}

export function useGedRecentActivity(hours = 24) {
  return useQuery({
    queryKey: ["ged", "recent-activity", hours],
    queryFn: async (): Promise<GedRecentActivityResponse> => {
      const res = await fetch(`/api/ged/dashboard/recent-activity?hours=${hours}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
