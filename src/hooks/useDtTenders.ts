"use client";

import { useQuery } from "@tanstack/react-query";

export interface TenderItem {
  id: string;
  reference: string;
  title: string;
  moaName: string;
  moaType: string;
  workType: string;
  estimatedBudget: number;
  submissionDeadline: string;
  stage: string;
  probability: number;
  studyCost: number;
  ourBidAmount: number | null;
  ourMargin: number | null;
  awarded: boolean | null;
  itemsCount: number;
  studyOwner: string | null;
}

export interface TendersListResponse {
  items: TenderItem[];
  kpis: {
    inProgressCount: number;
    pipelineVolume: number;
    transformationRate: number;
    ytdStudyCost: number;
  };
}

export function useDtTenders(view: "in_progress" | "imminent" | "this_month" | "history") {
  return useQuery({
    queryKey: ["dt", "tenders", view],
    queryFn: async (): Promise<TendersListResponse> => {
      const res = await fetch(`/api/dt/tenders?view=${view}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}

export interface TenderDetail extends TenderItem {
  awardedTo: string | null;
  items: Array<{
    id: string;
    code: string;
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  pricingSummary: { totalBpu: number; estimatedBudget: number; gap: number };
}

export function useDtTenderDetail(id: string | null) {
  return useQuery({
    queryKey: ["dt", "tender", id],
    enabled: !!id,
    queryFn: async (): Promise<TenderDetail> => {
      const res = await fetch(`/api/dt/tenders/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
