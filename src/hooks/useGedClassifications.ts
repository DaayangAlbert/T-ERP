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
