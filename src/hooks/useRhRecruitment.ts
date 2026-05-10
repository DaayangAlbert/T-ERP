"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppStage } from "@prisma/client";

export interface PipelineItem {
  id: string;
  candidateName: string;
  position: string;
  region: string;
  appliedAt: string;
  scoreOverall: number;
  stage: AppStage;
}

export interface PipelineColumn {
  stage: AppStage;
  label: string;
  count: number;
  items: PipelineItem[];
}

export interface RecruitmentDashboard {
  kpis: {
    offersActive: number;
    applicationsTotal: number;
    interviewsThisWeek: number;
    hiredThisMonth: number;
  };
  counts: Record<AppStage, number>;
}

export interface ApplicationDetail {
  id: string;
  candidateName: string;
  email: string;
  phone: string;
  position: string;
  region: string;
  stage: AppStage;
  appliedAt: string;
  scoring: { technical: number; soft: number; motivation: number; overall: number };
  interviews: Array<{ id: string; scheduledAt: string; mode: string; location: string | null; score: number | null }>;
  cvUrl: string | null;
  coverLetter: string;
}

export interface OfferRow {
  reference: string;
  title: string;
  department: string;
  contractType: string;
  category: string;
  positions: number;
  region: string;
  status: string;
  publishedAt: string;
  applicationsCount: number;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useRecruitmentDashboard() {
  return useQuery({
    queryKey: ["rh", "recruitment", "dashboard"],
    queryFn: () => getJson<RecruitmentDashboard>("/api/rh/recruitment/dashboard"),
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ["rh", "recruitment", "pipeline"],
    queryFn: () => getJson<{ columns: PipelineColumn[] }>("/api/rh/recruitment/pipeline"),
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: AppStage }) =>
      getJson(`/api/rh/recruitment/applications/${id}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rh", "recruitment"] });
    },
  });
}

export function useApplicationDetail(id: string | null) {
  return useQuery({
    queryKey: ["rh", "recruitment", "application", id],
    queryFn: () => getJson<ApplicationDetail>(`/api/rh/recruitment/applications/${id}`),
    enabled: Boolean(id),
  });
}

export function useOffers() {
  return useQuery({
    queryKey: ["rh", "recruitment", "offers"],
    queryFn: () => getJson<{ items: OfferRow[] }>("/api/rh/recruitment/offers"),
  });
}
