"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CptEntryLine {
  accountCode: string;
  thirdPartyId?: string | null;
  description: string;
  debit: number;
  credit: number;
  siteId?: string | null;
}

export interface CptEntry {
  id: string;
  reference: string;
  entryDate: string;
  description: string;
  journalCode: string;
  site: { code: string; name: string } | null;
  siteId: string | null;
  status: "DRAFT" | "VALIDATED" | "CANCELLED";
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMimeType: string | null;
  attachmentSizeBytes: number | null;
  lines: CptEntryLine[];
  totalDebit: number;
  totalCredit: number;
}

export function useCptEntries(journal: string, period: string) {
  return useQuery({
    queryKey: ["comptable", "entries", journal, period],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (journal) params.set("journal", journal);
      if (period) params.set("period", period);
      const res = await fetch(`/api/comptable/entries?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: CptEntry[];
        totals: { debit: number; credit: number; balanced: boolean };
        scope: { isDirection: boolean; siteIds: string[] | null };
      }>;
    },
  });
}

export interface CreateEntryPayload {
  journalCode: string;
  entryDate: string;
  reference: string;
  description: string;
  siteId?: string | null;
  lines: CptEntryLine[];
  validate?: boolean;
  /** Pièce jointe justificative (PDF, image, Word, Excel — max 20 Mo). */
  attachment?: File | null;
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEntryPayload) => {
      const { attachment, ...payload } = input;
      let res: Response;
      if (attachment) {
        // Multipart : payload sérialisé + fichier
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));
        fd.append("attachment", attachment);
        res = await fetch("/api/comptable/entries", {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
      } else {
        res = await fetch("/api/comptable/entries", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "entries"] }),
  });
}

export function useValidateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/comptable/entries/${id}/validate`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "entries"] }),
  });
}
