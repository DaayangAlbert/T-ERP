"use client";

import { useQuery } from "@tanstack/react-query";

export interface DtSite {
  id: string;
  code: string;
  name: string;
  client: string;
  moaName: string | null;
  moaTypeKind: string | null;
  contractTypeKind: string | null;
  type: string;
  region: string | null;
  budget: number;
  progress: number;
  financialProgress: number;
  margin: number;
  marginTarget: number;
  deviationPercent: number;
  status: string;
  managerId: string | null;
  managerName: string | null;
  plannedEndDate: string;
}

export interface DtPortfolioResponse {
  items: DtSite[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  facets: {
    managers: Array<{ id: string; name: string }>;
    regions: string[];
  };
  kpis: {
    portfolioValue: number;
    production: number;
    remaining: number;
    avgMargin: number;
    activeCount: number;
  };
}

interface DtSitesParams {
  search?: string;
  status?: string;
  type?: string;
  region?: string;
  directorOfWorks?: string;
  page?: number;
  limit?: number;
}

export function useDtPortfolio(params: DtSitesParams = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  return useQuery({
    queryKey: ["dt", "portfolio", params],
    queryFn: async (): Promise<DtPortfolioResponse> => {
      const res = await fetch(`/api/dt/sites?${qs.toString()}`, {
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

export interface DtSiteDetail extends DtSite {
  actualSpent: number;
  startDate: string;
  actualEndDate: string | null;
  manager: { id: string; name: string } | null;
  contract: {
    reference: string;
    initialAmount: number;
    currentAmount: number;
    publicMarket: boolean;
    procuringEntity: string | null;
    signedAt: string | null;
  } | null;
  alerts: Array<{
    id: string;
    severity: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  photos: Array<{ id: string; url: string; caption: string | null; takenAt: string }>;
  decisions: Array<{ id: string; title: string; body: string; createdAt: string }>;
}

export function useDtSiteDetail(id: string | null) {
  return useQuery({
    queryKey: ["dt", "site", id],
    enabled: !!id,
    queryFn: async (): Promise<DtSiteDetail> => {
      const res = await fetch(`/api/dt/sites/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export interface DtMapMarker {
  id: string;
  code: string;
  name: string;
  region: string | null;
  lat: number;
  lng: number;
  budget: number;
  status: string;
  progress: number;
}

export function useDtSitesMap() {
  return useQuery({
    queryKey: ["dt", "sites", "map"],
    queryFn: async (): Promise<{ items: DtMapMarker[] }> => {
      const res = await fetch("/api/dt/sites/map", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
