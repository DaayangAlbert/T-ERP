"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OuvAttestationType } from "@/schemas/ouv-attestation";

export interface AttestationItem {
  id: string;
  type: OuvAttestationType;
  typeLabel: string;
  purpose: string | null;
  status: "PENDING" | "IN_PREPARATION" | "READY" | "DELIVERED" | "REJECTED" | "CANCELLED";
  preparedByName: string | null;
  preparedAt: string | null;
  documentUrl: string | null;
  expectedReadyAt: string | null;
  rejectionReason: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export function useAttestations() {
  return useQuery<{ attestations: AttestationItem[] }>({
    queryKey: ["ouv", "attestations"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/attestations", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture attestations impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useRequestAttestation() {
  const qc = useQueryClient();
  return useMutation<
    {
      attestation: {
        id: string;
        type: OuvAttestationType;
        typeLabel: string;
        status: string;
        expectedReadyAt: string | null;
      };
      message: string;
    },
    Error,
    { type: OuvAttestationType; purpose?: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/attestations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Demande refusée");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "attestations"] }),
  });
}

export function useCancelAttestation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/ouv/attestations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Annulation refusée");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "attestations"] }),
  });
}
