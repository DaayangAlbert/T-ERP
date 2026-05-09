"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteStatus, SiteType } from "@prisma/client";

export interface SubsidiaryRow {
  id: string;
  slug: string;
  name: string;
  sector: string | null;
  color: string;
  isParent: boolean;
  ca: number;
  margin: number;
  headcount: number;
  treasury: number;
  sitesCount: number;
  perfYoY: number;
}

export interface IntragroupTx {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  date: string;
}

export interface ConsolidationPayload {
  group: {
    id: string;
    slug: string;
    name: string;
    childrenCount: number;
  };
  groupKpis: {
    ca: number;
    margin: number;
    headcount: number;
    treasury: number;
    childrenCount: number;
  };
  subsidiaries: SubsidiaryRow[];
  monthlyByFiliale: Record<string, number | string>[];
  intragroupTransactions: IntragroupTx[];
  meta: { generatedAt: string };
}

export interface FilialeDetailPayload {
  filiale: {
    id: string;
    slug: string;
    name: string;
    sector: string | null;
    color: string | null;
    parent: { id: string; slug: string; name: string } | null;
  };
  kpis: {
    ca: number;
    margin: number;
    treasury: number;
    sitesCount: number;
  };
  sites: Array<{
    id: string;
    code: string;
    name: string;
    client: string;
    type: SiteType;
    region: string | null;
    budget: string;
    progress: number;
    margin: number;
    status: SiteStatus;
  }>;
}

export function useDgConsolidation() {
  return useQuery({
    queryKey: ["dg-consolidation"],
    queryFn: async (): Promise<ConsolidationPayload> => {
      const res = await fetch("/api/dg/consolidation");
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useFilialeDetail(filialeId: string | null) {
  return useQuery({
    queryKey: ["dg-filiale", filialeId],
    queryFn: async (): Promise<FilialeDetailPayload> => {
      const res = await fetch(`/api/dg/consolidation/${filialeId}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    enabled: Boolean(filialeId),
  });
}
