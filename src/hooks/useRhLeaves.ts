"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaveType, LeaveStatus, AbsenceReason } from "@prisma/client";

export interface PendingLeave {
  id: string;
  employeeKey: string;
  employeeName: string;
  type: LeaveType;
  typeLabel: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string | null;
  status: LeaveStatus;
  n1ValidatedAt: string | null;
}

export interface LeaveCalendar {
  month: string;
  daysInMonth: number;
  rows: Array<{
    employeeKey: string;
    employeeName: string;
    cells: Array<{ day: number; type: LeaveType | null; color: string | null }>;
  }>;
  legend: Array<{ type: string; color: string }>;
}

export interface LeaveBalanceRow {
  employeeKey: string;
  employeeName: string;
  paidLeaveAcquired: number;
  paidLeaveTaken: number;
  rttBalance: number;
  lastTakenAt: string | null;
}

export interface AbsenceRow {
  id: string;
  employeeKey: string;
  employeeName: string;
  date: string;
  reason: AbsenceReason;
  reasonLabel: string;
  justified: boolean;
  reportedBy: string;
  notes: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function usePendingLeaves() {
  return useQuery({
    queryKey: ["rh", "leaves", "pending"],
    queryFn: () => getJson<{ items: PendingLeave[] }>("/api/rh/leaves/pending"),
  });
}

export function useApproveLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/rh/leaves/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rh", "leaves"] });
    },
  });
}

export function useRejectLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      getJson(`/api/rh/leaves/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rh", "leaves"] }),
  });
}

export function useLeaveCalendar(month: string) {
  return useQuery({
    queryKey: ["rh", "leaves", "calendar", month],
    queryFn: () => getJson<LeaveCalendar>(`/api/rh/leaves/calendar?month=${month}`),
    enabled: Boolean(month),
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ["rh", "leaves", "balances"],
    queryFn: () => getJson<{ items: LeaveBalanceRow[] }>(`/api/rh/leaves/balances`),
  });
}

export function useAbsences() {
  return useQuery({
    queryKey: ["rh", "absences"],
    queryFn: () => getJson<{ items: AbsenceRow[] }>(`/api/rh/absences`),
  });
}
