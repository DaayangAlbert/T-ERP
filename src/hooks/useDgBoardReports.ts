"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BoardReportStatus, BoardReportType } from "@prisma/client";

export interface BoardReportSummary {
  id: string;
  type: BoardReportType;
  period: string;
  boardDate: string;
  status: BoardReportStatus;
  author: string;
  sentToCount: number;
  createdAt: string;
}

export interface BoardReportDetail {
  id: string;
  type: BoardReportType;
  period: string;
  boardDate: string;
  status: BoardReportStatus;
  chapters: Record<string, boolean>;
  comments: Record<string, string>;
  data: {
    generatedAt: string;
    kpis: {
      revenue: number;
      margin: number;
      treasury: number;
      activeSites: number;
      headcount: number;
      backlog: number;
    };
    topSites: Array<{ code: string; name: string; progress: number; margin: number; status: string; budget: string }>;
    hr: { headcount: number; permanentCount: number; temporaryCount: number; salaryMassMonthly: number };
    strategic: { objectives: Array<{ title: string; category: string; progress: number; status: string }> };
    risks: string[];
  };
  sentTo: Array<{ email: string; name: string; sentAt: string }>;
  author: { firstName: string; lastName: string; email: string };
  tenant: { name: string } | null;
  pdfUrl: string | null;
  createdAt: string;
}

export function useDgBoardReports() {
  return useQuery({
    queryKey: ["dg-board-reports"],
    queryFn: async (): Promise<{ items: BoardReportSummary[]; total: number }> => {
      const res = await fetch("/api/dg/board-reports");
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useBoardReportDetail(id: string | null) {
  return useQuery({
    queryKey: ["dg-board-report", id],
    queryFn: async (): Promise<BoardReportDetail> => {
      const res = await fetch(`/api/dg/board-reports/${id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    enabled: Boolean(id),
  });
}

export function useCreateBoardReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<{ id: string }> => {
      const res = await fetch("/api/dg/board-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-board-reports"] }),
  });
}

export function useSendBoardReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/dg/board-reports/${input.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-board-reports"] }),
  });
}

export function useDeleteBoardReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dg/board-reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-board-reports"] }),
  });
}
