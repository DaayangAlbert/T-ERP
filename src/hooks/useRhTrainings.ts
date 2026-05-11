"use client";

import { useQuery } from "@tanstack/react-query";

export interface TrainingPlan {
  ref: string;
  title: string;
  category: string;
  provider: string;
  startDate: string;
  endDate: string;
  participants: number;
  budget: number;
  status: "PLANNED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface TrainingsResponse {
  items: TrainingPlan[];
  summary: { annualBudget: number; spentYtd: number; spentRate: number; inProgress: number };
}

export interface CertificationItem {
  id: string;
  employeeKey: string;
  employeeName: string;
  type: string;
  issuedAt: string;
  expiresAt: string;
  issuedBy: string;
  daysLeft: number;
  status: "VALID" | "RECYCLE_SOON" | "EXPIRED";
}

export interface CertificationsResponse {
  items: CertificationItem[];
  summary: { total: number; valid: number; recycleSoon: number; expired: number };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTrainings() {
  return useQuery({
    queryKey: ["rh", "trainings"],
    queryFn: () => getJson<TrainingsResponse>("/api/rh/trainings"),
  });
}

export function useCertifications(expiringDays?: number) {
  const qs = expiringDays ? `?expiringDays=${expiringDays}` : "";
  return useQuery({
    queryKey: ["rh", "certifications", expiringDays ?? "all"],
    queryFn: () => getJson<CertificationsResponse>(`/api/rh/certifications${qs}`),
  });
}
