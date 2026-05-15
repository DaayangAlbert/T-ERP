"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OuvLeaveType } from "@/schemas/ouv-leave";

export interface LeaveBalance {
  year: number;
  paidLeaveAcquired: number;
  paidLeaveTaken: number;
  paidLeaveRemaining: number;
  compensatoryDays: number;
  sickDaysUsed: number;
  unpaidLeaveUsed: number;
}

export interface LeaveItem {
  id: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  hasJustificationDoc: boolean;
  status: "PENDING" | "N1_APPROVED" | "RH_APPROVED" | "REJECTED" | "CANCELLED";
  n1ValidatedAt: string | null;
  rhValidatedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  validatorName: string | null;
}

export interface LeavesListResponse {
  pending: LeaveItem[];
  history: LeaveItem[];
}

export function useLeaveBalance(year?: number) {
  return useQuery<{ year: number; balance: LeaveBalance }>({
    queryKey: ["ouv", "leaves", "balance", year ?? "current"],
    queryFn: async () => {
      const url = year ? `/api/ouv/leaves/balance?year=${year}` : "/api/ouv/leaves/balance";
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture solde impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function useLeavesList() {
  return useQuery<LeavesListResponse>({
    queryKey: ["ouv", "leaves", "list"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/leaves", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture demandes impossible");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export interface AnnualLeavePayload {
  type: Exclude<OuvLeaveType, "sick">;
  startDate: string;
  endDate: string;
  reason?: string;
}

export function useRequestLeave() {
  const qc = useQueryClient();
  return useMutation<
    {
      request: LeaveItem;
      daysCount: number;
      message: string;
    },
    Error,
    AnnualLeavePayload
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Demande refusée");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "leaves"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export interface SickReportPayload {
  startDate: string;
  endDate: string;
  symptoms?: string;
  medicalCert?: string;
}

export function useReportSick() {
  const qc = useQueryClient();
  return useMutation<
    {
      request: LeaveItem;
      cnpsNotificationRequired: boolean;
      message: string;
    },
    Error,
    SickReportPayload
  >({
    mutationFn: async (payload) => {
      const res = await fetch("/api/ouv/leaves/sick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Signalement refusé");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ouv", "leaves"] });
      qc.invalidateQueries({ queryKey: ["ouv", "dashboard"] });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const res = await fetch(`/api/ouv/leaves/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Annulation refusée");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "leaves"] }),
  });
}

export function useUploadMedicalCert() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string; medicalCert: string }>({
    mutationFn: async ({ id, medicalCert }) => {
      const res = await fetch(`/api/ouv/leaves/${id}/medical-cert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalCert }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Upload échoué");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ouv", "leaves"] }),
  });
}
