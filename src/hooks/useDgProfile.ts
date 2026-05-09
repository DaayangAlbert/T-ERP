"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventType, BenefitType, BonusType, BonusStatus } from "@prisma/client";

interface Preferences {
  dashboardWidgets: string[];
  alertThresholds: { treasuryMin?: string; marginMin?: number; validationOverdueDays?: number };
  notificationChannels: Record<string, string[]>;
  dailyReportEnabled: boolean;
  dailyReportTime: string | null;
  numberFormat: "M_FCFA" | "MD_FCFA" | "RAW";
}

interface SignatureInfo {
  signatureUrl: string | null;
  initialsUrl: string | null;
  uploadedAt: string | null;
}

interface AgendaEventItem {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  type: EventType;
  externalId: string | null;
}

export interface Mandate {
  entity: string;
  role: string;
  since: string;
  end?: string | null;
}

export interface Shareholding {
  entity: string;
  percent: number;
  value?: string | null;
}

export interface Conflict {
  description: string;
  mitigation?: string;
}

interface InterestDeclaration {
  id: string;
  year: number;
  mandates: Mandate[];
  shareholdings: Shareholding[];
  conflictsOfInterest: Conflict[];
  declaredAt: string;
  validUntil: string;
}

interface BenefitItem {
  id: string;
  type: BenefitType;
  description: string;
  monthlyValue: string;
  fiscalValue: string;
  startDate: string;
  endDate: string | null;
}

interface BonusItem {
  id: string;
  fiscalYear: number;
  bonusType: BonusType;
  formula: string | null;
  targetAmount: string;
  actualAmount: string | null;
  status: BonusStatus;
  paidAt: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePreferences() {
  return useQuery({
    queryKey: ["dg-profile", "preferences"],
    queryFn: () => getJson<Preferences>(`/api/users/me/preferences`),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Preferences>) =>
      getJson(`/api/users/me/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-profile", "preferences"] }),
  });
}

export function useSignature() {
  return useQuery({
    queryKey: ["dg-profile", "signature"],
    queryFn: () => getJson<SignatureInfo>(`/api/users/me/signature`),
  });
}

export function useUploadSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { signatureUrl?: string | null; initialsUrl?: string | null }) =>
      getJson(`/api/users/me/signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-profile", "signature"] }),
  });
}

export function useAgenda(from?: string, to?: string) {
  const sp = new URLSearchParams();
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  return useQuery({
    queryKey: ["dg-profile", "agenda", from, to],
    queryFn: () => getJson<{ items: AgendaEventItem[] }>(`/api/users/me/agenda?${sp.toString()}`),
  });
}

export function useCreateAgendaEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; startAt: string; endAt: string; location?: string; type?: string }) =>
      getJson(`/api/users/me/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-profile", "agenda"] }),
  });
}

export function useDeleteAgendaEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/users/me/agenda/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-profile", "agenda"] }),
  });
}

export function useInterests() {
  return useQuery({
    queryKey: ["dg-profile", "interests"],
    queryFn: () =>
      getJson<{ items: InterestDeclaration[]; renewalDue: boolean; renewalDeadline: string | null }>(
        `/api/users/me/interests`
      ),
  });
}

export function useSubmitInterests() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number; mandates: Mandate[]; shareholdings: Shareholding[]; conflictsOfInterest: Conflict[] }) =>
      getJson(`/api/users/me/interests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-profile", "interests"] }),
  });
}

export function useActivity(days = 30) {
  return useQuery({
    queryKey: ["dg-profile", "activity", days],
    queryFn: () =>
      getJson<{
        items: Array<{ id: string; action: string; entityType: string | null; entityId: string | null; ipAddress: string | null; createdAt: string }>;
        summary: { total: number; days: number; byDay: Record<string, number>; byModule: Record<string, number> };
      }>(`/api/users/me/activity?days=${days}`),
  });
}

export function useBenefitsInKind() {
  return useQuery({
    queryKey: ["dg-profile", "benefits"],
    queryFn: () =>
      getJson<{
        items: BenefitItem[];
        summary: { total: number; totalMonthly: string; totalFiscal: string; totalAnnual: string };
      }>(`/api/users/me/benefits-in-kind`),
  });
}

export function useBonuses() {
  return useQuery({
    queryKey: ["dg-profile", "bonuses"],
    queryFn: () => getJson<{ items: BonusItem[] }>(`/api/users/me/bonuses`),
  });
}

export function useTotalCompensation(year: number) {
  return useQuery({
    queryKey: ["dg-profile", "compensation", year],
    queryFn: () =>
      getJson<{
        year: number;
        baseSalaryAnnual: string;
        variableBonusTarget: string;
        variableBonusActual: string;
        benefitsAnnual: string;
        indemnitiesAnnual: string;
        employerChargesAnnual: string;
        totalEmployerCost: string;
        comparison: { year: number; totalEmployerCost: string };
      }>(`/api/users/me/total-compensation?year=${year}`),
  });
}

export function useStcSimulation() {
  return useQuery({
    queryKey: ["dg-profile", "stc"],
    queryFn: () =>
      getJson<{
        user: { name: string; seniorityYears: number; hireDate: string | null };
        monthlyAvg: string;
        components: {
          ruptureIndemnity: string;
          ruptureMonths: number;
          unpaidLeave: string;
          noticePeriod: string;
          bonusProRata: string;
        };
        total: string;
        note: string;
      }>(`/api/users/me/stc-simulation`),
  });
}
