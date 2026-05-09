"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SuccessionStatus, TrainingStatus } from "@prisma/client";

interface PayrollMassResponse {
  series: Array<{ period: string; gross: number; charged: number }>;
  byCategory: Array<{ label: string; headcount: number; averageGross: number; totalGross: number }>;
  top20: Array<{ id: string; name: string; position: string; category: string; seniority: number; gross: number }>;
  summary: { currentMonthlyGross: number; currentMonthlyCharged: number; ratioToRevenue: number; payslipsRecent: number };
  projection12m: Array<{ period: string; gross: number; charged: number }>;
}

interface SuccessionItem {
  id: string;
  positionTitle: string;
  status: SuccessionStatus;
  readyInMonths: number | null;
  notes: string | null;
  incumbent: { id: string; name: string; position: string | null; seniority: number };
  successor: { id: string; name: string; position: string | null } | null;
}

interface SocialResponse {
  timeseries: Array<{ period: string; indicators: unknown }>;
  latest: {
    turnover?: { rate: number; byCategory?: Array<{ category: string; rate: number }> };
    absenteeism?: { rate: number; byReason?: Array<{ reason: string; rate: number }> };
    seniorityAvg?: number;
    genderEquity?: { femaleRatio: number; femaleSalaryGap: number };
    climate?: { score: number; lastSurveyDate: string };
    conflicts?: number;
  } | null;
  agePyramid: Array<{ range: string; count: number }>;
  headcountActive: number;
}

interface TrainingItem {
  id: string;
  title: string;
  category: string;
  provider: string | null;
  startDate: string;
  endDate: string;
  cost: string | null;
  status: TrainingStatus;
  certificateUrl: string | null;
  expiresAt: string | null;
  user: { name: string; position: string | null };
}

interface ExpiringTraining {
  id: string;
  title: string;
  category: string;
  expiresAt: string;
  daysLeft: number;
  user: { name: string; position: string | null };
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePayrollMass() {
  return useQuery({
    queryKey: ["hr", "payroll-mass"],
    queryFn: () => getJson<PayrollMassResponse>(`/api/hr/payroll-mass`),
  });
}

export function useSuccessionPlan() {
  return useQuery({
    queryKey: ["hr", "succession"],
    queryFn: () => getJson<{ items: SuccessionItem[] }>(`/api/hr/succession-plan`),
  });
}

export function useUpdateSuccession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      getJson(`/api/hr/succession-plan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hr", "succession"] }),
  });
}

export function useSocialIndicators() {
  return useQuery({
    queryKey: ["hr", "social"],
    queryFn: () => getJson<SocialResponse>(`/api/hr/social-indicators`),
  });
}

export function useTrainings(status?: string) {
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  return useQuery({
    queryKey: ["hr", "trainings", status],
    queryFn: () =>
      getJson<{
        items: TrainingItem[];
        summary: { planned: number; inProgress: number; completed: number; totalCost: string };
      }>(`/api/hr/trainings?${sp.toString()}`),
  });
}

export function useExpiringTrainings() {
  return useQuery({
    queryKey: ["hr", "trainings", "expiring"],
    queryFn: () => getJson<{ items: ExpiringTraining[] }>(`/api/hr/trainings/expiring-soon`),
  });
}
