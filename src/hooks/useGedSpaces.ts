"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Confidentiality, SpaceType, ClassificationCategory, ArchivalStatus, DocStatus } from "@prisma/client";

export interface GedSpaceRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  spaceType: SpaceType;
  confidentiality: Confidentiality;
  siteCode: string | null;
  siteStatus: string | null;
  siteManager: string | null;
  responsibleName: string | null;
  documentsCount: number;
  volumeBytes: number;
  indexationRate: number;
}

export interface GedSpacesResponse {
  counts: { total: number; transverse: number; sites: number };
  transverse: GedSpaceRow[];
  sites: GedSpaceRow[];
}

export interface GedSpacesFilters {
  q?: string;
  confidentiality?: Confidentiality | "ALL";
  minIndexation?: number | null;
  tab?: "all" | "transverse" | "sites";
}

export function useGedSpaces(filters: GedSpacesFilters) {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.confidentiality && filters.confidentiality !== "ALL") qs.set("confidentiality", filters.confidentiality);
  if (filters.minIndexation !== null && filters.minIndexation !== undefined) qs.set("minIndexation", String(filters.minIndexation));
  if (filters.tab && filters.tab !== "all") qs.set("tab", filters.tab);

  return useQuery({
    queryKey: ["ged", "spaces", filters],
    queryFn: async (): Promise<GedSpacesResponse> => {
      const res = await fetch(`/api/ged/spaces?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface SpaceTreeLeaf {
  prefix: string;
  name: string;
  count: number;
  volumeBytes: number;
}
export interface SpaceTreeNode {
  category: string;
  count: number;
  volumeBytes: number;
  leaves: SpaceTreeLeaf[];
}

export interface GedSpaceDetail {
  space: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    icon: string | null;
    spaceType: SpaceType;
    confidentiality: Confidentiality;
    active: boolean;
    createdAt: string;
    responsible: { id: string; name: string; email: string } | null;
    site: {
      id: string;
      code: string;
      name: string;
      status: string;
      client: string;
      progress: number;
      plannedEndDate: string;
      manager: string | null;
    } | null;
  };
  stats: {
    documentsCount: number;
    volumeBytes: number;
    indexationRate: number;
    categoriesCount: number;
  };
  tree: SpaceTreeNode[];
}

export function useGedSpaceDetail(id: string | null) {
  return useQuery({
    queryKey: ["ged", "space-detail", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<GedSpaceDetail> => {
      const res = await fetch(`/api/ged/spaces/${id}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface SpaceDocumentRow {
  id: string;
  name: string;
  reference: string | null;
  confidentiality: Confidentiality;
  sizeBytes: number;
  createdAt: string;
  status: DocStatus;
  classificationPrefix: string | null;
  classificationName: string | null;
  category: ClassificationCategory | null;
  archivalStatus: ArchivalStatus | null;
  duaEndDate: string | null;
}

export interface SpaceDocumentsResponse {
  page: number;
  pageSize: number;
  total: number;
  documents: SpaceDocumentRow[];
}

export function useGedSpaceDocuments(spaceId: string | null, opts: { category?: string; prefix?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (opts.category) qs.set("category", opts.category);
  if (opts.prefix) qs.set("prefix", opts.prefix);
  if (opts.page) qs.set("page", String(opts.page));

  return useQuery({
    queryKey: ["ged", "space-documents", spaceId, opts],
    enabled: Boolean(spaceId),
    queryFn: async (): Promise<SpaceDocumentsResponse> => {
      const res = await fetch(`/api/ged/spaces/${spaceId}/documents?${qs.toString()}`, { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export interface CreateSpacePayload {
  code: string;
  name: string;
  description?: string;
  icon?: string;
  spaceType: SpaceType;
  confidentiality: Confidentiality;
  siteId?: string | null;
  responsibleId?: string | null;
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSpacePayload) => {
      const res = await fetch("/api/ged/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ged", "spaces"] }),
  });
}

export function useUpdateSpaceAccessPolicy(spaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { confidentiality: Confidentiality; responsibleId?: string | null }) => {
      const res = await fetch(`/api/ged/spaces/${spaceId}/access-policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "spaces"] });
      qc.invalidateQueries({ queryKey: ["ged", "space-detail", spaceId] });
    },
  });
}
