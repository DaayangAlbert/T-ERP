"use client";

import { useQuery } from "@tanstack/react-query";
import type { ContractType } from "@prisma/client";

export interface PublicJobTenant {
  id: string;
  slug: string;
  name: string;
  primaryColor: string | null;
  logoUrl: string | null;
}

export interface PublicJob {
  id: string;
  reference: string;
  title: string;
  department: string | null;
  contractType: ContractType;
  category: string;
  positions: number;
  salaryMin: string | null;
  salaryMax: string | null;
  region: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  tenant: PublicJobTenant;
}

export interface PublicJobDetail extends PublicJob {
  description: string;
  requirements: string;
}

export interface JobsListResponse {
  items: PublicJob[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface JobsFilters {
  page?: number;
  limit?: number;
  region?: string;
  q?: string;
}

async function fetchJobs(filters: JobsFilters = {}): Promise<JobsListResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.region) params.set("region", filters.region);
  if (filters.q) params.set("q", filters.q);
  const res = await fetch(`/api/public/jobs?${params}`);
  if (!res.ok) throw new Error("Erreur de chargement des offres");
  return res.json();
}

export function useJobs(filters: JobsFilters = {}) {
  return useQuery({
    queryKey: ["public-jobs", filters],
    queryFn: () => fetchJobs(filters),
    staleTime: 30_000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["public-job", id],
    queryFn: async (): Promise<PublicJobDetail> => {
      const res = await fetch(`/api/public/jobs/${id}`);
      if (!res.ok) throw new Error("Offre introuvable");
      return res.json();
    },
    enabled: Boolean(id),
  });
}
