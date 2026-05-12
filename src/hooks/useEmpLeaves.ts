"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LeaveBalance {
  year: number;
  paidLeaveAcquired: number;
  paidLeaveTaken: number;
  paidLeaveRemaining: number;
  compensatoryDays: number;
  sickDaysUsed: number;
  unpaidLeaveUsed: number;
}

export interface LeaveRequestItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  justificationDoc: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  validatorName: string | null;
}

export interface MyRequestsResponse {
  pending: LeaveRequestItem[];
  history: LeaveRequestItem[];
}

export type { CameroonHoliday } from "@/lib/holidays-cameroon";
import type { CameroonHoliday } from "@/lib/holidays-cameroon";

export interface TeamAbsence {
  userId: string;
  fullName: string;
  position: string | null;
  type: string;
  reason: string | null;
  startDate: string;
  endDate: string;
}

export interface TeamCalendarResponse {
  weekStart?: string;
  weekEnd?: string;
  teamSize?: number;
  absences: TeamAbsence[];
  reason?: string;
}

const FETCH_OPTS: RequestInit = { credentials: "same-origin" };

export function useLeaveBalance(year?: number) {
  return useQuery({
    queryKey: ["emp", "leaves", "balance", year ?? "current"],
    queryFn: async (): Promise<{ year: number; balance: LeaveBalance }> => {
      const url = year ? `/api/emp/leaves/balance?year=${year}` : "/api/emp/leaves/balance";
      const res = await fetch(url, FETCH_OPTS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: ["emp", "leaves", "my-requests"],
    queryFn: async (): Promise<MyRequestsResponse> => {
      const res = await fetch("/api/emp/leaves/my-requests", FETCH_OPTS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 15_000,
  });
}

export function useCameroonHolidays(year: number) {
  return useQuery({
    queryKey: ["emp", "leaves", "holidays", year],
    queryFn: async (): Promise<{ year: number; holidays: CameroonHoliday[] }> => {
      const res = await fetch(`/api/emp/leaves/holidays-cameroon?year=${year}`, FETCH_OPTS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}

export function useTeamAbsences() {
  return useQuery({
    queryKey: ["emp", "leaves", "team-calendar"],
    queryFn: async (): Promise<TeamCalendarResponse> => {
      const res = await fetch("/api/emp/leaves/team-calendar", FETCH_OPTS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });
}

export interface CreateLeavePayload {
  type: string;
  startDate: string;
  endDate: string;
  reason?: string;
  justificationDoc?: string;
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateLeavePayload) => {
      const res = await fetch("/api/emp/leaves/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp", "leaves"] });
      qc.invalidateQueries({ queryKey: ["emp", "dashboard"] });
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch(`/api/emp/leaves/requests/${requestId}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emp", "leaves"] });
    },
  });
}
