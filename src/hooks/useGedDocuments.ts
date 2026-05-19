"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Confidentiality, DocStatus, Role } from "@prisma/client";

export interface UploadDocumentInput {
  file: File;
  displayName?: string;
  spaceId?: string;
  siteId?: string;
  classificationPrefix?: string;
  confidentiality?: Confidentiality;
  publish?: boolean;
  notes?: string;
}

export interface UploadDocumentResponse {
  id: string;
  internalReference: string | null;
  url: string;
  sizeBytes: number;
  classification: {
    detectedPrefix: string | null;
    reason: "explicit-space" | "by-prefix" | "by-category-fallback" | "unclassified";
    classificationId: string | null;
    classificationName: string | null;
    spaceId: string | null;
  };
  duaEndDate: string;
  workflowInstanceId: string | null;
}

function invalidateGed(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["ged"] });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<UploadDocumentResponse> => {
      const fd = new FormData();
      fd.append("file", input.file);
      if (input.displayName) fd.append("displayName", input.displayName);
      if (input.spaceId) fd.append("spaceId", input.spaceId);
      if (input.siteId) fd.append("siteId", input.siteId);
      if (input.classificationPrefix)
        fd.append("classificationPrefix", input.classificationPrefix);
      if (input.confidentiality) fd.append("confidentiality", input.confidentiality);
      if (input.publish) fd.append("publish", "1");
      if (input.notes) fd.append("notes", input.notes);

      const r = await fetch("/api/ged/documents", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => invalidateGed(qc),
  });
}

export interface ClassifyDocumentInput {
  classificationId: string;
  spaceId?: string | null;
  notes?: string;
}

export function useClassifyDocument(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassifyDocumentInput) => {
      const r = await fetch(`/api/ged/documents/${documentId}/classify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; internalReference: string; duaEndDate: string }>;
    },
    onSuccess: () => invalidateGed(qc),
  });
}

export interface UnclassifiedDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
  ageDays: number;
  confidentiality: Confidentiality;
  authorName: string;
  authorRole: Role | null;
  siteCode: string | null;
  siteName: string | null;
  spaceId: string | null;
  spaceName: string | null;
  spaceIcon: string | null;
  classificationId: string | null;
  classificationPrefix: string | null;
  classificationName: string | null;
  missing: { classification: boolean; space: boolean };
}

// ─────────────────────────────────────────────────────────────────────
// Vue exhaustive archiviste (GET /api/ged/documents/all)
// ─────────────────────────────────────────────────────────────────────

export interface GedDocument {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
  status: DocStatus;
  confidentiality: Confidentiality;
  category: string | null;
  folder: string | null;
  internalReference: string | null;
  authorId: string;
  authorName: string;
  authorRole: Role | null;
  siteId: string | null;
  siteCode: string | null;
  siteName: string | null;
  spaceId: string | null;
  spaceCode: string | null;
  spaceName: string | null;
  spaceIcon: string | null;
  classificationId: string | null;
  classificationPrefix: string | null;
  classificationName: string | null;
  classificationCategory: string | null;
}

export interface AllDocumentsResponse {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  items: GedDocument[];
  facets: { bySpace: Record<string, number> };
}

export interface AllDocumentsFilters {
  spaceId?: string | null;
  classificationId?: string;
  siteId?: string;
  authorId?: string;
  status?: DocStatus;
  confidentiality?: Confidentiality;
  q?: string;
  from?: string;
  to?: string;
  unclassified?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "name" | "size";
}

export function useGedAllDocuments(filters: AllDocumentsFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.spaceId) qs.set("spaceId", filters.spaceId);
  if (filters.classificationId) qs.set("classificationId", filters.classificationId);
  if (filters.siteId) qs.set("siteId", filters.siteId);
  if (filters.authorId) qs.set("authorId", filters.authorId);
  if (filters.status) qs.set("status", filters.status);
  if (filters.confidentiality) qs.set("confidentiality", filters.confidentiality);
  if (filters.q) qs.set("q", filters.q);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (filters.unclassified) qs.set("unclassified", "1");
  if (filters.page) qs.set("page", String(filters.page));
  if (filters.pageSize) qs.set("pageSize", String(filters.pageSize));
  if (filters.sort) qs.set("sort", filters.sort);
  return useQuery({
    queryKey: ["ged", "documents", "all", filters],
    queryFn: async (): Promise<AllDocumentsResponse> => {
      const r = await fetch(`/api/ged/documents/all?${qs.toString()}`, {
        credentials: "same-origin",
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
    placeholderData: (prev) => prev,
  });
}

export interface BulkClassifyInput {
  documentIds: string[];
  spaceId?: string | null;
  classificationId?: string | null;
  folder?: string | null;
}

export function useBulkClassify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BulkClassifyInput) => {
      const r = await fetch("/api/ged/documents/bulk-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      return r.json() as Promise<{ ok: true; updated: number; skipped: number }>;
    },
    onSuccess: () => invalidateGed(qc),
  });
}

export function useUnclassifiedDocuments(opts: { page?: number; includeRecent?: boolean } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(opts.page ?? 1));
  if (opts.includeRecent) qs.set("includeRecent", "1");
  return useQuery({
    queryKey: ["ged", "documents", "unclassified", opts.page ?? 1, opts.includeRecent ?? false],
    queryFn: async (): Promise<{
      page: number;
      pageSize: number;
      total: number;
      pages: number;
      documents: UnclassifiedDocument[];
    }> => {
      const r = await fetch(`/api/ged/documents/unclassified?${qs.toString()}`, {
        credentials: "same-origin",
      });
      if (!r.ok) throw new Error("Erreur documents à classer");
      return r.json();
    },
  });
}
