"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ToolLoanStatus =
  | "REQUESTED"
  | "ISSUED"
  | "RETURNED"
  | "OVERDUE"
  | "LOST"
  | "CANCELLED";

export interface ToolLoanItem {
  id: string;
  toolName: string;
  toolCategory: string | null;
  serialNumber: string | null;
  status: ToolLoanStatus;
  requestedAt: string;
  requestReason: string | null;
  issuedAt: string | null;
  issuedByName: string | null;
  dueDate: string | null;
  isPermanent: boolean;
  returnedAt: string | null;
  notes: string | null;
  isOverdue: boolean;
}

export interface ToolsResponse {
  active: ToolLoanItem[];
  pending: ToolLoanItem[];
  history: ToolLoanItem[];
  stats: { active: number; pending: number; overdue: number };
}

export function useOuvTools() {
  return useQuery<ToolsResponse>({
    queryKey: ["ouv", "tools"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/tools/mine", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture outils impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useRequestTool() {
  const qc = useQueryClient();
  return useMutation<
    { loan: { id: string; toolName: string; status: string }; message: string },
    Error,
    { toolName: string; toolCategory?: string; reason: string; isPermanent?: boolean }
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/tools/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Demande refusée");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "tools"] }),
  });
}
