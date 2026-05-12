"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

export interface SearchFilters {
  classificationId?: string;
  spaceId?: string;
  siteId?: string;
  authorId?: string;
  periodFrom?: string;
  periodTo?: string;
  archivalStatus?: string;
  confidentiality?: "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL";
}

export interface SearchResultItem {
  id: string;
  name: string;
  internalReference: string | null;
  confidentiality: string;
  sizeBytes: number;
  sizeMb: number;
  createdAt: string;
  author: string | null;
  classificationPrefix: string | null;
  classificationName: string | null;
  classificationDua: string | null;
  spaceCode: string | null;
  spaceName: string | null;
  archivalStatus: string | null;
  duaEndDate: string | null;
  legalHold: boolean;
}

export interface SearchResponse {
  page: number;
  perPage: number;
  total: number;
  pages: number;
  items: SearchResultItem[];
}

export interface ArchivalStatsResponse {
  totals: {
    all: number;
    active: number;
    semiActive: number;
    finalArchive: number;
    pendingDestruction: number;
  };
}

export function useGedSearch() {
  return useMutation<SearchResponse, Error, { query?: string; filters?: SearchFilters; page?: number }>({
    mutationFn: async (input) => {
      const r = await fetch("/api/ged/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) throw new Error("Erreur recherche");
      return r.json();
    },
  });
}

export function useArchivalStats() {
  return useQuery<ArchivalStatsResponse>({
    queryKey: ["ged", "archival", "stats"],
    queryFn: async () => {
      const r = await fetch("/api/ged/archival/stats", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur stats archivage");
      return r.json();
    },
  });
}
