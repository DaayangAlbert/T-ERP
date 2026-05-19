"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ReconciliationStatus,
  ClosingStatus,
  InvoiceStatus,
  TaxType,
  TaxAuthority,
  DeclarationStatus,
  PaymentStatus,
  Role,
} from "@prisma/client";

interface DashboardKpis {
  todayEntries: number;
  draftToValidate: number;
  banksTotal: number;
  banksReconciled: number;
  daysToClose: number;
  checklistProgress: { done: number; total: number };
}

interface EntryItem {
  id: string;
  reference: string;
  journal: string;
  label: string;
  totalDebit: string;
  totalCredit: string;
  enteredBy: string;
  hoursSinceEntry: number;
  date: string;
  linesCount: number;
}

interface ReconciliationItem {
  bankAccountId: string;
  bank: string;
  accountNumber: string;
  primaryColor: string | null;
  bookBalance: string;
  bankBalance: string;
  gap: string;
  status: ReconciliationStatus;
  completedAt: string | null;
  reconciliationId: string | null;
}

interface ChecklistItem {
  key: string;
  label: string;
  status: "PENDING" | "DONE" | "BLOCKED";
}

interface MonthlyClosing {
  id: string;
  period: string;
  items: ChecklistItem[];
  status: ClosingStatus;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useDafAccountingDashboard() {
  return useQuery({
    queryKey: ["daf", "accounting", "dashboard"],
    queryFn: () => getJson<{ period: string; kpis: DashboardKpis }>(`/api/daf/accounting/dashboard`),
  });
}

export function useEntriesToValidate() {
  return useQuery({
    queryKey: ["daf", "accounting", "entries-to-validate"],
    queryFn: () => getJson<{ items: EntryItem[] }>(`/api/daf/accounting/entries-to-validate`),
  });
}

export function useValidateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getJson(`/api/daf/accounting/entries/${id}/validate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}

export function useRejectEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      getJson(`/api/daf/accounting/entries/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}

export function useBankReconciliations(period?: string) {
  const sp = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["daf", "accounting", "reconciliations", period],
    queryFn: () => getJson<{ period: string; items: ReconciliationItem[] }>(`/api/daf/accounting/bank-reconciliations${sp}`),
  });
}

export function useMonthlyClosing(period: string) {
  return useQuery({
    queryKey: ["daf", "accounting", "closing", period],
    queryFn: () => getJson<MonthlyClosing>(`/api/daf/accounting/monthly-closing/${period}`),
    enabled: Boolean(period),
  });
}

export function useCloseMonth(period: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getJson(`/api/daf/accounting/monthly-closing/${period}/close`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daf", "accounting"] }),
  });
}

// ════════════════════════════════════════════════════════════════════════
// Extensions Bloc 2 : anomalies, factures en attente, fiscalité, variation, audit
// ════════════════════════════════════════════════════════════════════════

export type AnomalySeverity = "danger" | "warning" | "info";

export interface AnomalyItem {
  id: string;
  severity: AnomalySeverity;
  category: "UNBALANCED" | "DUPLICATE" | "SUSPENSE_UNCLEARED" | "POST_CLOSING" | "ROUND_AMOUNT";
  title: string;
  detail: string;
  reference?: string;
  entryId?: string;
  amount?: string;
}

export function useAccountingAnomalies(period: string) {
  return useQuery({
    queryKey: ["daf", "accounting", "anomalies", period],
    queryFn: () =>
      getJson<{
        period: string;
        total: number;
        countsBySeverity: Record<AnomalySeverity, number>;
        items: AnomalyItem[];
      }>(`/api/daf/accounting/anomalies?period=${period}`),
    enabled: Boolean(period),
  });
}

export interface PendingInvoiceItem {
  id: string;
  invoiceNumber: string;
  supplier: string;
  invoiceDate: string;
  dueDate: string;
  amountTtc: string;
  status: InvoiceStatus;
  receivedAt: string;
  daysWaiting: number;
  disputeReason: string | null;
}

export interface PendingInvoicesResponse {
  /** Factures à comptabiliser (RECEIVED + PENDING_3WAY_MATCH) — même convention que la page comptable. */
  items: PendingInvoiceItem[];
  /** Factures en litige (DISPUTED) — état séparé, n'est pas dans `items`. */
  disputed: PendingInvoiceItem[];
  summary: {
    total: number;
    totalAmount: string;
    byStatus: { RECEIVED: number; PENDING_3WAY_MATCH: number };
    overdueCount: number;
    disputedCount: number;
    disputedAmount: string;
  };
  scope: { isDirection: boolean };
}

export function usePendingSupplierInvoices() {
  return useQuery({
    queryKey: ["daf", "accounting", "pending-invoices"],
    queryFn: () => getJson<PendingInvoicesResponse>(`/api/daf/accounting/pending-invoices`),
    // Auto-sync : le comptable peut comptabiliser/payer une facture pendant
    // que le DAF a la page ouverte — refresh toutes les 60 s + au retour focus.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export interface TaxCalendarItem {
  id: string;
  type: TaxType;
  typeLabel: string;
  authority: TaxAuthority;
  authorityLabel: string;
  period: string;
  dueDate: string;
  daysUntil: number;
  overdue: boolean;
  amount: string | null;
  declarationStatus: DeclarationStatus;
  paymentStatus: PaymentStatus;
}

export function useTaxCalendar() {
  return useQuery({
    queryKey: ["daf", "accounting", "tax-calendar"],
    queryFn: () =>
      getJson<{
        items: TaxCalendarItem[];
        summary: { total: number; overdueCount: number; next7Days: number; pendingAmount: string };
      }>(`/api/daf/accounting/tax-calendar`),
  });
}

export interface VariationItem {
  key: string;
  label: string;
  kind: "expense" | "revenue";
  current: string;
  previous: string;
  delta: string;
  pct: number | null;
}

export function useVariationN1(period: string) {
  return useQuery({
    queryKey: ["daf", "accounting", "variation-n1", period],
    queryFn: () =>
      getJson<{ period: string; previousPeriod: string; items: VariationItem[] }>(
        `/api/daf/accounting/variation-n1?period=${period}`
      ),
    enabled: Boolean(period),
  });
}

export interface AuditTrailItem {
  id: string;
  action: string;
  actionLabel: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  user: string;
  userRole: Role | null;
  createdAt: string;
}

export function useAccountingAuditTrail(sinceDays = 30) {
  return useQuery({
    queryKey: ["daf", "accounting", "audit-trail", sinceDays],
    queryFn: () =>
      getJson<{ items: AuditTrailItem[]; sinceDays: number }>(
        `/api/daf/accounting/audit-trail?sinceDays=${sinceDays}`
      ),
  });
}
