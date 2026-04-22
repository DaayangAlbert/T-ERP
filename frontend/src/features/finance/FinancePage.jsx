import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Landmark,
  Link2,
  Plus,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { EditableFieldList, EditableFieldRow } from "@/components/ui/editable-field-list";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { useAuth } from "@/features/auth/AuthContext";
import { FinanceOperatingModelBoard } from "@/features/finance/components/FinanceOperatingModelBoard";
import { buildFinanceOperatingModel } from "@/features/finance/modules";
import { httpClient } from "@/shared/api/httpClient";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { cn } from "@/shared/utils/cn";
import { getRoleWorkspaceFlags } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const ACCOUNT_CLASSES = ["asset", "liability", "expense", "revenue", "equity", "treasury", "tax"];
const JOURNAL_TYPES = ["purchase", "sales", "cash", "bank", "misc"];
const PARTNER_TYPES = ["customer", "supplier", "both"];
const TREASURY_TYPES = ["cash", "bank", "mobile_money"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money"];
const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const INVOICE_CREATION_STATUSES = ["draft", "sent"];
const MAJOR_EXPENSE_APPROVAL_THRESHOLD = 1000000;
const FINANCE_PANEL_STORAGE_KEY = "finance.activePanel";
const FINANCE_PANELS = ["all", "dashboard", "daf", "ops", "history"];
const OPS_PANELS = ["all", "comptes", "budgets", "depenses", "factures"];
const SELECT_CLASS = LIST_SELECT_CLASS;
const panelTransitionClass =
  "rounded-2xl animate-[financeFadeIn_220ms_ease-out]";

function formatMoney(value, currency = "XAF", locale = "fr-FR") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}

function formatCompactMoney(value, currency = "XAF", locale = "fr-FR") {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absolute >= 1000000000) {
    return `${sign}${(absolute / 1000000000).toLocaleString(locale, { maximumFractionDigits: 2 })} Md ${currency}`;
  }
  if (absolute >= 1000000) {
    return `${sign}${(absolute / 1000000).toLocaleString(locale, { maximumFractionDigits: 2 })} M ${currency}`;
  }
  if (absolute >= 1000) {
    return `${sign}${(absolute / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} K ${currency}`;
  }
  return formatMoney(amount, currency, locale);
}

function formatDate(value, locale = "fr-FR") {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function formatCode(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function formatRate(value, locale = "fr-FR") {
  return `${Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 2 })}%`;
}

function clampPercent(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.min(Math.max(amount, 0), 100);
}

function normalizePayload(payload, integerFields = []) {
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== "" && value !== null && value !== undefined)
      .map(([key, value]) => [key, integerFields.includes(key) ? Number(value) : value]),
  );
}

function statusVariant(value) {
  if (["approved", "paid", "collected", "posted"].includes(value)) return "success";
  if (["overdue", "cancelled", "rejected"].includes(value)) return "danger";
  if (["pending", "partial", "partially_paid", "draft"].includes(value)) return "warning";
  return "info";
}

function MetricCard({ icon: Icon, label, value, tone = "text-white", helper = null }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-white/65">{label}</p>
          <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
          {helper ? <p className="mt-2 text-xs text-white/70">{helper}</p> : null}
        </div>
        <div className="rounded-full border border-white/15 bg-black/15 p-2 text-white/80">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        {eyebrow && <p className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">{eyebrow}</p>}
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-600 dark:text-slate-300">{text}</p>;
}

function StatusTag({ value }) {
  return <Badge variant={statusVariant(value)}>{formatCode(value)}</Badge>;
}

function getBudgetUseVariant(rate) {
  if (rate > 100) return "danger";
  if (rate > 85) return "warning";
  return "success";
}

function getDaysOverdue(value) {
  if (!value) return 0;
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffInDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays > 0 ? diffInDays : 0;
}

function getInvoiceDisplayStatus(item) {
  return item?.effective_status || item?.status || "";
}

function canSendInvoice(item) {
  return getInvoiceDisplayStatus(item) === "draft" && Number(item?.amount_paid || 0) <= 0;
}

function canCancelInvoice(item) {
  const displayStatus = getInvoiceDisplayStatus(item);
  return ["draft", "sent", "overdue"].includes(displayStatus) && Number(item?.amount_paid || 0) <= 0;
}

function getExpenseProofGap(item) {
  const attachmentCount = Array.isArray(item?.attachment_urls) ? item.attachment_urls.length : 0;
  const missingReference = !item?.document_reference;
  const missingAttachment = attachmentCount === 0;

  if (missingReference && missingAttachment) {
    return { label: "Reference + piece manquantes", variant: "danger" };
  }
  if (missingAttachment) {
    return { label: "Piece jointe manquante", variant: "warning" };
  }
  if (missingReference) {
    return { label: "Reference manquante", variant: "warning" };
  }
  return { label: "Complet", variant: "success" };
}

function FinanceDataTable({ rows, columns, emptyText, getRowKey }) {
  if (!rows.length) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-[920px] w-full text-sm">
        <thead className="bg-slate-100/90 dark:bg-slate-900/80">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
          {rows.map((row, index) => {
            const rowKey = getRowKey ? getRowKey(row, index) : row?.id ?? index;

            return (
              <tr key={rowKey} className="transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200 ${column.className || ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DafSummaryCard({ label, value, helper, valueClassName = "text-slate-900 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${valueClassName}`}>{value}</p>
      {helper ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{helper}</p> : null}
    </div>
  );
}

function WorkflowStageCard({
  title,
  count,
  amount,
  helper,
  tone = "slate",
  actionLabel,
  onAction,
}) {
  const toneClasses = {
    amber: "border-amber-200 bg-amber-50/80",
    emerald: "border-emerald-200 bg-emerald-50/80",
    rose: "border-rose-200 bg-rose-50/80",
    cyan: "border-cyan-200 bg-cyan-50/80",
    slate: "border-slate-200 bg-slate-50/80",
  };

  return (
    <Card className={toneClasses[tone] || toneClasses.slate}>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{count}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{amount}</p>
      {helper ? <p className="mt-2 text-sm text-slate-600">{helper}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="outline" className="mt-4 w-full justify-center" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}

function FinanceWorkspaceMetaItem({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur-sm">
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl border border-white/20 bg-white/15 p-1.5 text-white/80">
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-white/65">{label}</p>
          <p className="mt-0.5 text-[1rem] font-semibold leading-tight text-white sm:text-[1.12rem]">{value}</p>
          {helper ? <p className="mt-0.5 text-[11px] leading-snug text-white/72">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

function FinanceWorkspaceProgressItem({ label, value, fillClassName, helper }) {
  const safeValue = clampPercent(value);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/72">{label}</p>
          {helper ? <p className="mt-1 text-xs text-white/65">{helper}</p> : null}
        </div>
        <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white">
          {Math.round(safeValue)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/20">
        <div className={cn("h-full rounded-full transition-[width]", fillClassName)} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function PaymentHistoryList({ rows, emptyText, locale = "fr-FR", currency = "XAF" }) {
  if (!rows.length) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {rows.map((item) => (
        <div
          key={`payment-history-${item.id}`}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                {item.reference || item.external_reference || `PAY-${item.id}`}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {formatDate(item.payment_date, locale)} - {formatCode(item.payment_method || "non_renseigne")}
              </p>
              {item.notes ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.notes}</p> : null}
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${
                  item.payment_direction === "outgoing" ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {item.payment_direction === "outgoing" ? "-" : "+"}
                {formatMoney(item.amount, item.currency || currency, locale)}
              </p>
              {item.status ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatCode(item.status)}</p> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinancePage() {
  const { t, i18n } = useTranslation();
  const { tenantId, user } = useAuth();
  const { isComptable, canManageFinance } = getRoleWorkspaceFlags(user);
  const isDafWorkspace =
    user?.operational_profile_code === "daf" ||
    (Array.isArray(user?.roles) && user.roles.includes("daf"));
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const canLoadPayrollData =
    canLoadTenantData &&
    (user?.permissions?.includes("payroll.read") || user?.permissions?.includes("payroll.manage"));
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const today = new Date().toISOString().slice(0, 10);

  const { data: summary, refetch: refetchSummary } = useApiQuery("/finance/summary", { enabled: canLoadTenantData });
  const { data: dashboard, refetch: refetchDashboard } = useApiQuery("/finance/reports/dashboard", { enabled: canLoadTenantData });
  const { data: profitability, refetch: refetchProfitability } = useApiQuery("/finance/reports/project-profitability", { enabled: canLoadTenantData });
  const { data: cashFlow, refetch: refetchCashFlow } = useApiQuery("/finance/reports/cash-flow", { enabled: canLoadTenantData });
  const { data: taxSummary, refetch: refetchTaxSummary } = useApiQuery("/finance/reports/tax-summary", { enabled: canLoadTenantData });
  const { data: overdueInvoices, refetch: refetchOverdueInvoices } = useApiQuery("/finance/reports/overdue-invoices", { enabled: canLoadTenantData });
  const { data: financeNotifications, refetch: refetchFinanceNotifications } = useApiQuery("/finance/notifications", { enabled: canLoadTenantData });
  const { data: accounts, refetch: refetchAccounts } = useApiQuery("/finance/accounts", { enabled: canLoadTenantData });
  const { data: journals, refetch: refetchJournals } = useApiQuery("/finance/journals", { enabled: canLoadTenantData });
  const { data: partners, refetch: refetchPartners } = useApiQuery("/finance/partners", { enabled: canLoadTenantData });
  const { data: treasuryAccounts, refetch: refetchTreasuryAccounts } = useApiQuery("/finance/treasury-accounts", { enabled: canLoadTenantData });
  const { data: budgets, refetch: refetchBudgets } = useApiQuery("/finance/budgets", { enabled: canLoadTenantData });
  const { data: expenses, refetch: refetchExpenses } = useApiQuery("/finance/expenses", { enabled: canLoadTenantData });
  const { data: revenues, refetch: refetchRevenues } = useApiQuery("/finance/revenues", { enabled: canLoadTenantData });
  const { data: invoices, refetch: refetchInvoices } = useApiQuery("/finance/invoices", { enabled: canLoadTenantData });
  const { data: payments, refetch: refetchPayments } = useApiQuery("/finance/payments", { enabled: canLoadTenantData });
  const { data: projects } = useApiQuery("/projects", { enabled: canLoadTenantData });
  const { mutate, loading: saving, error: mutationError } = useApiMutation();

  const [accountForm, setAccountForm] = useState({ code: "", name: "", account_class: "expense" });
  const [journalForm, setJournalForm] = useState({ code: "", name: "", journal_type: "misc" });
  const [partnerForm, setPartnerForm] = useState({ legal_name: "", partner_type: "customer", email: "", phone: "" });
  const [treasuryForm, setTreasuryForm] = useState({
    code: "",
    name: "",
    account_type: "bank",
    opening_balance: "",
    alert_threshold: "",
  });
  const [budgetForm, setBudgetForm] = useState({ project_id: "", version_label: "", total_budget: "", notes: "" });
  const [expenseForm, setExpenseForm] = useState({
    project_id: "",
    partner_id: "",
    treasury_account_id: "",
    category: "",
    amount: "",
    tax_rate: "",
    expense_date: today,
    payment_method: "cash",
    document_reference: "",
    description: "",
    approval_status: "pending",
  });
  const [revenueForm, setRevenueForm] = useState({
    project_id: "",
    partner_id: "",
    treasury_account_id: "",
    revenue_type: "",
    amount: "",
    tax_rate: "",
    revenue_date: today,
    payment_method: "bank_transfer",
    reference: "",
    description: "",
  });
  const [invoiceForm, setInvoiceForm] = useState({
    project_id: "",
    customer_id: "",
    customer_name: "",
    amount_total: "",
    tax_rate: "",
    issued_on: today,
    due_on: "",
    status: "draft",
    notes: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: "",
    treasury_account_id: "",
    amount: "",
    payment_date: today,
    payment_method: "bank_transfer",
    reference: "",
  });
  const [expenseSettlementForm, setExpenseSettlementForm] = useState({
    expense_id: "",
    treasury_account_id: "",
    amount: "",
    payment_date: today,
    payment_method: "bank_transfer",
    reference: "",
  });
  const [revenueCollectionForm, setRevenueCollectionForm] = useState({
    revenue_id: "",
    treasury_account_id: "",
    amount: "",
    payment_date: today,
    payment_method: "bank_transfer",
    reference: "",
  });
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [activeFinancePanel, setActiveFinancePanel] = useState(() => {
    if (typeof window === "undefined") return "all";
    const storedValue = window.localStorage.getItem(FINANCE_PANEL_STORAGE_KEY);
    if (["all", "dashboard", "daf", "ops", "history"].includes(storedValue || "")) return storedValue;
    return "all";
  });
  const [activeOperationsSection, setActiveOperationsSection] = useState("all");
  const [linkCopied, setLinkCopied] = useState(false);
  const scopedProjectId = selectedProjectId === "all" ? null : Number(selectedProjectId);
  const { data: scopedSummary } = useApiQuery("/finance/summary", {
    enabled: canLoadTenantData && Number.isFinite(scopedProjectId) && scopedProjectId > 0,
    params: Number.isFinite(scopedProjectId) && scopedProjectId > 0 ? { project_id: scopedProjectId } : undefined,
  });
  const { data: payrollStatus } = useApiQuery("/payroll/status", { enabled: canLoadPayrollData });
  const { data: payrollEmployeesData } = useApiQuery("/payroll/employees", { enabled: canLoadPayrollData });
  const { data: payrollPeriodsData } = useApiQuery("/payroll/periods", { enabled: canLoadPayrollData });
  const { data: payrollRunsData } = useApiQuery("/payroll/runs", { enabled: canLoadPayrollData });
  const { data: payrollLeaveRequestsData } = useApiQuery("/payroll/leave-requests", { enabled: canLoadPayrollData });
  const { data: selectedProjectWorkspace } = useApiQuery(
    Number.isFinite(scopedProjectId) && scopedProjectId > 0 ? `/projects/${scopedProjectId}/workspace` : "/projects/0/workspace",
    {
      enabled: canLoadTenantData && Number.isFinite(scopedProjectId) && scopedProjectId > 0,
    },
  );

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.finance" />;
  }

  const updateForm = (setter) => (key, value) => setter((current) => ({ ...current, [key]: value }));
  const updateAccount = updateForm(setAccountForm);
  const updateJournal = updateForm(setJournalForm);
  const updatePartner = updateForm(setPartnerForm);
  const updateTreasury = updateForm(setTreasuryForm);
  const updateBudget = updateForm(setBudgetForm);
  const updateExpense = updateForm(setExpenseForm);
  const updateRevenue = updateForm(setRevenueForm);
  const updateInvoice = updateForm(setInvoiceForm);
  const updatePayment = updateForm(setPaymentForm);
  const updateExpenseSettlement = updateForm(setExpenseSettlementForm);
  const updateRevenueCollection = updateForm(setRevenueCollectionForm);

  const projectItems = projects?.items || [];
  const accountItems = accounts?.items || [];
  const journalItems = journals?.items || [];
  const partnerItems = partners?.items || [];
  const treasuryItems = treasuryAccounts?.items || [];
  const budgetItems = budgets?.items || [];
  const expenseItems = expenses?.items || [];
  const revenueItems = revenues?.items || [];
  const invoiceItems = invoices?.items || [];
  const paymentItems = payments?.items || [];
  const profitabilityItems = profitability?.items || [];
  const overdueItems = overdueInvoices?.items || [];
  const notificationItems = financeNotifications?.items || [];
  const alertItems = dashboard?.alerts || [];
  const movementItems = cashFlow?.recent_movements || [];
  const payrollEmployees = payrollEmployeesData?.items || [];
  const payrollPeriods = payrollPeriodsData?.items || [];
  const payrollRuns = payrollRunsData?.items || [];
  const payrollLeaveRequests = payrollLeaveRequestsData?.items || [];
  const selectedProjectReportItems = selectedProjectWorkspace?.reports?.items || [];

  const customerItems = partnerItems.filter((item) => item.partner_type === "customer" || item.partner_type === "both");
  const supplierItems = partnerItems.filter((item) => item.partner_type === "supplier" || item.partner_type === "both");
  const expenseSettlementCandidates = useMemo(
    () =>
      expenseItems.filter(
        (item) =>
          item.approval_status === "approved" &&
          Number(item.amount_due || 0) > 0 &&
          item.payment_status !== "paid",
      ),
    [expenseItems],
  );
  const revenueCollectionCandidates = useMemo(
    () =>
      revenueItems.filter(
        (item) =>
          Number(item.amount_due || 0) > 0 &&
          item.collection_status !== "collected",
      ),
    [revenueItems],
  );
  const invoicePaymentCandidates = useMemo(
    () =>
      invoiceItems
        .filter((item) => Number(item.amount_due || 0) > 0)
        .filter((item) => {
          const invoiceStatus = getInvoiceDisplayStatus(item);
          return !["draft", "cancelled", "paid"].includes(invoiceStatus);
        }),
    [invoiceItems],
  );
  const pendingBudgetItems = budgetItems.filter((item) => item.status === "draft").slice(0, 4);
  const pendingExpenseQueue = expenseItems
    .filter((item) => item.approval_status === "pending")
    .sort((left, right) => Number(right.amount || 0) - Number(left.amount || 0));
  const pendingExpenseItems = pendingExpenseQueue.slice(0, 4);
  const projectNameById = Object.fromEntries(projectItems.map((item) => [item.id, item.name]));
  const partnerNameById = Object.fromEntries(partnerItems.map((item) => [item.id, item.legal_name]));
  const treasuryNameById = Object.fromEntries(treasuryItems.map((item) => [item.id, item.name]));

  const projectRollups = useMemo(
    () =>
      profitabilityItems.map((item) => {
        const projectExpenses = expenseItems.filter((row) => Number(row.project_id) === Number(item.project_id));
        const pendingExpenses = projectExpenses.filter((row) => row.approval_status === "pending");
        const projectInvoices = invoiceItems.filter((row) => Number(row.project_id) === Number(item.project_id));

        return {
          ...item,
          pending_expenses_count: pendingExpenses.length,
          pending_expenses_amount: pendingExpenses.reduce((sum, row) => sum + Number(row.amount || 0), 0),
          expense_records_count: projectExpenses.length,
          invoice_count: projectInvoices.length,
        };
      }),
    [expenseItems, invoiceItems, profitabilityItems],
  );

  const selectedProjectRollups = useMemo(() => {
    if (selectedProjectId === "all") return projectRollups;
    return projectRollups.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [projectRollups, selectedProjectId]);

  const selectedProjectExpenses = useMemo(() => {
    if (selectedProjectId === "all") return expenseItems;
    return expenseItems.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [expenseItems, selectedProjectId]);

  const selectedProjectBudgets = useMemo(() => {
    if (selectedProjectId === "all") return budgetItems;
    return budgetItems.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [budgetItems, selectedProjectId]);

  const selectedProjectRevenues = useMemo(() => {
    if (selectedProjectId === "all") return revenueItems;
    return revenueItems.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [revenueItems, selectedProjectId]);

  const selectedProjectInvoices = useMemo(() => {
    if (selectedProjectId === "all") return invoiceItems;
    return invoiceItems.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [invoiceItems, selectedProjectId]);

  const selectedProjectPayments = useMemo(() => {
    if (selectedProjectId === "all") return paymentItems;

    const invoiceIds = new Set(selectedProjectInvoices.map((item) => Number(item.id)));
    const expenseIds = new Set(selectedProjectExpenses.map((item) => Number(item.id)));
    const revenueIds = new Set(selectedProjectRevenues.map((item) => Number(item.id)));

    return paymentItems.filter(
      (item) =>
        invoiceIds.has(Number(item.invoice_id)) ||
        expenseIds.has(Number(item.expense_id)) ||
        revenueIds.has(Number(item.revenue_id))
    );
  }, [paymentItems, selectedProjectExpenses, selectedProjectInvoices, selectedProjectRevenues]);

  const selectedPendingExpenseQueue = useMemo(() => {
    if (selectedProjectId === "all") return pendingExpenseQueue;
    return pendingExpenseQueue.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [pendingExpenseQueue, selectedProjectId]);
  const selectedExpenseSettlementCandidates = useMemo(() => {
    if (selectedProjectId === "all") return expenseSettlementCandidates;
    return expenseSettlementCandidates.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [expenseSettlementCandidates, selectedProjectId]);
  const selectedRevenueCollectionCandidates = useMemo(() => {
    if (selectedProjectId === "all") return revenueCollectionCandidates;
    return revenueCollectionCandidates.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [revenueCollectionCandidates, selectedProjectId]);
  const selectedInvoicePaymentCandidates = useMemo(() => {
    if (selectedProjectId === "all") return invoicePaymentCandidates;
    return invoicePaymentCandidates.filter((item) => Number(item.project_id) === Number(selectedProjectId));
  }, [invoicePaymentCandidates, selectedProjectId]);

  const dafPendingExpenseQueue = useMemo(
    () =>
      selectedPendingExpenseQueue
        .filter((item) => item.approval_status === "pending")
        .map((item) => ({
          ...item,
          isMajorExpense: Number(item.amount || 0) >= MAJOR_EXPENSE_APPROVAL_THRESHOLD,
          proofGap: getExpenseProofGap(item),
        }))
        .sort((left, right) => {
          const priorityGap = Number(right.isMajorExpense) - Number(left.isMajorExpense);
          if (priorityGap !== 0) return priorityGap;
          const amountGap = Number(right.amount || 0) - Number(left.amount || 0);
          if (amountGap !== 0) return amountGap;
          return new Date(right.expense_date || 0).getTime() - new Date(left.expense_date || 0).getTime();
        }),
    [selectedPendingExpenseQueue],
  );

  const dafInvoiceFollowUpRows = useMemo(
    () =>
      selectedProjectInvoices
        .filter((item) => {
          const invoiceStatus = getInvoiceDisplayStatus(item);
          return !["draft", "paid", "cancelled"].includes(invoiceStatus) && Number(item.amount_due || 0) > 0;
        })
        .map((item) => ({
          ...item,
          days_overdue: item.is_overdue ? getDaysOverdue(item.due_on) : 0,
          display_status: getInvoiceDisplayStatus(item),
        }))
        .sort((left, right) => {
          const overdueGap = Number(Boolean(right.is_overdue)) - Number(Boolean(left.is_overdue));
          if (overdueGap !== 0) return overdueGap;
          const daysGap = Number(right.days_overdue || 0) - Number(left.days_overdue || 0);
          if (daysGap !== 0) return daysGap;
          const leftDueTime = left.due_on ? new Date(left.due_on).getTime() : Number.MAX_SAFE_INTEGER;
          const rightDueTime = right.due_on ? new Date(right.due_on).getTime() : Number.MAX_SAFE_INTEGER;
          if (leftDueTime !== rightDueTime) return leftDueTime - rightDueTime;
          return Number(right.amount_due || 0) - Number(left.amount_due || 0);
        }),
    [selectedProjectInvoices],
  );

  const outstandingInvoiceAmountByProject = useMemo(
    () =>
      dafInvoiceFollowUpRows.reduce((accumulator, item) => {
        const projectKey = String(item.project_id ?? "none");
        accumulator[projectKey] = (accumulator[projectKey] || 0) + Number(item.amount_due || 0);
        return accumulator;
      }, {}),
    [dafInvoiceFollowUpRows],
  );

  const dafProjectRows = useMemo(
    () =>
      selectedProjectRollups
        .map((item) => {
          const budget = Number(item.budget || 0);
          const expensesAmount = Number(item.expenses || 0);
          const budgetUse = budget > 0 ? (expensesAmount / budget) * 100 : 0;

          return {
            ...item,
            budgetUse,
            outstandingInvoiceAmount: Number(outstandingInvoiceAmountByProject[String(item.project_id)] || 0),
          };
        })
        .sort((left, right) => {
          const leftRisk = left.budgetUse > 100 ? 2 : left.budgetUse > 85 ? 1 : 0;
          const rightRisk = right.budgetUse > 100 ? 2 : right.budgetUse > 85 ? 1 : 0;
          if (rightRisk !== leftRisk) return rightRisk - leftRisk;
          const pendingGap = Number(right.pending_expenses_amount || 0) - Number(left.pending_expenses_amount || 0);
          if (pendingGap !== 0) return pendingGap;
          const outstandingGap = Number(right.outstandingInvoiceAmount || 0) - Number(left.outstandingInvoiceAmount || 0);
          if (outstandingGap !== 0) return outstandingGap;
          return Number(left.margin || 0) - Number(right.margin || 0);
        }),
    [outstandingInvoiceAmountByProject, selectedProjectRollups],
  );

  const dafExpenseProofRows = useMemo(
    () =>
      selectedProjectExpenses
        .filter((item) => ["pending", "approved"].includes(item.approval_status))
        .map((item) => ({
          ...item,
          attachmentCount: Array.isArray(item.attachment_urls) ? item.attachment_urls.length : 0,
          proofGap: getExpenseProofGap(item),
        }))
        .filter((item) => item.proofGap.variant !== "success")
        .sort((left, right) => {
          const severityRank = { danger: 2, warning: 1, info: 0 };
          const severityGap = (severityRank[right.proofGap.variant] || 0) - (severityRank[left.proofGap.variant] || 0);
          if (severityGap !== 0) return severityGap;
          const amountGap = Number(right.amount || 0) - Number(left.amount || 0);
          if (amountGap !== 0) return amountGap;
          return new Date(right.expense_date || 0).getTime() - new Date(left.expense_date || 0).getTime();
        }),
    [selectedProjectExpenses],
  );

  const dafSummary = useMemo(
    () => ({
      projectCount: dafProjectRows.length,
      atRiskProjectCount: dafProjectRows.filter((item) => item.budgetUse > 85).length,
      pendingApprovalCount: dafPendingExpenseQueue.length,
      pendingApprovalAmount: dafPendingExpenseQueue.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      outstandingInvoiceCount: dafInvoiceFollowUpRows.length,
      outstandingInvoiceAmount: dafInvoiceFollowUpRows.reduce((sum, item) => sum + Number(item.amount_due || 0), 0),
      proofIssueCount: dafExpenseProofRows.length,
    }),
    [dafExpenseProofRows, dafInvoiceFollowUpRows, dafPendingExpenseQueue, dafProjectRows],
  );

  const selectedProjectLabel = selectedProjectId === "all" ? "Tous les chantiers" : projectNameById[selectedProjectId] || "Chantier";
  const currentSummary = selectedProjectId === "all" ? summary : scopedSummary;
  const currentTotals = currentSummary?.totals || {};
  const activeInvoiceItems = useMemo(
    () => selectedProjectInvoices.filter((item) => getInvoiceDisplayStatus(item) !== "cancelled"),
    [selectedProjectInvoices],
  );
  const openInvoiceItems = useMemo(
    () =>
      activeInvoiceItems.filter((item) => {
        const displayStatus = getInvoiceDisplayStatus(item);
        return Number(item.amount_due || 0) > 0 && !["draft", "paid", "cancelled"].includes(displayStatus);
      }),
    [activeInvoiceItems],
  );
  const overdueInvoiceRows = useMemo(
    () =>
      selectedProjectInvoices.filter(
        (item) => Number(item.amount_due || 0) > 0 && (item.is_overdue || getInvoiceDisplayStatus(item) === "overdue"),
      ),
    [selectedProjectInvoices],
  );
  const scopedKpis = useMemo(() => {
    const scopedRevenuesToday = selectedProjectRevenues
      .filter((item) => item.revenue_date === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const scopedExpensesToday = selectedProjectExpenses
      .filter((item) => item.expense_date === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const scopedIncomingPaymentsToday = selectedProjectPayments
      .filter((item) => item.payment_direction === "incoming" && item.payment_date === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const scopedOutgoingPaymentsToday = selectedProjectPayments
      .filter((item) => item.payment_direction === "outgoing" && item.payment_date === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const scopedOutstanding = openInvoiceItems.reduce((sum, item) => sum + Number(item.amount_due || 0), 0);
    const scopedOverdueReceivables = overdueInvoiceRows.reduce((sum, item) => sum + Number(item.amount_due || 0), 0);
    const scopedPendingExpensesAmount = selectedPendingExpenseQueue.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {
      cashBalance: Number(dashboard?.kpis?.cash_balance || currentTotals.cash_balance || 0),
      invoiced: Number(currentTotals.invoiced || 0),
      collected: Number(currentTotals.collected || 0),
      outstanding: Number((currentTotals.outstanding ?? scopedOutstanding) || 0),
      revenuesToday: selectedProjectId === "all" ? Number(dashboard?.kpis?.revenues_today || 0) : scopedRevenuesToday,
      expensesToday: selectedProjectId === "all" ? Number(dashboard?.kpis?.expenses_today || 0) : scopedExpensesToday,
      paymentsIncomingToday: selectedProjectId === "all" ? Number(dashboard?.kpis?.payments_incoming_today || 0) : scopedIncomingPaymentsToday,
      paymentsOutgoingToday: selectedProjectId === "all" ? Number(dashboard?.kpis?.payments_outgoing_today || 0) : scopedOutgoingPaymentsToday,
      pendingInvoices: openInvoiceItems.length,
      overdueInvoiceCount: overdueInvoiceRows.length,
      overdueReceivables: scopedOverdueReceivables,
      pendingExpenses: selectedPendingExpenseQueue.length,
      pendingExpensesAmount: scopedPendingExpensesAmount,
      treasuryAccountsInAlert: Number(dashboard?.kpis?.treasury_accounts_in_alert || 0),
    };
  }, [
    currentTotals.cash_balance,
    currentTotals.collected,
    currentTotals.invoiced,
    currentTotals.outstanding,
    dashboard?.kpis?.cash_balance,
    dashboard?.kpis?.expenses_today,
    dashboard?.kpis?.payments_incoming_today,
    dashboard?.kpis?.payments_outgoing_today,
    dashboard?.kpis?.revenues_today,
    dashboard?.kpis?.treasury_accounts_in_alert,
    openInvoiceItems,
    overdueInvoiceRows,
    selectedPendingExpenseQueue,
    selectedProjectExpenses,
    selectedProjectId,
    selectedProjectPayments,
    selectedProjectRevenues,
    today,
  ]);
  const approvedExpenseCount = selectedProjectExpenses.filter((item) => item.approval_status === "approved").length;
  const approvedBudgetCount = selectedProjectBudgets.filter((item) => item.status === "approved").length;
  const collectionRate = currentTotals.invoiced ? (Number(currentTotals.collected || 0) / Number(currentTotals.invoiced || 0)) * 100 : 0;
  const expenseValidationRate = selectedProjectExpenses.length ? (approvedExpenseCount / selectedProjectExpenses.length) * 100 : 0;
  const budgetApprovalRate = selectedProjectBudgets.length ? (approvedBudgetCount / selectedProjectBudgets.length) * 100 : 0;
  const financeWorkspaceMetaItems = [
    {
      icon: FolderKanban,
      label: "Perimetre",
      value: selectedProjectLabel,
      helper:
        selectedProjectId === "all"
          ? `${projectItems.length} chantier(s) visibles`
          : `${currentSummary?.counts?.entries ?? 0} ecriture(s) et ${currentSummary?.counts?.invoices ?? 0} facture(s) sur ce chantier`,
    },
    {
      icon: Wallet,
      label: t("pages.finance.cashBalance"),
      value: formatCompactMoney(scopedKpis.cashBalance, "XAF", locale),
      helper:
        scopedKpis.treasuryAccountsInAlert > 0
          ? `${scopedKpis.treasuryAccountsInAlert} compte(s) en alerte`
          : "Aucune alerte tresorerie",
    },
    {
      icon: Receipt,
      label: "Facturation",
      value: formatCompactMoney(scopedKpis.invoiced, "XAF", locale),
      helper: `${currentSummary?.counts?.invoices ?? activeInvoiceItems.length} facture(s) actives`,
    },
    {
      icon: ArrowUpCircle,
      label: "Encaisse / impayes",
      value: formatCompactMoney(scopedKpis.collected, "XAF", locale),
      helper: `Impayes ${formatCompactMoney(scopedKpis.outstanding, "XAF", locale)}`,
    },
  ];
  const financeWorkspaceProgressItems = [
    {
      label: "Recouvrement client",
      value: collectionRate,
      helper: `${scopedKpis.pendingInvoices} facture(s) encore ouvertes`,
      fillClassName: "bg-emerald-400",
    },
    {
      label: "Validation depenses",
      value: expenseValidationRate,
      helper: `${selectedPendingExpenseQueue.length} dossier(s) a arbitrer`,
      fillClassName: "bg-sky-400",
    },
    {
      label: "Budgets approuves",
      value: budgetApprovalRate,
      helper: `${selectedProjectBudgets.length} version(s) budget`,
      fillClassName: "bg-amber-300",
    },
  ];
  const financeOperatingModel = useMemo(
    () =>
      buildFinanceOperatingModel({
        scopeLabel: selectedProjectLabel,
        summary: currentSummary,
        dashboard,
        cashFlow,
        taxSummary,
        accounts: accountItems,
        journals: journalItems,
        treasuryAccounts: treasuryItems,
        budgets: selectedProjectBudgets,
        expenses: selectedProjectExpenses,
        revenues: selectedProjectRevenues,
        invoices: selectedProjectInvoices,
        payments: selectedProjectPayments,
        projects: projectItems,
        profitability: selectedProjectRollups,
        overdueInvoices: overdueInvoiceRows,
        notifications: [...notificationItems, ...alertItems],
        payrollStatus,
        payrollEmployees,
        payrollRuns,
        payrollPeriods,
        leaveRequests: payrollLeaveRequests,
        projectReports: selectedProjectReportItems,
      }),
    [
      selectedProjectLabel,
      currentSummary,
      dashboard,
      cashFlow,
      taxSummary,
      accountItems,
      journalItems,
      treasuryItems,
      selectedProjectBudgets,
      selectedProjectExpenses,
      selectedProjectRevenues,
      selectedProjectInvoices,
      selectedProjectPayments,
      projectItems,
      selectedProjectRollups,
      overdueInvoiceRows,
      notificationItems,
      alertItems,
      payrollStatus,
      payrollEmployees,
      payrollRuns,
      payrollPeriods,
      payrollLeaveRequests,
      selectedProjectReportItems,
    ],
  );
  const selectedInvoiceForPayment = useMemo(
    () => invoicePaymentCandidates.find((item) => Number(item.id) === Number(paymentForm.invoice_id)) || null,
    [invoicePaymentCandidates, paymentForm.invoice_id],
  );
  const selectedExpenseForSettlement = useMemo(
    () => expenseSettlementCandidates.find((item) => Number(item.id) === Number(expenseSettlementForm.expense_id)) || null,
    [expenseSettlementCandidates, expenseSettlementForm.expense_id],
  );
  const selectedRevenueForCollection = useMemo(
    () => revenueCollectionCandidates.find((item) => Number(item.id) === Number(revenueCollectionForm.revenue_id)) || null,
    [revenueCollectionCandidates, revenueCollectionForm.revenue_id],
  );
  const selectedInvoicePaymentHistory = useMemo(
    () =>
      paymentItems
        .filter((item) => Number(item.invoice_id) === Number(selectedInvoiceForPayment?.id))
        .sort((left, right) => new Date(right.payment_date || 0).getTime() - new Date(left.payment_date || 0).getTime())
        .slice(0, 4),
    [paymentItems, selectedInvoiceForPayment],
  );
  const selectedExpensePaymentHistory = useMemo(
    () =>
      paymentItems
        .filter((item) => Number(item.expense_id) === Number(selectedExpenseForSettlement?.id))
        .sort((left, right) => new Date(right.payment_date || 0).getTime() - new Date(left.payment_date || 0).getTime())
        .slice(0, 4),
    [paymentItems, selectedExpenseForSettlement],
  );
  const selectedRevenuePaymentHistory = useMemo(
    () =>
      paymentItems
        .filter((item) => Number(item.revenue_id) === Number(selectedRevenueForCollection?.id))
        .sort((left, right) => new Date(right.payment_date || 0).getTime() - new Date(left.payment_date || 0).getTime())
        .slice(0, 4),
    [paymentItems, selectedRevenueForCollection],
  );
  const expenseOperationHint = expenseForm.treasury_account_id
    ? "La depense sera creee en attente. Le compte choisi prepare le reglement, mais la tresorerie ne bougera qu'apres validation et paiement."
    : "La depense sera creee en attente de validation, sans impact tresorerie immediat tant qu'aucun compte ni paiement ne sont postes.";
  const revenueOperationHint = revenueForm.treasury_account_id
    ? "Avec un compte financier, la recette sera encaissee immediatement et visible en tresorerie."
    : "Sans compte financier, la recette restera a recouvrer et n'impactera pas encore la tresorerie.";
  const invoiceOperationHint = invoiceForm.status === "sent"
    ? "La facture sera creee directement ouverte au suivi client. L'annulation reste une action distincte apres creation."
    : "Le brouillon sera cree sans suivi de relance tant qu'il n'est pas envoye depuis l'historique.";

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FINANCE_PANEL_STORAGE_KEY, activeFinancePanel);
  }, [activeFinancePanel]);

  useEffect(() => {
    if (activeFinancePanel === "ops" && !canManageFinance) {
      setActiveFinancePanel("all");
      return;
    }
    if (activeFinancePanel === "daf" && !(isDafWorkspace && canManageFinance)) {
      setActiveFinancePanel("all");
    }
  }, [activeFinancePanel, canManageFinance, isDafWorkspace]);

  const panelCounters = {
    dashboard: notificationItems.length + alertItems.length + overdueItems.length + movementItems.length,
    daf: dafProjectRows.length + dafPendingExpenseQueue.length + dafInvoiceFollowUpRows.length + dafExpenseProofRows.length,
    ops: accountItems.length + budgetItems.length + expenseItems.length + invoiceItems.length,
    history: expenseItems.length + revenueItems.length + invoiceItems.length,
  };
  const allPanelCounter = panelCounters.dashboard + panelCounters.daf + panelCounters.ops + panelCounters.history;
  const opsPanelCounters = {
    all: accountItems.length + journalItems.length + partnerItems.length + budgetItems.length + expenseItems.length + revenueItems.length + invoiceItems.length + paymentItems.length,
    comptes: accountItems.length + journalItems.length + partnerItems.length,
    budgets: budgetItems.length,
    depenses: expenseItems.length,
    factures: revenueItems.length + invoiceItems.length + paymentItems.length,
  };
  const financeWorkspaceTabs = [
    { id: "all", label: "Tableau de bord", count: allPanelCounter, icon: LayoutDashboard },
    { id: "dashboard", label: "Finance globale", count: panelCounters.dashboard, icon: Landmark },
    ...(isDafWorkspace && canManageFinance ? [{ id: "daf", label: "Pilotage DAF", count: panelCounters.daf, icon: BarChart3 }] : []),
    ...(canManageFinance ? [{ id: "ops", label: "Operations", count: panelCounters.ops, icon: FolderKanban }] : []),
    { id: "history", label: "Historique", count: panelCounters.history, icon: FileText },
  ];
  const financeOpsTabs = [
    { id: "all", label: "Tout", count: opsPanelCounters.all },
    { id: "comptes", label: "Comptes", count: opsPanelCounters.comptes },
    { id: "budgets", label: "Budgets", count: opsPanelCounters.budgets },
    { id: "depenses", label: "Depenses", count: opsPanelCounters.depenses },
    { id: "factures", label: "Factures", count: opsPanelCounters.factures },
  ];

  const showOpsAll = activeOperationsSection === "all";
  const showOpsComptes = showOpsAll || activeOperationsSection === "comptes";
  const showOpsBudgets = showOpsAll || activeOperationsSection === "budgets";
  const showOpsDepenses = showOpsAll || activeOperationsSection === "depenses";
  const showOpsFactures = showOpsAll || activeOperationsSection === "factures";

  const updateUrlHashTabs = (panelId, opsPanelId = activeOperationsSection) => {
    if (typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    hashParams.set("financeTab", panelId);
    if (panelId === "ops") {
      hashParams.set("opsTab", opsPanelId);
    } else {
      hashParams.delete("opsTab");
    }
    const nextHash = hashParams.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${nextHash}`);
  };

  const setFinancePanelWithUrl = (panelId) => {
    setActiveFinancePanel(panelId);
    updateUrlHashTabs(panelId);
  };

  const setOperationsSectionWithUrl = (opsPanelId) => {
    setActiveOperationsSection(opsPanelId);
    updateUrlHashTabs("ops", opsPanelId);
  };

  const handlePaymentInvoiceChange = (event) => {
    const nextInvoiceId = event.target.value;
    const nextInvoice = invoicePaymentCandidates.find((item) => Number(item.id) === Number(nextInvoiceId));
    setPaymentForm((current) => ({
      ...current,
      invoice_id: nextInvoiceId,
      amount: nextInvoice ? String(nextInvoice.amount_due ?? "") : "",
    }));
  };

  const handleExpenseSettlementChange = (event) => {
    const nextExpenseId = event.target.value;
    const nextExpense = expenseSettlementCandidates.find((item) => Number(item.id) === Number(nextExpenseId));
    setExpenseSettlementForm((current) => ({
      ...current,
      expense_id: nextExpenseId,
      treasury_account_id: nextExpense?.treasury_account_id ? String(nextExpense.treasury_account_id) : current.treasury_account_id,
      amount: nextExpense ? String(nextExpense.amount_due ?? "") : "",
    }));
  };

  const handleRevenueCollectionChange = (event) => {
    const nextRevenueId = event.target.value;
    const nextRevenue = revenueCollectionCandidates.find((item) => Number(item.id) === Number(nextRevenueId));
    setRevenueCollectionForm((current) => ({
      ...current,
      revenue_id: nextRevenueId,
      treasury_account_id: nextRevenue?.treasury_account_id ? String(nextRevenue.treasury_account_id) : current.treasury_account_id,
      amount: nextRevenue ? String(nextRevenue.amount_due ?? "") : "",
    }));
  };

  const prepareExpenseSettlement = (item) => {
    setFinancePanelWithUrl("ops");
    setOperationsSectionWithUrl("depenses");
    setExpenseSettlementForm((current) => ({
      ...current,
      expense_id: String(item.id),
      treasury_account_id: item?.treasury_account_id ? String(item.treasury_account_id) : current.treasury_account_id,
      amount: String(item.amount_due ?? ""),
    }));
  };

  const prepareRevenueCollection = (item) => {
    setFinancePanelWithUrl("ops");
    setOperationsSectionWithUrl("factures");
    setRevenueCollectionForm((current) => ({
      ...current,
      revenue_id: String(item.id),
      treasury_account_id: item?.treasury_account_id ? String(item.treasury_account_id) : current.treasury_account_id,
      amount: String(item.amount_due ?? ""),
    }));
  };

  const prepareInvoicePayment = (item) => {
    setFinancePanelWithUrl("ops");
    setOperationsSectionWithUrl("factures");
    setPaymentForm((current) => ({
      ...current,
      invoice_id: String(item.id),
      amount: String(item.amount_due ?? ""),
    }));
  };

  const getFinanceShareUrl = (panelId = activeFinancePanel, opsPanelId = activeOperationsSection) => {
    if (typeof window === "undefined") return "";
    const hashParams = new URLSearchParams();
    hashParams.set("financeTab", panelId);
    if (panelId === "ops") {
      hashParams.set("opsTab", opsPanelId);
    }
    return `${window.location.origin}${window.location.pathname}${window.location.search}#${hashParams.toString()}`;
  };

  const copyCurrentTabLink = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = getFinanceShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
    } catch {
      setLinkCopied(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashFinanceTab = hashParams.get("financeTab");
    const hashOpsTab = hashParams.get("opsTab");

    if (hashFinanceTab && FINANCE_PANELS.includes(hashFinanceTab)) {
      setActiveFinancePanel(hashFinanceTab);
    }
    if (hashOpsTab && OPS_PANELS.includes(hashOpsTab)) {
      setActiveOperationsSection(hashOpsTab);
    }
  }, []);

  const panelButtonClass = (panelId) =>
    cn(
      "inline-flex h-[66px] items-center gap-2 border-b-2 border-transparent px-5 text-[15px] font-semibold transition whitespace-nowrap [&_svg]:shrink-0",
      activeFinancePanel === panelId
        ? "border-[#2563eb] text-[#2563eb]"
        : "text-[#64748b] hover:text-[#0f172a]"
    );

  const opsButtonClass = (sectionId) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition whitespace-nowrap",
      activeOperationsSection === sectionId
        ? "border-[#bfd3ff] bg-[#eff5ff] text-[#2563eb]"
        : "border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#cbd5e1] hover:text-[#0f172a]"
    );

  const refreshAll = async () => {
    await Promise.allSettled([
      refetchSummary(),
      refetchDashboard(),
      refetchProfitability(),
      refetchCashFlow(),
      refetchTaxSummary(),
      refetchOverdueInvoices(),
      refetchFinanceNotifications(),
      refetchAccounts(),
      refetchJournals(),
      refetchPartners(),
      refetchTreasuryAccounts(),
      refetchBudgets(),
      refetchExpenses(),
      refetchRevenues(),
      refetchInvoices(),
      refetchPayments(),
    ]);
  };

  const runMutation = async ({ url, data = {}, reset, refetchers = [] }) => {
    try {
      await mutate({ method: "post", url, data });
      reset?.();
      await Promise.allSettled(refetchers.map((refetch) => refetch()));
    } catch {
      return;
    }
  };

  const downloadExport = async (report, format) => {
    const response = await httpClient.get(`/finance/exports?report=${report}&format=${format}`, {
      responseType: "blob",
    });
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${report}.${format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "pdf"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  const approveBudget = async (budgetId) => {
    await runMutation({
      url: `/finance/budgets/${budgetId}/approve`,
      refetchers: [refetchBudgets, refetchProfitability, refetchDashboard],
    });
  };

  const approveExpense = async (expenseId) => {
    await runMutation({
      url: `/finance/expenses/${expenseId}/approve`,
      refetchers: [refetchExpenses, refetchSummary, refetchDashboard, refetchCashFlow, refetchPayments, refetchBudgets, refetchFinanceNotifications],
    });
  };

  const rejectExpense = async (expenseId) => {
    await runMutation({
      url: `/finance/expenses/${expenseId}/reject`,
      refetchers: [refetchExpenses, refetchDashboard, refetchFinanceNotifications],
    });
  };

  const sendInvoice = async (invoiceId) => {
    await runMutation({
      url: `/finance/invoices/${invoiceId}/send`,
      refetchers: [refetchInvoices, refetchSummary, refetchDashboard, refetchOverdueInvoices, refetchFinanceNotifications],
    });
  };

  const cancelInvoice = async (invoiceId) => {
    await runMutation({
      url: `/finance/invoices/${invoiceId}/cancel`,
      refetchers: [refetchInvoices, refetchSummary, refetchDashboard, refetchOverdueInvoices, refetchFinanceNotifications],
    });
  };

  const createAccount = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/accounts",
      data: normalizePayload(accountForm),
      reset: () => setAccountForm({ code: "", name: "", account_class: "expense" }),
      refetchers: [refetchAccounts],
    });
  };

  const createJournal = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/journals",
      data: normalizePayload(journalForm),
      reset: () => setJournalForm({ code: "", name: "", journal_type: "misc" }),
      refetchers: [refetchJournals],
    });
  };

  const createPartner = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/partners",
      data: normalizePayload(partnerForm),
      reset: () => setPartnerForm({ legal_name: "", partner_type: "customer", email: "", phone: "" }),
      refetchers: [refetchPartners],
    });
  };

  const createTreasuryAccount = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/treasury-accounts",
      data: normalizePayload(treasuryForm),
      reset: () => setTreasuryForm({ code: "", name: "", account_type: "bank", opening_balance: "", alert_threshold: "" }),
      refetchers: [refetchTreasuryAccounts, refetchSummary, refetchDashboard, refetchCashFlow],
    });
  };

  const createBudget = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/budgets",
      data: normalizePayload({ ...budgetForm, status: "draft" }, ["project_id"]),
      reset: () => setBudgetForm({ project_id: "", version_label: "", total_budget: "", notes: "" }),
      refetchers: [refetchBudgets, refetchProfitability],
    });
  };

  const createExpense = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/expenses",
      data: normalizePayload(expenseForm, ["project_id", "partner_id", "treasury_account_id"]),
      reset: () =>
        setExpenseForm({
          project_id: "",
          partner_id: "",
          treasury_account_id: "",
          category: "",
          amount: "",
          tax_rate: "",
          expense_date: today,
          payment_method: "cash",
          document_reference: "",
          description: "",
          approval_status: "pending",
        }),
      refetchers: [refetchExpenses, refetchSummary, refetchDashboard, refetchCashFlow, refetchPayments, refetchBudgets],
    });
  };

  const createRevenue = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/revenues",
      data: normalizePayload(revenueForm, ["project_id", "partner_id", "treasury_account_id"]),
      reset: () =>
        setRevenueForm({
          project_id: "",
          partner_id: "",
          treasury_account_id: "",
          revenue_type: "",
          amount: "",
          tax_rate: "",
          revenue_date: today,
          payment_method: "bank_transfer",
          reference: "",
          description: "",
        }),
      refetchers: [refetchRevenues, refetchSummary, refetchDashboard, refetchCashFlow, refetchPayments, refetchProfitability],
    });
  };

  const createInvoice = async (event) => {
    event.preventDefault();
    await runMutation({
      url: "/finance/invoices",
      data: normalizePayload(invoiceForm, ["project_id", "customer_id"]),
      reset: () =>
        setInvoiceForm({
          project_id: "",
          customer_id: "",
          customer_name: "",
          amount_total: "",
          tax_rate: "",
          issued_on: today,
          due_on: "",
          status: "draft",
          notes: "",
        }),
      refetchers: [refetchInvoices, refetchSummary, refetchDashboard, refetchOverdueInvoices],
    });
  };

  const recordPayment = async (event) => {
    event.preventDefault();
    if (!paymentForm.invoice_id) return;
    await runMutation({
      url: `/finance/invoices/${paymentForm.invoice_id}/payments`,
      data: normalizePayload(paymentForm, ["treasury_account_id"]),
      reset: () =>
        setPaymentForm({
          invoice_id: "",
          treasury_account_id: "",
          amount: "",
          payment_date: today,
          payment_method: "bank_transfer",
          reference: "",
        }),
      refetchers: [refetchInvoices, refetchPayments, refetchSummary, refetchDashboard, refetchCashFlow, refetchOverdueInvoices],
    });
  };

  const settleExpense = async (event) => {
    event.preventDefault();
    if (!expenseSettlementForm.expense_id) return;
    await runMutation({
      url: `/finance/expenses/${expenseSettlementForm.expense_id}/payments`,
      data: normalizePayload(expenseSettlementForm, ["treasury_account_id"]),
      reset: () =>
        setExpenseSettlementForm({
          expense_id: "",
          treasury_account_id: "",
          amount: "",
          payment_date: today,
          payment_method: "bank_transfer",
          reference: "",
        }),
      refetchers: [refetchExpenses, refetchPayments, refetchSummary, refetchDashboard, refetchCashFlow, refetchFinanceNotifications],
    });
  };

  const collectRevenue = async (event) => {
    event.preventDefault();
    if (!revenueCollectionForm.revenue_id) return;
    await runMutation({
      url: `/finance/revenues/${revenueCollectionForm.revenue_id}/payments`,
      data: normalizePayload(revenueCollectionForm, ["treasury_account_id"]),
      reset: () =>
        setRevenueCollectionForm({
          revenue_id: "",
          treasury_account_id: "",
          amount: "",
          payment_date: today,
          payment_method: "bank_transfer",
          reference: "",
        }),
      refetchers: [refetchRevenues, refetchPayments, refetchSummary, refetchDashboard, refetchCashFlow, refetchFinanceNotifications],
    });
  };

  const dafProjectColumns = [
    {
      key: "project",
      header: "Chantier",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.project_name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.project_code || `PRJ-${item.project_id}`}</p>
        </div>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{formatMoney(item.budget, "XAF", locale)}</span>,
    },
    {
      key: "expenses",
      header: "Depenses",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-rose-700">{formatMoney(item.expenses, "XAF", locale)}</span>,
    },
    {
      key: "revenues",
      header: "Recettes",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-emerald-700">{formatMoney(item.revenues, "XAF", locale)}</span>,
    },
    {
      key: "margin",
      header: "Marge",
      className: "whitespace-nowrap",
      render: (item) => (
        <span className={`font-medium ${Number(item.margin || 0) >= 0 ? "text-slate-900 dark:text-white" : "text-rose-700"}`}>
          {formatMoney(item.margin, "XAF", locale)}
        </span>
      ),
    },
    {
      key: "budgetUse",
      header: "Conso budget",
      render: (item) => (
        <div className="space-y-1">
          <Badge variant={getBudgetUseVariant(item.budgetUse)}>{formatRate(item.budgetUse, locale)}</Badge>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {item.budgetUse > 100 ? "Depassement" : item.budgetUse > 85 ? "Sous vigilance" : "Maitrise"}
          </p>
        </div>
      ),
    },
    {
      key: "pending",
      header: "Depenses a arbitrer",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.pending_expenses_count} en attente</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatMoney(item.pending_expenses_amount, "XAF", locale)}</p>
        </div>
      ),
    },
    {
      key: "receivables",
      header: "Encours client",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{formatMoney(item.outstandingInvoiceAmount, "XAF", locale)}</span>,
    },
  ];

  const dafApprovalColumns = [
    {
      key: "expense",
      header: "Depense",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.category}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.expense_number || `DEP-${item.id}`}</p>
        </div>
      ),
    },
    {
      key: "project",
      header: "Chantier",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.project_name || projectNameById[item.project_id] || "Hors projet"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.created_by_user_email || "Auteur non renseigne"}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-rose-700">{formatMoney(item.amount, item.currency, locale)}</span>,
    },
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (item) => formatDate(item.expense_date, locale),
    },
    {
      key: "proof",
      header: "Justificatif",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.document_reference || "Reference non renseignee"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {Array.isArray(item.attachment_urls) && item.attachment_urls.length ? `${item.attachment_urls.length} piece(s)` : "Aucune piece jointe"}
          </p>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priorite",
      render: (item) => (
        <div className="space-y-1">
          <Badge variant={item.isMajorExpense ? "warning" : "info"}>{item.isMajorExpense ? "Arbitrage DAF" : "Suivi"}</Badge>
          {item.proofGap.variant !== "success" ? <p className="text-xs text-slate-500 dark:text-slate-400">{item.proofGap.label}</p> : null}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (item) => (
        <div className="flex flex-col gap-2 xl:flex-row">
          <Button variant="outline" className="w-full justify-center xl:w-auto" onClick={() => approveExpense(item.id)} disabled={saving}>
            Valider
          </Button>
          <Button variant="outline" className="w-full justify-center xl:w-auto" onClick={() => rejectExpense(item.id)} disabled={saving}>
            Rejeter
          </Button>
        </div>
      ),
    },
  ];

  const dafInvoiceColumns = [
    {
      key: "invoice",
      header: "Facture",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.invoice_number || `FAC-${item.id}`}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.customer_name || partnerNameById[item.customer_id] || "Client"}</p>
        </div>
      ),
    },
    {
      key: "project",
      header: "Chantier",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{item.project_name || projectNameById[item.project_id] || "Hors projet"}</span>,
    },
    {
      key: "total",
      header: "Montant",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{formatMoney(item.amount_total, item.currency, locale)}</span>,
    },
    {
      key: "due",
      header: "Reste du",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-rose-700">{formatMoney(item.amount_due, item.currency, locale)}</span>,
    },
    {
      key: "deadline",
      header: "Echeance",
      className: "whitespace-nowrap",
      render: (item) => formatDate(item.due_on, locale),
    },
    {
      key: "followup",
      header: "Relance",
      render: (item) => {
        const invoiceStatus = item.display_status || getInvoiceDisplayStatus(item);
        return (
          <div className="space-y-1">
            <Badge variant={item.is_overdue ? "danger" : invoiceStatus === "partially_paid" ? "warning" : "info"}>
              {item.is_overdue ? "Urgente" : invoiceStatus === "partially_paid" ? "Partielle" : "A suivre"}
            </Badge>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {item.is_overdue ? `${item.days_overdue} j de retard` : item.due_on ? "Suivi a echeance" : "Sans date limite"}
            </p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      render: (item) => <StatusTag value={item.display_status || getInvoiceDisplayStatus(item)} />,
    },
  ];
  if (canManageFinance) {
    dafInvoiceColumns.push({
      key: "actions",
      header: "Actions",
      render: (item) => (
        <div className="flex flex-col gap-2 xl:flex-row">
          {canSendInvoice(item) && (
            <Button variant="outline" className="w-full justify-center xl:w-auto" onClick={() => sendInvoice(item.id)} disabled={saving}>
              Envoyer
            </Button>
          )}
          {canCancelInvoice(item) && (
            <Button variant="outline" className="w-full justify-center xl:w-auto" onClick={() => cancelInvoice(item.id)} disabled={saving}>
              Annuler
            </Button>
          )}
          {!canSendInvoice(item) && !canCancelInvoice(item) && <span className="text-xs text-slate-500 dark:text-slate-400">Aucune action</span>}
        </div>
      ),
    });
  }

  const dafProofColumns = [
    {
      key: "expense",
      header: "Depense",
      render: (item) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{item.category}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{item.document_reference || "Sans reference"}</p>
        </div>
      ),
    },
    {
      key: "project",
      header: "Chantier",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{item.project_name || projectNameById[item.project_id] || "Hors projet"}</span>,
    },
    {
      key: "amount",
      header: "Montant",
      className: "whitespace-nowrap",
      render: (item) => <span className="font-medium text-slate-900 dark:text-white">{formatMoney(item.amount, item.currency, locale)}</span>,
    },
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (item) => formatDate(item.expense_date, locale),
    },
    {
      key: "gap",
      header: "Ecart",
      render: (item) => <Badge variant={item.proofGap.variant}>{item.proofGap.label}</Badge>,
    },
    {
      key: "attachments",
      header: "Pieces",
      render: (item) => (
        <div className="flex flex-wrap gap-2">
          {item.attachmentCount
            ? item.attachment_urls.slice(0, 2).map((url) => (
                <a
                  key={`${item.id}-${url}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Ouvrir
                </a>
              ))
            : <span className="text-xs text-slate-500 dark:text-slate-400">Aucune piece</span>}
          {item.attachmentCount > 2 ? <span className="text-xs text-slate-500 dark:text-slate-400">+{item.attachmentCount - 2}</span> : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (item) => <StatusTag value={item.approval_status} />,
    },
  ];

  return (
    <section className="space-y-5">
      <style>{`@keyframes financeFadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }`}</style>
      {mutationError && (
        <Card className="border-rose-200 bg-rose-50 text-rose-700">
          <p className="text-sm">{mutationError}</p>
        </Card>
      )}

      <div className="rounded-[28px] border border-[#dbe4f0] bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
        <div className="sm:hidden">
          <label className="sr-only" htmlFor="finance-workspace-view-select">
            Navigation finance
          </label>
          <select
            id="finance-workspace-view-select"
            aria-label="Navigation finance"
            className="app-field mb-1 w-full px-3 py-2 text-sm font-semibold"
            value={activeFinancePanel}
            onChange={(event) => setFinancePanelWithUrl(event.target.value)}
          >
            {financeWorkspaceTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden items-stretch justify-between sm:flex">
          <div className="min-w-0 flex-1 overflow-x-auto px-4 [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#cfd9e8]">
            <div className="flex min-w-max items-stretch gap-1" role="tablist" aria-label="Navigation finance">
              {financeWorkspaceTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeFinancePanel === tab.id}
                    className={panelButtonClass(tab.id)}
                    onClick={() => setFinancePanelWithUrl(tab.id)}
                    title={`${tab.label} (${tab.count})`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {canManageFinance ? (
            <div className="flex items-center border-l border-[#e5ebf4] p-3">
              <Button
                type="button"
                onClick={() => {
                  setFinancePanelWithUrl("ops");
                  setOperationsSectionWithUrl("all");
                }}
                className="h-11 w-11 rounded-[16px] bg-[#18c37e] p-0 text-white hover:bg-[#12aa6d]"
                aria-label="Nouvelle operation"
                title="Nouvelle operation"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <FinanceOperatingModelBoard
        operatingModel={financeOperatingModel}
        locale={locale}
        canUseDaf={isDafWorkspace && canManageFinance}
        onOpenFinanceTarget={({ panelId, opsPanelId }) => {
          setFinancePanelWithUrl(panelId);
          if (panelId === "ops" && opsPanelId) {
            setOperationsSectionWithUrl(opsPanelId);
          }
        }}
      />

      {false && (
        <>
      <div className="relative overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(105deg,#0f172a_0%,#0f766e_52%,#2563eb_100%)] p-4 text-white shadow-[0_24px_65px_-40px_rgba(2,6,23,0.75)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_36%)]" />
        <div className="relative space-y-4">
          <div className="rounded-2xl border border-white/25 bg-white/12 p-4 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="border border-white/15 bg-white/10 text-white" variant="neutral">
                  {isComptable ? t("pages.finance.workspaceTitle") : t("pages.finance.title")}
                </Badge>
                <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">{accountItems.length} comptes</Badge>
                <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">{journalItems.length} journaux</Badge>
                <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">{budgetItems.length} budgets</Badge>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{isDafWorkspace ? "Changer de chantier" : "Filtrer par projet"}</p>
                <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center">
                  <select
                    aria-label={isDafWorkspace ? "Changer de chantier" : "Filtrer par projet"}
                    className="min-w-0 flex-1 rounded-xl border border-white/35 bg-white/90 px-3 py-2.5 text-sm font-semibold text-slate-900"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  >
                    <option value="all">Tous les chantiers</option>
                    {projectItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code ? `${item.code} - ${item.name}` : item.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" onClick={copyCurrentTabLink} className="h-11 border-white/35 bg-white/10 px-3 text-white hover:bg-white/20">
                      <Link2 className="mr-2 h-4 w-4" />
                      {linkCopied ? "Lien copie" : "Copier le lien"}
                    </Button>
                    <Button type="button" variant="outline" onClick={refreshAll} disabled={saving} className="h-11 border-white/35 bg-white px-3 text-slate-900 hover:bg-slate-100">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rafraichir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold sm:text-3xl">{t("pages.finance.title")}</h2>
                <p className="max-w-3xl text-sm leading-6 text-white/80">
                  {isComptable
                    ? t("pages.finance.workspaceSubtitle")
                    : "Pilotez la tresorerie, la facturation, les arbitrages DAF, les budgets, les relances clients et les ecritures depuis un meme espace finance."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                    {scopedKpis.pendingExpenses} depense(s) a valider
                  </Badge>
                  <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                    {scopedKpis.pendingInvoices} facture(s) ouvertes
                  </Badge>
                  <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                    {scopedKpis.overdueInvoiceCount} relance(s) urgentes
                  </Badge>
                  <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                    {financeOperatingModel.modules.length} domaine(s) relies
                  </Badge>
                  <Badge className="border border-white/15 bg-black/15 text-white" variant="neutral">
                    {financeOperatingModel.history.totalEvents} evenement(s) traces
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {financeWorkspaceMetaItems.map((item) => (
              <FinanceWorkspaceMetaItem key={item.label} icon={item.icon} label={item.label} value={item.value} helper={item.helper} />
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {financeWorkspaceProgressItems.map((item) => (
              <FinanceWorkspaceProgressItem key={item.label} label={item.label} value={item.value} helper={item.helper} fillClassName={item.fillClassName} />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Wallet}
              label={t("pages.finance.cashBalance")}
              value={formatCompactMoney(scopedKpis.cashBalance, "XAF", locale)}
              tone="text-emerald-200"
              helper={
                scopedKpis.treasuryAccountsInAlert > 0
                  ? `${scopedKpis.treasuryAccountsInAlert} compte(s) en alerte`
                  : "Aucun compte en alerte"
              }
            />
            <MetricCard
              icon={ArrowUpCircle}
              label={t("pages.finance.revenuesToday")}
              value={formatCompactMoney(scopedKpis.revenuesToday, "XAF", locale)}
              tone="text-cyan-100"
              helper={`Encaissements ${formatCompactMoney(scopedKpis.paymentsIncomingToday, "XAF", locale)}`}
            />
            <MetricCard
              icon={ArrowDownCircle}
              label={t("pages.finance.expensesToday")}
              value={formatCompactMoney(scopedKpis.expensesToday, "XAF", locale)}
              tone="text-amber-100"
              helper={`Decaissements ${formatCompactMoney(scopedKpis.paymentsOutgoingToday, "XAF", locale)}`}
            />
            <MetricCard
              icon={Receipt}
              label={t("pages.finance.pendingInvoices")}
              value={scopedKpis.pendingInvoices}
              tone="text-rose-100"
              helper={`${scopedKpis.overdueInvoiceCount} en retard`}
            />
          </div>
        </div>
      </div>

      {!canManageFinance && (
        <Card>
          <p className="text-sm text-amber-700">{t("pages.finance.readOnlyHint")}</p>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => downloadExport("dashboard", "pdf")} disabled={saving}>
          Export PDF
        </Button>
        <Button variant="outline" onClick={() => downloadExport("dashboard", "xlsx")} disabled={saving}>
          Export Excel
        </Button>
        <Button variant="outline" onClick={() => downloadExport("accounting_journal", "csv")} disabled={saving}>
          Journal CSV
        </Button>
        <Button variant="outline" onClick={() => downloadExport("accounting_journal", "xlsx")} disabled={saving}>
          Journal Excel
        </Button>
      </div>

      {mutationError && (
        <Card className="border-rose-200 bg-rose-50 text-rose-700">
          <p className="text-sm">{mutationError}</p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-slate-200 bg-slate-50/80">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Encours clients</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(scopedKpis.outstanding, "XAF", locale)}</p>
          <p className="mt-1 text-sm text-slate-600">{scopedKpis.pendingInvoices} facture(s) ouvertes</p>
        </Card>
        <Card className="border-slate-200 bg-slate-50/80">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Depenses a valider</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(scopedKpis.pendingExpensesAmount, "XAF", locale)}</p>
          <p className="mt-1 text-sm text-slate-600">{scopedKpis.pendingExpenses} dossier(s) en attente</p>
        </Card>
        <Card className="border-slate-200 bg-slate-50/80">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Retards clients</p>
          <p className="mt-2 text-lg font-semibold text-rose-700">{formatMoney(scopedKpis.overdueReceivables, "XAF", locale)}</p>
          <p className="mt-1 text-sm text-slate-600">{scopedKpis.overdueInvoiceCount} facture(s) en retard</p>
        </Card>
      </div>

      {canManageFinance && (
        <Card className="border-slate-200 bg-white/90">
          <SectionTitle
            eyebrow="Workflow finance"
            title="Centre d'approbation et de suivi"
            description="Vue rapide des objets a arbitrer, regler et encaisser avec raccourcis vers les bonnes files de traitement."
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkflowStageCard
              title="Depenses a valider"
              count={selectedPendingExpenseQueue.length}
              amount={formatCompactMoney(selectedPendingExpenseQueue.reduce((sum, item) => sum + Number(item.amount || 0), 0), "XAF", locale)}
              helper="Soumissions en attente d'arbitrage"
              tone="amber"
              actionLabel="Ouvrir la file DAF"
              onAction={() => setFinancePanelWithUrl(isDafWorkspace ? "daf" : "dashboard")}
            />
            <WorkflowStageCard
              title="Depenses a regler"
              count={selectedExpenseSettlementCandidates.length}
              amount={formatCompactMoney(selectedExpenseSettlementCandidates.reduce((sum, item) => sum + Number(item.amount_due || 0), 0), "XAF", locale)}
              helper="Depenses approuvees mais non soldées"
              tone="rose"
              actionLabel="Ouvrir les depenses"
              onAction={() => {
                setFinancePanelWithUrl("ops");
                setOperationsSectionWithUrl("depenses");
              }}
            />
            <WorkflowStageCard
              title="Recettes a encaisser"
              count={selectedRevenueCollectionCandidates.length}
              amount={formatCompactMoney(selectedRevenueCollectionCandidates.reduce((sum, item) => sum + Number(item.amount_due || 0), 0), "XAF", locale)}
              helper="Recettes non totalement recouvrees"
              tone="cyan"
              actionLabel="Ouvrir les recettes"
              onAction={() => {
                setFinancePanelWithUrl("ops");
                setOperationsSectionWithUrl("factures");
              }}
            />
            <WorkflowStageCard
              title="Factures a relancer"
              count={selectedInvoicePaymentCandidates.length}
              amount={formatCompactMoney(selectedInvoicePaymentCandidates.reduce((sum, item) => sum + Number(item.amount_due || 0), 0), "XAF", locale)}
              helper={`${scopedKpis.overdueInvoiceCount} facture(s) en retard`}
              tone="emerald"
              actionLabel="Ouvrir les factures"
              onAction={() => {
                setFinancePanelWithUrl("ops");
                setOperationsSectionWithUrl("factures");
              }}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Arbitrages</h4>
                <Badge variant={selectedPendingExpenseQueue.length ? "warning" : "success"}>{selectedPendingExpenseQueue.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {!selectedPendingExpenseQueue.length && <EmptyState text="Aucune depense en attente." />}
                {selectedPendingExpenseQueue.slice(0, 3).map((item) => (
                  <div key={`workflow-pending-${item.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="font-medium text-slate-900">{item.category}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatMoney(item.amount, item.currency, locale)} - {item.project_name || "Hors projet"}</p>
                    {canManageFinance && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => approveExpense(item.id)} disabled={saving}>
                          Valider
                        </Button>
                        <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => rejectExpense(item.id)} disabled={saving}>
                          Rejeter
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Reglements fournisseurs</h4>
                <Badge variant={selectedExpenseSettlementCandidates.length ? "danger" : "success"}>{selectedExpenseSettlementCandidates.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {!selectedExpenseSettlementCandidates.length && <EmptyState text="Aucune depense approuvee a regler." />}
                {selectedExpenseSettlementCandidates.slice(0, 3).map((item) => (
                  <div key={`workflow-expense-${item.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="font-medium text-slate-900">{item.expense_number || `DEP-${item.id}`}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatMoney(item.amount_due, item.currency, locale)} restant - {item.partner_name || "Sans fournisseur"}</p>
                    <Button variant="outline" className="mt-3 h-8 px-2 text-xs" onClick={() => prepareExpenseSettlement(item)}>
                      Preparer le reglement
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Recouvrements clients</h4>
                <Badge variant={selectedInvoicePaymentCandidates.some((item) => getInvoiceDisplayStatus(item) === "overdue") ? "danger" : "info"}>
                  {selectedInvoicePaymentCandidates.length}
                </Badge>
              </div>
              <div className="mt-3 space-y-2">
                {!selectedInvoicePaymentCandidates.length && !selectedRevenueCollectionCandidates.length && <EmptyState text="Aucun encaissement a suivre." />}
                {selectedInvoicePaymentCandidates.slice(0, 2).map((item) => (
                  <div key={`workflow-invoice-${item.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="font-medium text-slate-900">{item.invoice_number}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatMoney(item.amount_due, item.currency, locale)} restant - {item.customer_name}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => prepareInvoicePayment(item)}>
                        Encaisser
                      </Button>
                      {canCancelInvoice(item) && (
                        <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => cancelInvoice(item.id)} disabled={saving}>
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {selectedRevenueCollectionCandidates.slice(0, 1).map((item) => (
                  <div key={`workflow-revenue-${item.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="font-medium text-slate-900">{item.revenue_number || `REV-${item.id}`}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatMoney(item.amount_due, item.currency, locale)} a encaisser - {item.revenue_type}</p>
                    <Button variant="outline" className="mt-3 h-8 px-2 text-xs" onClick={() => prepareRevenueCollection(item)}>
                      Preparer l'encaissement
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {isDafWorkspace && canManageFinance && (activeFinancePanel === "all" || activeFinancePanel === "daf") && (
        <Card className={panelTransitionClass}>
          <SectionTitle
            eyebrow="Pilotage DAF"
            title="Pilotage financier organise par categorie"
            description={
              selectedProjectId === "all"
                ? "Vue DAF recentree sur tous les chantiers avec les arbitrages, les encours clients et les dossiers a regulariser."
                : `Vue DAF recentree sur le chantier ${selectedProjectLabel} avec les arbitrages, les encours clients et les dossiers a regulariser.`
            }
            action={
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-primary/30 focus:ring"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
              >
                <option value="all">Tous les chantiers</option>
                {projectItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            }
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DafSummaryCard
              label="Chantiers sous tension"
              value={dafSummary.atRiskProjectCount}
              helper={`${dafSummary.projectCount} chantier(s) visible(s)`}
              valueClassName="text-amber-700"
            />
            <DafSummaryCard
              label="Montant a valider"
              value={formatCompactMoney(dafSummary.pendingApprovalAmount, "XAF", locale)}
              helper={`${dafSummary.pendingApprovalCount} depense(s) en attente`}
              valueClassName="text-slate-900 dark:text-white"
            />
            <DafSummaryCard
              label="Encours client"
              value={formatCompactMoney(dafSummary.outstandingInvoiceAmount, "XAF", locale)}
              helper={`${dafSummary.outstandingInvoiceCount} facture(s) a suivre`}
              valueClassName="text-rose-700"
            />
            <DafSummaryCard
              label="Dossiers incomplets"
              value={dafSummary.proofIssueCount}
              helper="Justificatifs ou references a regulariser"
              valueClassName="text-amber-700"
            />
          </div>

          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Synthese chantiers</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Budget, depenses, marge, arbitrages en attente et encours client sur une seule ligne.</p>
                </div>
                <Badge variant="neutral">{dafProjectRows.length} chantier(s)</Badge>
              </div>
              <FinanceDataTable rows={dafProjectRows} columns={dafProjectColumns} emptyText="Aucune synthese chantier disponible pour ce filtre." />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Depenses a arbitrer</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Seulement les depenses en attente de validation, avec priorite sur les montants superieurs ou egaux a {formatMoney(MAJOR_EXPENSE_APPROVAL_THRESHOLD, "XAF", locale)}.
                  </p>
                </div>
                <Badge variant={dafPendingExpenseQueue.length ? "warning" : "success"}>{dafPendingExpenseQueue.length} en attente</Badge>
              </div>
              <FinanceDataTable rows={dafPendingExpenseQueue} columns={dafApprovalColumns} emptyText="Aucune depense en attente de validation DAF." />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Facturation client a suivre</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Factures avec reste du uniquement, triees par urgence de relance.</p>
                </div>
                <Badge variant={dafInvoiceFollowUpRows.some((item) => item.is_overdue) ? "danger" : "neutral"}>{dafInvoiceFollowUpRows.length} facture(s)</Badge>
              </div>
              <FinanceDataTable rows={dafInvoiceFollowUpRows} columns={dafInvoiceColumns} emptyText="Aucune facture client ouverte sur ce perimetre." />
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Conformite justificatifs</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Seulement les depenses en attente ou approuvees dont le dossier reste incomplet.</p>
                </div>
                <Badge variant={dafExpenseProofRows.length ? "warning" : "success"}>{dafExpenseProofRows.length} anomalie(s)</Badge>
              </div>
              <FinanceDataTable rows={dafExpenseProofRows} columns={dafProofColumns} emptyText="Tous les dossiers visibles sont complets." />
            </div>
          </div>
        </Card>
      )}

      {(activeFinancePanel === "all" || activeFinancePanel === "dashboard") && (
      <div className={`${panelTransitionClass} grid gap-5 xl:grid-cols-[0.95fr_1.05fr]`}>
        <Card>
          <SectionTitle
            eyebrow="Fiscalite"
            title="TVA et synthese fiscale"
            description="Suivi de la TVA deductible, facturee, encaissee et de la position nette."
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadExport("tax_summary", "pdf")} disabled={saving}>PDF TVA</Button>
                <Button variant="outline" onClick={() => downloadExport("tax_summary", "xlsx")} disabled={saving}>Excel TVA</Button>
              </div>
            }
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">TVA deductible</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(taxSummary?.summary?.input_vat_deductible, "XAF", locale)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">TVA facturee</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(taxSummary?.summary?.output_vat_invoiced, "XAF", locale)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">TVA encaissee</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(taxSummary?.summary?.output_vat_collected, "XAF", locale)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">TVA nette</p>
              <p className={`mt-2 text-lg font-semibold ${Number(taxSummary?.summary?.net_vat_payable || 0) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {formatMoney(taxSummary?.summary?.net_vat_payable, "XAF", locale)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle
            eyebrow="Notifications"
            title="Notifications automatiques"
            description="Paiements recus, factures en retard, budget depasse, risque de tresorerie et TVA a declarer."
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => downloadExport("notifications", "pdf")} disabled={saving}>PDF</Button>
                <Button variant="outline" onClick={() => downloadExport("notifications", "xlsx")} disabled={saving}>Excel</Button>
              </div>
            }
          />
          {!notificationItems.length && <EmptyState text={t("common.noData")} />}
          {!!notificationItems.length && (
            <div className="space-y-2">
              {notificationItems.slice(0, 6).map((item, index) => (
                <div key={`${item.code}-${index}`} className="rounded-xl border border-slate-200 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{formatDate(item.event_date, locale)} {item.reference ? `- ${item.reference}` : ""}</p>
                    </div>
                    <StatusTag value={item.severity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      )}

      {(activeFinancePanel === "all" || activeFinancePanel === "dashboard") && (
      <div className={`${panelTransitionClass} grid gap-5 xl:grid-cols-[1.05fr_0.95fr]`}>
        <Card>
          <SectionTitle eyebrow="Tresorerie" title="Flux et alertes" description="Suivi des soldes, mouvements et alertes intelligentes." />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Entrees</p>
              <p className="mt-2 text-lg font-semibold text-emerald-700">{formatMoney(cashFlow?.summary?.incoming, "XAF", locale)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Sorties</p>
              <p className="mt-2 text-lg font-semibold text-rose-700">{formatMoney(cashFlow?.summary?.outgoing, "XAF", locale)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Flux net</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(cashFlow?.summary?.net_cash_flow, "XAF", locale)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.finance.treasuryTitle")}</h4>
              {!treasuryItems.length && <EmptyState text={t("common.noData")} />}
              {treasuryItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.code} - {item.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{formatCode(item.account_type)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatMoney(item.current_balance, item.currency, locale)}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">seuil {formatMoney(item.alert_threshold, item.currency, locale)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Mouvements recents</h4>
              {!movementItems.length && <EmptyState text={t("common.noData")} />}
              {movementItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{treasuryNameById[item.treasury_account_id] || "Compte inconnu"}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(item.movement_date, locale)} - {item.reference || item.source_type}</p>
                    </div>
                    <p className={item.direction === "incoming" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>
                      {item.direction === "incoming" ? "+" : "-"}{formatMoney(item.amount, item.currency, locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.finance.alertsTitle")}</h4>
            {!alertItems.length && !pendingBudgetItems.length && !pendingExpenseItems.length && <EmptyState text="Aucune alerte pour le moment." />}
            {alertItems.map((alert, index) => (
              <div key={`${alert.code}-${index}`} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-950">{alert.message}</p>
                  <p className="text-sm text-amber-700">{formatCode(alert.level)}</p>
                </div>
              </div>
            ))}
            {pendingBudgetItems.map((item) => (
              <div key={`budget-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                <div>
                  <p className="font-medium text-slate-900">{projectNameById[item.project_id] || "Projet"}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.version_label || `Budget #${item.id}`}</p>
                </div>
                {canManageFinance && <Button variant="outline" onClick={() => approveBudget(item.id)} disabled={saving}>Approuver budget</Button>}
              </div>
            ))}
            {pendingExpenseItems.map((item) => (
              <div key={`expense-${item.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                <div>
                  <p className="font-medium text-slate-900">{item.category}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{formatMoney(item.amount, item.currency, locale)}</p>
                </div>
                {canManageFinance && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => approveExpense(item.id)} disabled={saving}>Valider depense</Button>
                    <Button variant="outline" onClick={() => rejectExpense(item.id)} disabled={saving}>Rejeter depense</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Pilotage" title="Rentabilite et relances" description="Analyse par projet, factures en retard et derniers paiements." />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Rentabilite par projet</h4>
            {!profitabilityItems.length && <EmptyState text={t("common.noData")} />}
            {profitabilityItems.slice(0, 6).map((item) => (
              <div key={item.project_id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.project_name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.project_code || `PRJ-${item.project_id}`}</p>
                  </div>
                  <Badge variant={Number(item.margin || 0) >= 0 ? "success" : "danger"}>
                    {Number(item.profitability_percent || 0).toFixed(1)}%
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Budget: {formatMoney(item.budget, "XAF", locale)}</div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Depenses: {formatMoney(item.expenses, "XAF", locale)}</div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Marge: {formatMoney(item.margin, "XAF", locale)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.finance.overdueInvoicesTitle")}</h4>
            {!overdueItems.length && <EmptyState text={t("common.noData")} />}
            {overdueItems.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-rose-950">{item.invoice_number}</p>
                    <p className="text-sm text-rose-700">{item.customer_name}</p>
                  </div>
                  <StatusTag value={getInvoiceDisplayStatus(item)} />
                </div>
                <p className="mt-2 text-sm text-rose-800">{formatMoney(item.amount_due, item.currency, locale)} - {item.days_overdue} j de retard</p>
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">Paiements recents</h4>
            {!paymentItems.length && <EmptyState text={t("common.noData")} />}
            {paymentItems.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.reference || item.external_reference || `PAY-${item.id}`}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{formatDate(item.payment_date, locale)}</p>
                  </div>
                  <div className="text-right">
                    <p className={item.payment_direction === "incoming" ? "font-semibold text-emerald-700" : "font-semibold text-rose-700"}>{formatMoney(item.amount, item.currency, locale)}</p>
                    <StatusTag value={item.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}

      {canManageFinance && (activeFinancePanel === "all" || activeFinancePanel === "ops") && (
        <>
          <div className={`${panelTransitionClass} rounded-[20px] border border-slate-200 bg-white/88 shadow-[var(--app-shadow-sm)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/75`}>
            <div className="sm:hidden">
              <label className="sr-only" htmlFor="finance-operations-view-select">
                Sous-navigation operations
              </label>
              <select
                id="finance-operations-view-select"
                className="app-field mb-1 w-full px-3 py-2 text-sm font-semibold"
                value={activeOperationsSection}
                onChange={(event) => setOperationsSectionWithUrl(event.target.value)}
              >
                {financeOpsTabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="hidden overflow-x-auto px-2 py-2 sm:block [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
              <div className="flex min-w-max gap-2" role="tablist" aria-label="Sous-navigation operations">
                {financeOpsTabs.map((tab) => (
                  <button key={tab.id} type="button" className={opsButtonClass(tab.id)} onClick={() => setOperationsSectionWithUrl(tab.id)}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={`${panelTransitionClass} grid gap-5 xl:grid-cols-2`}>
            <Card>
              <SectionTitle eyebrow="Parametrage" title="Plan comptable, journaux et tiers" description="Structure comptable de base du systeme." />
              <div className="space-y-5">
                {showOpsComptes && (
                  <>
                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createAccount}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Creer un compte</h4>
                      <EditableFieldList>
                        <EditableFieldRow label="Code et intitule" hint="Reference comptable et nom du compte." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input required placeholder="Code" value={accountForm.code} onChange={(event) => updateAccount("code", event.target.value)} />
                            <Input required className="md:col-span-2" placeholder="Intitule" value={accountForm.name} onChange={(event) => updateAccount("name", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Classe comptable" hint="Nature du compte dans le plan.">
                          <select className={SELECT_CLASS} value={accountForm.account_class} onChange={(event) => updateAccount("account_class", event.target.value)}>
                            {ACCOUNT_CLASSES.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                          </select>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Creer le compte</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createJournal}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Creer un journal</h4>
                      <EditableFieldList>
                        <EditableFieldRow label="Identification" hint="Code et libelle du journal.">
                          <div className="grid gap-3 md:grid-cols-2">
                            <Input required placeholder="Code journal" value={journalForm.code} onChange={(event) => updateJournal("code", event.target.value)} />
                            <Input required placeholder="Nom journal" value={journalForm.name} onChange={(event) => updateJournal("name", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Type de journal" hint="Achats, ventes, banque, caisse ou divers.">
                          <select className={SELECT_CLASS} value={journalForm.journal_type} onChange={(event) => updateJournal("journal_type", event.target.value)}>
                            {JOURNAL_TYPES.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                          </select>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Creer le journal</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createPartner}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Creer un tiers</h4>
                      <EditableFieldList>
                        <EditableFieldRow label="Raison sociale" hint="Nom du client, fournisseur ou tiers.">
                          <Input required placeholder="Raison sociale" value={partnerForm.legal_name} onChange={(event) => updatePartner("legal_name", event.target.value)} />
                        </EditableFieldRow>
                        <EditableFieldRow label="Type et contact" hint="Nature du tiers et coordonnees utiles." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <select className={SELECT_CLASS} value={partnerForm.partner_type} onChange={(event) => updatePartner("partner_type", event.target.value)}>
                              {PARTNER_TYPES.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <Input placeholder="Telephone" value={partnerForm.phone} onChange={(event) => updatePartner("phone", event.target.value)} />
                            <Input placeholder="Email" value={partnerForm.email} onChange={(event) => updatePartner("email", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Creer le tiers</Button>
                    </form>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Comptes</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{accountItems.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Journaux</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{journalItems.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Tiers</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{partnerItems.length}</p>
                      </div>
                    </div>
                  </>
                )}
                {!showOpsComptes && <EmptyState text="Selectionnez Comptes pour afficher ce bloc." />}
              </div>
            </Card>

            <Card>
              <SectionTitle eyebrow="Operations" title="Tresorerie, budgets, depenses, recettes et factures" description="Saisie rapide et suivi comptable quotidien." />
              <div className="space-y-5">
                {showOpsComptes && (
                  <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createTreasuryAccount}>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Compte financier</h4>
                    <EditableFieldList>
                      <EditableFieldRow label="Identification" hint="Code et nom du compte de tresorerie.">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input required placeholder="Code" value={treasuryForm.code} onChange={(event) => updateTreasury("code", event.target.value)} />
                          <Input required placeholder="Nom" value={treasuryForm.name} onChange={(event) => updateTreasury("name", event.target.value)} />
                        </div>
                      </EditableFieldRow>
                      <EditableFieldRow label="Type et seuils" hint="Nature du compte, solde initial et alerte." multiline>
                        <div className="grid gap-3 md:grid-cols-3">
                          <select className={SELECT_CLASS} value={treasuryForm.account_type} onChange={(event) => updateTreasury("account_type", event.target.value)}>
                            {TREASURY_TYPES.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                          </select>
                          <Input type="number" placeholder="Solde initial" value={treasuryForm.opening_balance} onChange={(event) => updateTreasury("opening_balance", event.target.value)} />
                          <Input type="number" placeholder="Seuil d'alerte" value={treasuryForm.alert_threshold} onChange={(event) => updateTreasury("alert_threshold", event.target.value)} />
                        </div>
                      </EditableFieldRow>
                    </EditableFieldList>
                    <Button type="submit" disabled={saving}>Creer le compte financier</Button>
                  </form>
                )}

                {showOpsBudgets && (
                  <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createBudget}>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Budget projet</h4>
                    <EditableFieldList>
                      <EditableFieldRow label="Projet" hint="Projet rattache au budget.">
                        <select className={SELECT_CLASS} value={budgetForm.project_id} onChange={(event) => updateBudget("project_id", event.target.value)} required>
                          <option value="">Projet</option>
                          {projectItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </EditableFieldRow>
                      <EditableFieldRow label="Version et montant" hint="Version de travail et enveloppe totale.">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input placeholder="Version budget" value={budgetForm.version_label} onChange={(event) => updateBudget("version_label", event.target.value)} />
                          <Input required type="number" placeholder="Budget total" value={budgetForm.total_budget} onChange={(event) => updateBudget("total_budget", event.target.value)} />
                        </div>
                      </EditableFieldRow>
                      <EditableFieldRow label="Notes" hint="Contexte et hypotheses budgetaires." multiline>
                        <Textarea rows={2} placeholder="Notes" value={budgetForm.notes} onChange={(event) => updateBudget("notes", event.target.value)} />
                      </EditableFieldRow>
                    </EditableFieldList>
                    <Button type="submit" disabled={saving}>Creer le budget</Button>
                  </form>
                )}

                {showOpsDepenses && (
                  <>
                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createExpense}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Depense</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{expenseOperationHint}</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Projet et fournisseur" hint="Affectation de la depense." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={expenseForm.project_id} onChange={(event) => updateExpense("project_id", event.target.value)}>
                              <option value="">Projet optionnel</option>
                              {projectItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <select className={SELECT_CLASS} value={expenseForm.partner_id} onChange={(event) => updateExpense("partner_id", event.target.value)}>
                              <option value="">Fournisseur</option>
                              {supplierItems.map((item) => <option key={item.id} value={item.id}>{item.legal_name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Nature et montant" hint="Categorie, montant TTC et TVA." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input required placeholder="Categorie" value={expenseForm.category} onChange={(event) => updateExpense("category", event.target.value)} />
                            <Input required type="number" placeholder="Montant TTC" value={expenseForm.amount} onChange={(event) => updateExpense("amount", event.target.value)} />
                            <Input type="number" placeholder="Taux TVA %" value={expenseForm.tax_rate} onChange={(event) => updateExpense("tax_rate", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Reglement" hint="Date, mode et compte de sortie." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input required type="date" value={expenseForm.expense_date} onChange={(event) => updateExpense("expense_date", event.target.value)} />
                            <select className={SELECT_CLASS} value={expenseForm.payment_method} onChange={(event) => updateExpense("payment_method", event.target.value)}>
                              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <select className={SELECT_CLASS} value={expenseForm.treasury_account_id} onChange={(event) => updateExpense("treasury_account_id", event.target.value)}>
                              <option value="">Compte financier</option>
                              {treasuryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Justificatif" hint="Reference de piece ou numero de facture.">
                          <Input placeholder="Justificatif" value={expenseForm.document_reference} onChange={(event) => updateExpense("document_reference", event.target.value)} />
                        </EditableFieldRow>
                        <EditableFieldRow label="Description" hint="Precisions sur l'achat ou le service." multiline>
                          <Textarea rows={2} placeholder="Description" value={expenseForm.description} onChange={(event) => updateExpense("description", event.target.value)} />
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Enregistrer la depense</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4" onSubmit={settleExpense}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Reglement depense</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Reglez ici uniquement les depenses deja approuvees mais non soldées.</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Depense et compte" hint="Selection de la depense approuvee et du compte de decaissement." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={expenseSettlementForm.expense_id} onChange={handleExpenseSettlementChange} required>
                              <option value="">Depense a regler</option>
                              {expenseSettlementCandidates.map((item) => (
                                <option key={item.id} value={item.id}>{item.expense_number || `DEP-${item.id}`} - {item.category}</option>
                              ))}
                            </select>
                            <select className={SELECT_CLASS} value={expenseSettlementForm.treasury_account_id} onChange={(event) => updateExpenseSettlement("treasury_account_id", event.target.value)}>
                              <option value="">Compte financier</option>
                              {treasuryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        {selectedExpenseForSettlement && (
                          <EditableFieldRow label="Contexte depense" hint="Lecture seule du dossier approuve.">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                              <p className="font-medium text-slate-900 dark:text-white">{selectedExpenseForSettlement.category}</p>
                              <p className="mt-1">
                                Reste du {formatMoney(selectedExpenseForSettlement.amount_due, selectedExpenseForSettlement.currency, locale)} - {selectedExpenseForSettlement.partner_name || "Sans fournisseur"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Statut paiement {formatCode(selectedExpenseForSettlement.payment_status)} - Deja regle {formatMoney(selectedExpenseForSettlement.paid_amount, selectedExpenseForSettlement.currency, locale)}
                              </p>
                            </div>
                          </EditableFieldRow>
                        )}
                        {selectedExpenseForSettlement && (
                          <EditableFieldRow label="Historique recent" hint="Reglements deja postes sur cette depense.">
                            <PaymentHistoryList
                              rows={selectedExpensePaymentHistory}
                              emptyText="Aucun reglement enregistre sur cette depense."
                              locale={locale}
                              currency={selectedExpenseForSettlement.currency}
                            />
                          </EditableFieldRow>
                        )}
                        <EditableFieldRow label="Montant et reference" hint="Montant regle, date, mode et reference." multiline>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Input
                              required
                              type="number"
                              placeholder="Montant"
                              value={expenseSettlementForm.amount}
                              onChange={(event) => updateExpenseSettlement("amount", event.target.value)}
                              max={selectedExpenseForSettlement ? Number(selectedExpenseForSettlement.amount_due || 0) : undefined}
                            />
                            <Input required type="date" value={expenseSettlementForm.payment_date} onChange={(event) => updateExpenseSettlement("payment_date", event.target.value)} />
                            <select className={SELECT_CLASS} value={expenseSettlementForm.payment_method} onChange={(event) => updateExpenseSettlement("payment_method", event.target.value)}>
                              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <Input placeholder="Reference" value={expenseSettlementForm.reference} onChange={(event) => updateExpenseSettlement("reference", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving || !expenseSettlementCandidates.length}>Enregistrer le reglement</Button>
                    </form>
                  </>
                )}

                {showOpsFactures && (
                  <>
                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createRevenue}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Recette</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{revenueOperationHint}</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Projet et client" hint="Affectation de la recette." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={revenueForm.project_id} onChange={(event) => updateRevenue("project_id", event.target.value)}>
                              <option value="">Projet optionnel</option>
                              {projectItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <select className={SELECT_CLASS} value={revenueForm.partner_id} onChange={(event) => updateRevenue("partner_id", event.target.value)}>
                              <option value="">Client</option>
                              {customerItems.map((item) => <option key={item.id} value={item.id}>{item.legal_name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Nature et montant" hint="Type de recette, total et TVA." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input required placeholder="Type de recette" value={revenueForm.revenue_type} onChange={(event) => updateRevenue("revenue_type", event.target.value)} />
                            <Input required type="number" placeholder="Montant TTC" value={revenueForm.amount} onChange={(event) => updateRevenue("amount", event.target.value)} />
                            <Input type="number" placeholder="Taux TVA %" value={revenueForm.tax_rate} onChange={(event) => updateRevenue("tax_rate", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Encaissement" hint="Date, moyen et compte de tresorerie." multiline>
                          <div className="grid gap-3 md:grid-cols-3">
                            <Input required type="date" value={revenueForm.revenue_date} onChange={(event) => updateRevenue("revenue_date", event.target.value)} />
                            <select className={SELECT_CLASS} value={revenueForm.payment_method} onChange={(event) => updateRevenue("payment_method", event.target.value)}>
                              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <select className={SELECT_CLASS} value={revenueForm.treasury_account_id} onChange={(event) => updateRevenue("treasury_account_id", event.target.value)}>
                              <option value="">Compte financier</option>
                              {treasuryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Reference" hint="Numero ou piece associee.">
                          <Input placeholder="Reference" value={revenueForm.reference} onChange={(event) => updateRevenue("reference", event.target.value)} />
                        </EditableFieldRow>
                        <EditableFieldRow label="Description" hint="Commentaire complementaire." multiline>
                          <Textarea rows={2} placeholder="Description" value={revenueForm.description} onChange={(event) => updateRevenue("description", event.target.value)} />
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Enregistrer la recette</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4" onSubmit={collectRevenue}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Encaissement recette</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Utilisez ce formulaire pour solder ou encaisser partiellement une recette deja ouverte.</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Recette et compte" hint="Selection de la recette a encaisser et du compte d'entree." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={revenueCollectionForm.revenue_id} onChange={handleRevenueCollectionChange} required>
                              <option value="">Recette a encaisser</option>
                              {revenueCollectionCandidates.map((item) => (
                                <option key={item.id} value={item.id}>{item.revenue_number || `REV-${item.id}`} - {item.revenue_type}</option>
                              ))}
                            </select>
                            <select className={SELECT_CLASS} value={revenueCollectionForm.treasury_account_id} onChange={(event) => updateRevenueCollection("treasury_account_id", event.target.value)}>
                              <option value="">Compte financier</option>
                              {treasuryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        {selectedRevenueForCollection && (
                          <EditableFieldRow label="Contexte recette" hint="Lecture seule du dossier a recouvrer.">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                              <p className="font-medium text-slate-900 dark:text-white">{selectedRevenueForCollection.revenue_type}</p>
                              <p className="mt-1">
                                Reste du {formatMoney(selectedRevenueForCollection.amount_due, selectedRevenueForCollection.currency, locale)} - {partnerNameById[selectedRevenueForCollection.partner_id] || "Sans client"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Statut collecte {formatCode(selectedRevenueForCollection.collection_status)} - Deja encaisse {formatMoney(selectedRevenueForCollection.collected_amount, selectedRevenueForCollection.currency, locale)}
                              </p>
                            </div>
                          </EditableFieldRow>
                        )}
                        {selectedRevenueForCollection && (
                          <EditableFieldRow label="Historique recent" hint="Encaissements deja postes sur cette recette.">
                            <PaymentHistoryList
                              rows={selectedRevenuePaymentHistory}
                              emptyText="Aucun encaissement enregistre sur cette recette."
                              locale={locale}
                              currency={selectedRevenueForCollection.currency}
                            />
                          </EditableFieldRow>
                        )}
                        <EditableFieldRow label="Montant et reference" hint="Montant encaisse, date, mode et reference." multiline>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Input
                              required
                              type="number"
                              placeholder="Montant"
                              value={revenueCollectionForm.amount}
                              onChange={(event) => updateRevenueCollection("amount", event.target.value)}
                              max={selectedRevenueForCollection ? Number(selectedRevenueForCollection.amount_due || 0) : undefined}
                            />
                            <Input required type="date" value={revenueCollectionForm.payment_date} onChange={(event) => updateRevenueCollection("payment_date", event.target.value)} />
                            <select className={SELECT_CLASS} value={revenueCollectionForm.payment_method} onChange={(event) => updateRevenueCollection("payment_method", event.target.value)}>
                              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <Input placeholder="Reference" value={revenueCollectionForm.reference} onChange={(event) => updateRevenueCollection("reference", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving || !revenueCollectionCandidates.length}>Enregistrer l'encaissement</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createInvoice}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Facture</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{invoiceOperationHint}</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Projet et client" hint="Projet facture et tiers client." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={invoiceForm.project_id} onChange={(event) => updateInvoice("project_id", event.target.value)}>
                              <option value="">Projet optionnel</option>
                              {projectItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            <select className={SELECT_CLASS} value={invoiceForm.customer_id} onChange={(event) => updateInvoice("customer_id", event.target.value)}>
                              <option value="">Client</option>
                              {customerItems.map((item) => <option key={item.id} value={item.id}>{item.legal_name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Nom du client" hint="Saisie libre si aucun client n'est rattache.">
                          <Input placeholder="Nom du client" value={invoiceForm.customer_name} onChange={(event) => updateInvoice("customer_name", event.target.value)} disabled={Boolean(invoiceForm.customer_id)} />
                        </EditableFieldRow>
                        <EditableFieldRow label="Montant et echeances" hint="Total TTC, TVA, date d'emission et date limite." multiline>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Input required type="number" placeholder="Montant TTC" value={invoiceForm.amount_total} onChange={(event) => updateInvoice("amount_total", event.target.value)} />
                            <Input type="number" placeholder="Taux TVA %" value={invoiceForm.tax_rate} onChange={(event) => updateInvoice("tax_rate", event.target.value)} />
                            <Input required type="date" value={invoiceForm.issued_on} onChange={(event) => updateInvoice("issued_on", event.target.value)} />
                            <Input type="date" value={invoiceForm.due_on} onChange={(event) => updateInvoice("due_on", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                        <EditableFieldRow label="Statut" hint="Etat de suivi de la facture.">
                          <select className={SELECT_CLASS} value={invoiceForm.status} onChange={(event) => updateInvoice("status", event.target.value)}>
                            {INVOICE_CREATION_STATUSES.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                          </select>
                        </EditableFieldRow>
                        <EditableFieldRow label="Notes" hint="Informations additionnelles pour la facturation." multiline>
                          <Textarea rows={2} placeholder="Notes" value={invoiceForm.notes} onChange={(event) => updateInvoice("notes", event.target.value)} />
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Creer la facture</Button>
                    </form>

                    <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={recordPayment}>
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Paiement recu</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">Selectionnez une facture ouverte uniquement. Le reste du est pre-rempli pour eviter les erreurs de saisie.</p>
                      <EditableFieldList>
                        <EditableFieldRow label="Facture et compte" hint="Facture reglee et compte d'encaissement." multiline>
                          <div className="grid gap-3 md:grid-cols-2">
                            <select className={SELECT_CLASS} value={paymentForm.invoice_id} onChange={handlePaymentInvoiceChange} required>
                              <option value="">Facture a regler</option>
                              {invoicePaymentCandidates.map((item) => (
                                <option key={item.id} value={item.id}>{item.invoice_number} - {item.customer_name}</option>
                              ))}
                            </select>
                            <select className={SELECT_CLASS} value={paymentForm.treasury_account_id} onChange={(event) => updatePayment("treasury_account_id", event.target.value)}>
                              <option value="">Compte financier</option>
                              {treasuryItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                          </div>
                        </EditableFieldRow>
                        {selectedInvoiceForPayment && (
                          <EditableFieldRow label="Contexte facture" hint="Lecture seule du dossier selectionne.">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {selectedInvoiceForPayment.invoice_number} - {selectedInvoiceForPayment.customer_name}
                              </p>
                              <p className="mt-1">
                                Reste du {formatMoney(selectedInvoiceForPayment.amount_due, selectedInvoiceForPayment.currency, locale)} - Statut {formatCode(getInvoiceDisplayStatus(selectedInvoiceForPayment))}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Echeance {formatDate(selectedInvoiceForPayment.due_on, locale)} - Deja encaisse {formatMoney(selectedInvoiceForPayment.amount_paid, selectedInvoiceForPayment.currency, locale)}
                              </p>
                            </div>
                          </EditableFieldRow>
                        )}
                        {selectedInvoiceForPayment && (
                          <EditableFieldRow label="Historique recent" hint="Encaissements deja postes sur cette facture.">
                            <PaymentHistoryList
                              rows={selectedInvoicePaymentHistory}
                              emptyText="Aucun paiement enregistre sur cette facture."
                              locale={locale}
                              currency={selectedInvoiceForPayment.currency}
                            />
                          </EditableFieldRow>
                        )}
                        <EditableFieldRow label="Montant et reference" hint="Valeur recouvrée, date, mode et reference." multiline>
                          <div className="grid gap-3 md:grid-cols-4">
                            <Input
                              required
                              type="number"
                              placeholder="Montant"
                              value={paymentForm.amount}
                              onChange={(event) => updatePayment("amount", event.target.value)}
                              max={selectedInvoiceForPayment ? Number(selectedInvoiceForPayment.amount_due || 0) : undefined}
                            />
                            <Input required type="date" value={paymentForm.payment_date} onChange={(event) => updatePayment("payment_date", event.target.value)} />
                            <select className={SELECT_CLASS} value={paymentForm.payment_method} onChange={(event) => updatePayment("payment_method", event.target.value)}>
                              {PAYMENT_METHODS.map((value) => <option key={value} value={value}>{formatCode(value)}</option>)}
                            </select>
                            <Input placeholder="Reference" value={paymentForm.reference} onChange={(event) => updatePayment("reference", event.target.value)} />
                          </div>
                        </EditableFieldRow>
                      </EditableFieldList>
                      <Button type="submit" disabled={saving}>Enregistrer le paiement</Button>
                    </form>
                  </>
                )}

                {(showOpsDepenses || showOpsFactures) && (
                  <div className="grid gap-3 md:grid-cols-3">
                    {showOpsDepenses && (
                      <div className="rounded-xl border border-slate-200 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Depenses</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{expenseItems.length}</p>
                      </div>
                    )}
                    {showOpsFactures && (
                      <>
                        <div className="rounded-xl border border-slate-200 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Recettes</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">{revenueItems.length}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 px-3 py-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Factures</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">{invoiceItems.length}</p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!showOpsComptes && !showOpsBudgets && !showOpsDepenses && !showOpsFactures && (
                  <EmptyState text="Selectionnez un sous-bloc Operations." />
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {(activeFinancePanel === "all" || activeFinancePanel === "history") && (
      <div className={`${panelTransitionClass} grid gap-5 xl:grid-cols-3`}>
        <Card>
          <SectionTitle title="Dernieres depenses" />
          {!expenseItems.length && <EmptyState text={t("common.noData")} />}
          {expenseItems.slice(0, 6).map((item) => (
            <div key={item.id} className="mb-2 rounded-xl border border-slate-200 px-3 py-3 last:mb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.category}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{projectNameById[item.project_id] || "Hors projet"}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    HT {formatMoney(item.net_amount, item.currency, locale)} - TVA {formatMoney(item.tax_amount, item.currency, locale)} ({formatRate(item.tax_rate, locale)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-rose-700">{formatMoney(item.amount, item.currency, locale)}</p>
                  <StatusTag value={item.approval_status} />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle title="Dernieres recettes" />
          {!revenueItems.length && <EmptyState text={t("common.noData")} />}
          {revenueItems.slice(0, 6).map((item) => (
            <div key={item.id} className="mb-2 rounded-xl border border-slate-200 px-3 py-3 last:mb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.revenue_type}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{partnerNameById[item.partner_id] || "Sans client"}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    HT {formatMoney(item.net_amount, item.currency, locale)} - TVA {formatMoney(item.tax_amount, item.currency, locale)} ({formatRate(item.tax_rate, locale)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-700">{formatMoney(item.amount, item.currency, locale)}</p>
                  <StatusTag value={item.collection_status} />
                </div>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle title="Dernieres factures" />
          {!invoiceItems.length && <EmptyState text={t("common.noData")} />}
          {invoiceItems.slice(0, 6).map((item) => (
            <div key={item.id} className="mb-2 rounded-xl border border-slate-200 px-3 py-3 last:mb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.invoice_number}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{item.customer_name} - {formatDate(item.issued_on, locale)}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    HT {formatMoney(item.subtotal_amount ?? (Number(item.amount_total || 0) - Number(item.tax_amount || 0)), item.currency, locale)} - TVA {formatMoney(item.tax_amount, item.currency, locale)} ({formatRate(item.tax_rate, locale)})
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatMoney(item.amount_total, item.currency, locale)}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Reste {formatMoney(item.amount_due, item.currency, locale)}</p>
                  <StatusTag value={getInvoiceDisplayStatus(item)} />
                </div>
              </div>
              {canManageFinance && (canSendInvoice(item) || canCancelInvoice(item)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {canSendInvoice(item) && <Button variant="outline" onClick={() => sendInvoice(item.id)} disabled={saving}>Envoyer facture</Button>}
                  {canCancelInvoice(item) && <Button variant="outline" onClick={() => cancelInvoice(item.id)} disabled={saving}>Annuler facture</Button>}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
      )}
        </>
      )}
    </section>
  );
}
