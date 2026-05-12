"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export interface RecentSearchRow {
  id: string;
  query: string;
  total: number;
  timestamp: string;
}

export function useRecentSearches() {
  return useQuery<{ recent: RecentSearchRow[] }>({
    queryKey: ["ged", "search", "recent"],
    queryFn: async () => {
      const r = await fetch("/api/ged/search/recent", { credentials: "include" });
      if (!r.ok) throw new Error("Erreur recherches récentes");
      return r.json();
    },
  });
}

export interface DestructionPvDocument {
  id: string;
  name: string;
  reference: string | null;
  classificationPrefix: string | null;
  classificationName: string | null;
  dua: string | null;
  spaceName: string | null;
  createdAt: string;
  duaEndDate: string;
  sizeBytes: number;
}

export interface DestructionPvResponse {
  pv: {
    reference: string;
    generatedAt: string;
    generatedBy: string;
    tenantId: string;
    totalDocuments: number;
    totalSizeBytes: number;
    requiresSignatures: string[];
    documents: DestructionPvDocument[];
  };
  executed: boolean;
}

export function useArchivalAutoProcess() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; summary: { movedToSemiActive: number; movedToPendingDestruction: number; executedAt: string } }, Error>({
    mutationFn: async () => {
      const r = await fetch("/api/ged/archival/auto-process", {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "archival"] });
    },
  });
}

export function useDestructionPv() {
  const qc = useQueryClient();
  return useMutation<DestructionPvResponse, Error, { applyDestruction: boolean }>({
    mutationFn: async (input) => {
      const r = await fetch("/api/ged/archival/destruction-pv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "archival"] });
    },
  });
}

export function useLegalHold() {
  const qc = useQueryClient();
  return useMutation<{ ok: true; documentId: string; hold: boolean }, Error, { documentId: string; hold: boolean; reason: string }>({
    mutationFn: async (input) => {
      const r = await fetch("/api/ged/archival/legal-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged"] });
    },
  });
}
