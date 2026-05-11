"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtMethodsResponse {
  kpis: { methodsActive: number; templatesCount: number; ratiosCount: number; rexCount: number };
  methods: Array<{
    id: string;
    category: string;
    title: string;
    version: string;
    lastReviewedAt: string | null;
    author: string | null;
    usageCount: number;
    status: string;
  }>;
  templates: Array<{
    id: string;
    siteTypology: string;
    totalDuration: number;
    phases: Array<{ name: string; durationDays: number }>;
    usageCount: number;
  }>;
  ratios: Array<{
    id: string;
    workItem: string;
    unit: string;
    refValue: number;
    observedValue: number;
    observationsCount: number;
    gap: number;
    gapPercent: number;
  }>;
  rex: Array<{
    id: string;
    siteCode: string;
    siteName: string;
    issues: string;
    solutions: string;
    recommendations: string;
    keywords: string[];
    closedAt: string;
  }>;
}

export function useDtMethods() {
  return useQuery({
    queryKey: ["dt", "methods"],
    queryFn: async (): Promise<DtMethodsResponse> => {
      const res = await fetch("/api/dt/methods", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
