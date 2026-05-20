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
  scoring: {
    overall: number;
    breakdown: { skills: number; experience: number; location: number; contract: number; salary: number } | null;
    matchedSkills: string[];
    missingRequirements: string[];
  };
  interviews: InterviewItem[];
  cvUrl: string | null;
  coverLetter: string;
}

export interface InterviewItem {
  id: string;
  scheduledAt: string;
  duration: number;
  mode: "ONSITE" | "PHONE" | "VIDEO";
  location: string | null;
  completed: boolean;
  feedback: string | null;
  score: number | null;
  decision: "GO" | "NO_GO" | "PENDING" | null;
  candidateConfirmed: boolean;
  interviewers: string[];
}

export interface OfferRow {
  id: string;
  reference: string;
  slug: string | null;
  title: string;
  department: string;
  contractType: string;
  category: string;
  positions: number;
  region: string;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
  viewCount: number;
  applicationsCount: number;
}

export interface OfferDetail {
  id: string;
  reference: string;
  slug: string | null;
  title: string;
  department: string;
  contractType: string;
  category: string;
  positions: number;
  region: string;
  experienceMin: number | null;
  salaryMin: string;
  salaryMax: string;
  summary: string;
  description: string;
  requirements: string;
  missions: string[];
  profileItems: string[];
  benefits: string[];
  siteId: string | null;
  expiresAt: string;
  status: string;
  applicationsCount: number;
}

export interface OfferFormInput {
  title: string;
  department?: string;
  contractType: string;
  category: string;
  positions: number;
  region?: string;
  experienceMin?: number | null;
  salaryMin?: string;
  salaryMax?: string;
  summary?: string;
  description: string;
  requirements: string;
  missions?: string[];
  profileItems?: string[];
  benefits?: string[];
  expiresAt?: string | null;
  status?: string;
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

export function useOfferDetail(id: string | null) {
  return useQuery({
    queryKey: ["rh", "recruitment", "offer", id],
    queryFn: () => getJson<OfferDetail>(`/api/rh/recruitment/offers/${id}`),
    enabled: Boolean(id),
  });
}

function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OfferFormInput) =>
      getJson<{ id: string }>("/api/rh/recruitment/offers", jsonInit("POST", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

export function useUpdateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<OfferFormInput> & { id: string }) =>
      getJson<{ ok: true }>(`/api/rh/recruitment/offers/${id}`, jsonInit("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: true }>(`/api/rh/recruitment/offers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

// ─── Entretiens ────────────────────────────────────────────────────────────

export function useScheduleInterview(applicationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { scheduledAt: string; duration: number; mode: string; location?: string }) =>
      getJson<{ id: string }>(
        `/api/rh/recruitment/applications/${applicationId}/interviews`,
        jsonInit("POST", data)
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

export function useUpdateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string;
      scheduledAt?: string;
      duration?: number;
      mode?: string;
      location?: string | null;
      completed?: boolean;
      feedback?: string | null;
      score?: number | null;
      decision?: "GO" | "NO_GO" | "PENDING" | null;
    }) => getJson<{ ok: true }>(`/api/rh/recruitment/interviews/${id}`, jsonInit("PATCH", data)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

export function useDeleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: true }>(`/api/rh/recruitment/interviews/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}

export function useRescoreApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      getJson<{ ok: true; score: number }>(`/api/rh/recruitment/applications/${id}/rescore`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "recruitment"] }),
  });
}
