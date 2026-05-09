"use client";

import { useQuery } from "@tanstack/react-query";
import type { SiteStatus, SiteType } from "@prisma/client";

export interface SiteListItem {
  id: string;
  code: string;
  name: string;
  client: string;
  type: SiteType;
  region: string | null;
  budget: string;
  startDate: string;
  plannedEndDate: string;
  actualEndDate: string | null;
  progress: number;
  margin: number;
  status: SiteStatus;
  manager: { id: string; firstName: string; lastName: string } | null;
}

export interface SitesSummary {
  activeCount: number;
  totalBudget: string;
  avgMargin: number;
  alertsCount: number;
}

export interface SitesListResponse {
  items: SiteListItem[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  summary: SitesSummary;
}

export interface SiteDetail extends Omit<SiteListItem, "manager"> {
  manager: { id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SitesFilters {
  page?: number;
  limit?: number;
  status?: SiteStatus | "";
  type?: SiteType | "";
  region?: string;
  q?: string;
}

async function fetchSites(filters: SitesFilters): Promise<SitesListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.region) params.set("region", filters.region);
  if (filters.q) params.set("q", filters.q);
  const res = await fetch(`/api/sites?${params}`);
  if (!res.ok) throw new Error("Erreur de chargement");
  return res.json();
}

export function useSites(filters: SitesFilters = {}) {
  return useQuery({
    queryKey: ["sites", filters],
    queryFn: () => fetchSites(filters),
    staleTime: 15_000,
  });
}

export function useSite(id: string | null) {
  return useQuery({
    queryKey: ["site", id],
    queryFn: async (): Promise<SiteDetail> => {
      const res = await fetch(`/api/sites/${id}`);
      if (!res.ok) throw new Error("Chantier introuvable");
      return res.json();
    },
    enabled: Boolean(id),
  });
}
