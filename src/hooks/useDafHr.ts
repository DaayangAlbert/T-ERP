"use client";

import { useQuery } from "@tanstack/react-query";

export interface HrFinancialOverview {
  currentMonth: {
    payrollMass: number;
    monthlyRevenue: number;
    ratioPercent: number;
  };
  trend: Array<{ period: string; massCharged: number; ratio: number }>;
  byCategory: Array<{ category: string; share: number; headcount: number; chargedCost: number; avgPerEmployee: number }>;
  hourlyCost: Array<{ category: string; hourly: number }>;
  longTermCommitments: { pensionFund: number; mutualFund: number; total: number };
}

export interface ProvisionItem {
  id: string;
  type: string;
  label: string;
  amount: string;
  calculatedAt: string;
  periodEnd: string;
  notes: string | null;
}

export interface ProvisionsData {
  items: ProvisionItem[];
  summary: {
    total: string;
    count: number;
    byType: Array<{ type: string; label: string; total: string; count: number }>;
  };
}

export interface DepartureItem {
  id: string;
  employeeName: string;
  position: string | null;
  type: string;
  typeLabel: string;
  departureDate: string;
  severancePay: string;
  unusedLeavePay: string;
  bonusProrata: string;
  totalCost: string;
  status: string;
}

export interface DeparturesData {
  items: DepartureItem[];
  summary: {
    total: number;
    provisionedCount: number;
    totalProvisionAmount: string;
    avgCost: string;
    totalCost: string;
    byType: Array<{ type: string; label: string; count: number; total: string }>;
  };
}

export interface OvertimeData {
  threshold: number;
  summary: { totalCost: number; totalHours: number; alertsCount: number; topEmployeesCount: number };
  topEmployees: Array<{
    name: string;
    position: string | null;
    siteName: string | null;
    overtimeHours: number;
    overtimeCost: number;
    aboveThreshold: boolean;
  }>;
  bySite: Array<{ name: string; hours: number; cost: number }>;
}

export interface SubsidiesData {
  employmentAids: Array<{ ref: string; scheme: string; description: string; expectedAmount: number; status: string; endDate: string }>;
  exemptions: Array<{ type: string; count: number; monthlySaving: number }>;
  trainingCredits: Array<{ provider: string; year: number; accumulated: number; recovered: number; remaining: number; expiresAt: string }>;
  summary: {
    totalEmploymentExpected: number;
    monthlyExemptionTotal: number;
    annualExemptionTotal: number;
    remainingTrainingCredits: number;
  };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useHrFinancialOverview() {
  return useQuery({
    queryKey: ["daf", "hr", "financial-overview"],
    queryFn: () => getJson<HrFinancialOverview>(`/api/daf/hr/financial-overview`),
  });
}

export function useSocialProvisions() {
  return useQuery({
    queryKey: ["daf", "hr", "social-provisions"],
    queryFn: () => getJson<ProvisionsData>(`/api/daf/hr/social-provisions`),
  });
}

export function useDepartures() {
  return useQuery({
    queryKey: ["daf", "hr", "departures"],
    queryFn: () => getJson<DeparturesData>(`/api/daf/hr/departures`),
  });
}

export function useOvertimeSummary() {
  return useQuery({
    queryKey: ["daf", "hr", "overtime"],
    queryFn: () => getJson<OvertimeData>(`/api/daf/hr/overtime-summary`),
  });
}

export function useSubsidies() {
  return useQuery({
    queryKey: ["daf", "hr", "subsidies"],
    queryFn: () => getJson<SubsidiesData>(`/api/daf/hr/subsidies`),
  });
}
