"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReminderLevel, ReminderChannel, ReceivableStatus } from "@prisma/client";

interface AgingResponse {
  buckets: Array<{ range: string; amount: string; pct: number; color: string }>;
  summary: { totalReceivables: string; overdue: string; dso: number; paidYTD: string };
}

interface ReminderItem {
  id: string;
  invoiceRef: string;
  clientName: string;
  amount: string;
  totalAmount: string;
  daysOverdue: number;
  status: ReceivableStatus;
  currentLevel: ReminderLevel | null;
  lastReminderAt: string | null;
  lastReminderChannel: ReminderChannel | null;
  lastReminderResponse: boolean;
  reminderCount: number;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useAgingBalance() {
  return useQuery({
    queryKey: ["daf", "receivables", "aging"],
    queryFn: () => getJson<AgingResponse>(`/api/daf/receivables/aging-balance`),
  });
}

export function useActiveReminders() {
  return useQuery({
    queryKey: ["daf", "receivables", "active"],
    queryFn: () => getJson<{ items: ReminderItem[] }>(`/api/daf/receivables/active-reminders`),
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, level, channel, note }: { id: string; level: ReminderLevel; channel: ReminderChannel; note?: string }) =>
      getJson<{ id: string; note: string }>(`/api/daf/receivables/${id}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, channel, note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "receivables"] }),
  });
}
