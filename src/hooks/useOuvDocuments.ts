"use client";

import { useQuery } from "@tanstack/react-query";

export type DocumentType =
  | "CNI"
  | "CONTRACT"
  | "MEDICAL_CERT"
  | "TRAINING_CERT"
  | "BANK_RIB"
  | "CV"
  | "OTHER";

export interface DocumentItem {
  id: string;
  type: DocumentType;
  typeLabel: string;
  title: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface DocumentsResponse {
  documents: DocumentItem[];
  counts: { personal: number; attestations: number; payslips: number };
}

export function useOuvDocuments() {
  return useQuery<DocumentsResponse>({
    queryKey: ["ouv", "documents"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/documents", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture documents impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function documentEmoji(type: DocumentType): string {
  switch (type) {
    case "CNI":
      return "🪪";
    case "CONTRACT":
      return "📄";
    case "MEDICAL_CERT":
      return "🏥";
    case "TRAINING_CERT":
      return "🎓";
    case "BANK_RIB":
      return "🏦";
    case "CV":
      return "📝";
    case "OTHER":
      return "📎";
  }
}
