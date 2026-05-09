"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TaxType, TaxAuthority, DeclarationStatus, PaymentStatus, AuditType, AuditStatus } from "@prisma/client";

interface DeadlineItem {
  id: string;
  type: TaxType;
  authority: TaxAuthority;
  period: string;
  dueDate?: string;
  daysLeft?: number;
  amount: string | null;
  declarationStatus: DeclarationStatus;
  paymentStatus: PaymentStatus;
  declaredAt: string | null;
  paidAt: string | null;
  receiptUrl?: string | null;
}

interface AuditItem {
  id: string;
  type: AuditType;
  authority: TaxAuthority;
  period: string;
  auditor: string | null;
  status: AuditStatus;
  startDate: string;
  endDate: string | null;
  opinion: string | null;
  adjustmentsAmount: string | null;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTaxDeadlines(days = 30) {
  return useQuery({
    queryKey: ["daf", "tax", "deadlines", days],
    queryFn: () =>
      getJson<{
        items: DeadlineItem[];
        summary: { upcomingCount: number; totalAmount: string; conformityYTD: number; vatCredit: number };
      }>(`/api/daf/tax/deadlines?days=${days}`),
  });
}

export function useRecentSubmissions() {
  return useQuery({
    queryKey: ["daf", "tax", "recent"],
    queryFn: () => getJson<{ items: DeadlineItem[] }>(`/api/daf/tax/recent-submissions`),
  });
}

export function useTaxAudits() {
  return useQuery({
    queryKey: ["daf", "tax", "audits"],
    queryFn: () => getJson<{ items: AuditItem[] }>(`/api/daf/tax/audits`),
  });
}

export function useDeclareTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/tax/deadlines/${id}/declare`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "tax"] }),
  });
}

export function usePayTax() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/tax/deadlines/${id}/pay`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "tax"] }),
  });
}
