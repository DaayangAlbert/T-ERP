"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Confidentiality, Role } from "@prisma/client";

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
