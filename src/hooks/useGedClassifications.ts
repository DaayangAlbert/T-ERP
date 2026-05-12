"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ClassificationCategoryCode =
  | "MARKETS"
  | "TECHNICAL"
  | "HR"
  | "ACCOUNTING"
  | "LEGAL"
  | "QSE"
  | "OTHER";

export type ClassificationConfidentiality = "PUBLIC" | "INTERNAL" | "RESTRICTED" | "CONFIDENTIAL";

export interface ClassificationRow {
  id: string;
  prefix: string;
  code: string;
  name: string;
  category: ClassificationCategoryCode;
  categoryLabel: string;
  dua: string;
  duaYears: number | null;
  duaTrigger: string;
  confidentiality: ClassificationConfidentiality;
  workflowCode: string | null;
  workflowName: string | null;
  requiredValidators: string[];
  documentsCount: number;
}

export interface ClassificationsResponse {
  totals: { all: number; byCategory: Record<string, number> };
  categoryLabels: Record<string, string>;
  items: ClassificationRow[];
}

export function useGedClassifications(category?: ClassificationCategoryCode | "ALL") {
  return useQuery<ClassificationsResponse>({
    queryKey: ["ged", "classifications", category ?? "ALL"],
    queryFn: async () => {
      const url = category && category !== "ALL" ? `/api/ged/classifications?category=${category}` : `/api/ged/classifications`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("Erreur chargement nomenclature");
      return r.json();
    },
  });
}

export function useCreateClassification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      prefix: string;
      code: string;
      name: string;
      category: ClassificationCategoryCode;
      dua: string;
      duaYears?: number;
      duaTrigger?: string;
      confidentiality: ClassificationConfidentiality;
      workflowCode?: string;
    }) => {
      const r = await fetch("/api/ged/classifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur création");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "classifications"] });
    },
  });
}

export interface ClassificationDetail {
  classification: {
    id: string;
    prefix: string;
    code: string;
    name: string;
    category: ClassificationCategoryCode;
    dua: string;
    duaYears: number | null;
    duaTrigger: string;
    confidentiality: ClassificationConfidentiality;
    requiredValidators: string[];
    active: boolean;
    createdAt: string;
    updatedAt: string;
    workflow: { id: string; code: string; name: string; description: string | null } | null;
  };
  stats: {
    documentsTotal: number;
    documentsActive: number;
    volumeBytes: number;
    monthlySeries: Array<{ month: string; count: number }>;
  };
  recentDocuments: Array<{
    id: string;
    name: string;
    reference: string | null;
    sizeBytes: number;
    createdAt: string;
    spaceName: string | null;
    spaceIcon: string | null;
  }>;
}

export function useClassificationDetail(id: string | null) {
  return useQuery<ClassificationDetail>({
    queryKey: ["ged", "classification-detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const r = await fetch(`/api/ged/classifications/${id}`, { credentials: "include" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur chargement");
      }
      return r.json();
    },
  });
}

export function usePatchClassification(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name?: string;
      dua?: string;
      duaYears?: number | null;
      duaTrigger?: string;
      confidentiality?: ClassificationConfidentiality;
      requiredValidators?: string[];
      workflowCode?: string | null;
    }) => {
      const r = await fetch(`/api/ged/classifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur mise à jour");
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "classifications"] });
      qc.invalidateQueries({ queryKey: ["ged", "classification-detail", id] });
    },
  });
}

export function useDeprecateClassification(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reason: string }) => {
      const r = await fetch(`/api/ged/classifications/${id}/deprecate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur");
      }
      return r.json() as Promise<{ ok: true; documentsKept: number }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ged", "classifications"] });
      qc.invalidateQueries({ queryKey: ["ged", "classification-detail", id] });
    },
  });
}
