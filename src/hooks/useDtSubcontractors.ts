"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtSubcontractorsResponse {
  kpis: {
    qualifiedCount: number;
    frameworkActiveCount: number;
    activeEngagements: number;
    pendingEvaluations: number;
    alertsCount: number;
  };
  items: Array<{
    id: string;
    name: string;
    specialties: string[];
    agreements: string[];
    internalRating: number;
    ratingsCount: number;
    fiscalCompliance: { cnps?: string; dgi?: string; lastChecked?: string } | null;
    paymentTerms: number;
    volumeYTD: number;
    evaluationsCount: number;
  }>;
}

export function useDtSubcontractors(filters: {
  specialty?: string;
  minRating?: number;
  fiscalOk?: boolean;
}) {
  const qs = new URLSearchParams();
  if (filters.specialty) qs.set("specialty", filters.specialty);
  if (filters.minRating) qs.set("minRating", String(filters.minRating));
  if (filters.fiscalOk) qs.set("fiscalOk", "1");
  return useQuery({
    queryKey: ["dt", "subcontractors", filters],
    queryFn: async (): Promise<DtSubcontractorsResponse> => {
      const res = await fetch(`/api/dt/subcontractors?${qs.toString()}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
