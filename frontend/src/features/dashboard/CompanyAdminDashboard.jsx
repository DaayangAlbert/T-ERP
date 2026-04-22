import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  FolderKanban,
  HardHat,
  ReceiptText,
  ShieldCheck,
  UserCog,
  Users2,
  Wallet,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const MODULE_META = {
  finance: {
    icon: Wallet,
    tone: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    iconClass: "bg-emerald-500/15 text-emerald-200",
  },
  inventory: {
    icon: Warehouse,
    tone: "from-amber-500/20 via-amber-400/10 to-transparent",
    iconClass: "bg-amber-500/15 text-amber-100",
  },
  procurement: {
    icon: BriefcaseBusiness,
    tone: "from-sky-500/20 via-sky-400/10 to-transparent",
    iconClass: "bg-sky-500/15 text-sky-100",
  },
  rh: {
    icon: UserCog,
    tone: "from-blue-500/20 via-blue-400/10 to-transparent",
    iconClass: "bg-blue-500/15 text-blue-100",
  },
  projects: {
    icon: FolderKanban,
    tone: "from-blue-500/20 via-sky-400/10 to-transparent",
    iconClass: "bg-blue-500/15 text-blue-100",
  },
  worker: {
    icon: HardHat,
    tone: "from-orange-500/20 via-orange-400/10 to-transparent",
    iconClass: "bg-orange-500/15 text-orange-100",
  },
  audit: {
    icon: ShieldCheck,
    tone: "from-sky-500/20 via-blue-400/10 to-transparent",
    iconClass: "bg-sky-500/15 text-sky-100",
  },
  support: {
    icon: ShieldCheck,
    tone: "from-slate-400/25 via-slate-200/10 to-transparent",
    iconClass: "bg-white/10 text-white",
  },
  default: {
    icon: Building2,
    tone: "from-white/15 via-white/5 to-transparent",
    iconClass: "bg-white/10 text-white",
  },
};

const SIGNAL_VARIANTS = {
  success: {
    wrapper: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-950/30 dark:text-emerald-100",
    badge: "success",
    icon: "text-emerald-600 dark:text-emerald-300",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/30 dark:text-amber-100",
    badge: "warning",
    icon: "text-amber-600 dark:text-amber-300",
  },
  danger: {
    wrapper: "border-rose-200 bg-rose-50/90 text-rose-950 dark:border-rose-500/25 dark:bg-rose-950/30 dark:text-rose-100",
    badge: "danger",
    icon: "text-rose-600 dark:text-rose-300",
  },
  info: {
    wrapper: "border-sky-200 bg-sky-50/90 text-sky-950 dark:border-sky-500/25 dark:bg-sky-950/30 dark:text-sky-100",
    badge: "info",
    icon: "text-sky-600 dark:text-sky-300",
  },
};

function clampPercent(value) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 100));
}

function formatDate(value, locale) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(parsed);
}

function formatDateTime(value, locale) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatCurrency(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function resolveProjectStatusBadge(status) {
  if (status === "completed" || status === "final_acceptance") {
    return "success";
  }

  if (status === "in_progress" || status === "planned") {
    return "info";
  }

  if (status === "suspended" || status === "on_hold") {
    return "warning";
  }

  if (status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

function getRemainingDays(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.round((targetUtc - todayUtc) / 86400000);
}

function resolveStatusBadge(status, t) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "active") {
    return { label: t("dashboard.companyAdmin.statusActive"), variant: "success" };
  }

  if (normalized === "pending") {
    return { label: t("dashboard.companyAdmin.statusPending"), variant: "warning" };
  }

  if (normalized === "suspended") {
    return { label: t("dashboard.companyAdmin.statusSuspended"), variant: "danger" };
  }

  if (normalized === "expired") {
    return { label: t("dashboard.companyAdmin.statusExpired"), variant: "danger" };
  }

  if (normalized === "inactive") {
    return { label: t("dashboard.companyAdmin.statusInactive"), variant: "neutral" };
  }

  return { label: t("dashboard.companyAdmin.statusUnknown"), variant: "neutral" };
}

function HeroMetric({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
          {hint ? <p className="mt-2 text-sm text-slate-300">{hint}</p> : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, percent, summary, fillClass }) {
  const safePercent = clampPercent(percent);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">{Math.round(safePercent)}%</p>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${fillClass}`} style={{ width: `${safePercent}%` }} />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">{summary}</p>
    </div>
  );
}

function buildConicGradient(segments) {
  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);

  if (!total) {
    return "conic-gradient(#cbd5e1 0% 100%)";
  }

  let cursor = 0;
  const stops = segments.map((segment) => {
    const next = cursor + (Number(segment.value || 0) / total) * 100;
    const stop = `${segment.color} ${cursor}% ${next}%`;
    cursor = next;
    return stop;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function CoverageBarChart({ items }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.displayValue}</p>
            </div>
            <p className="text-right text-xs text-slate-300">{item.detail}</p>
          </div>
          <div className="mt-4 flex h-32 items-end rounded-[22px] bg-slate-900/60 p-3">
            <div
              className={`w-full rounded-[18px] bg-gradient-to-t ${item.accent}`}
              style={{ height: `${Math.max(clampPercent(item.value), 12)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AttentionDonut({ segments, total, totalLabel, integerFormatter }) {
  const visualSegments = total > 0 ? segments : [{ label: totalLabel, value: 1, color: "#cbd5e1" }];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
      <div className="mx-auto">
        <div
          className="relative h-52 w-52 rounded-full shadow-[0_28px_60px_-40px_rgba(15,23,42,0.55)]"
          style={{ background: buildConicGradient(visualSegments) }}
        >
          <div className="absolute inset-[22px] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <p className="text-4xl font-semibold text-slate-950">{integerFormatter.format(total)}</p>
            <p className="mt-2 max-w-[7rem] text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              {totalLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: segment.color }} />
              <p className="truncate text-sm font-medium text-slate-700">{segment.label}</p>
            </div>
            <p className="text-sm font-semibold text-slate-950">{integerFormatter.format(segment.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationQueueItem({ item }) {
  const tone = SIGNAL_VARIANTS[item.variant] || SIGNAL_VARIANTS.info;
  const Icon = item.icon || AlertTriangle;

  return (
    <div className={`rounded-[28px] border p-4 ${tone.wrapper}`}>
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 dark:bg-slate-950/55">
          <Icon className={`h-5 w-5 ${tone.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tone.badge}>{item.countLabel}</Badge>
            <p className="text-sm font-semibold">{item.title}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-current/90">{item.description}</p>
          {item.to ? (
            <div className="mt-4">
              <Link
                to={item.to}
                className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white dark:border-white/10 dark:bg-slate-950/55 dark:text-white dark:hover:bg-slate-900"
              >
                {item.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value, tone = "text-slate-950" }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-50/85 px-4 py-4">
      <div className="flex items-center justify-between gap-4 md:block">
        <p className="max-w-[12rem] text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">{label}</p>
        <p className={`text-2xl font-semibold leading-none tabular-nums whitespace-nowrap md:mt-2 ${tone}`}>{value}</p>
      </div>
    </div>
  );
}

function WorkspaceActionCard({ card, t }) {
  const cardKey = card.key || card.id || "default";
  const meta = MODULE_META[cardKey] || MODULE_META.default;
  const Icon = meta.icon;

  return (
    <Link
      to={card.to}
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 p-5 text-white transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl ${card.to ? "" : "pointer-events-none opacity-75"}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.tone}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 ${meta.iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
            {t("dashboard.companyAdmin.openWorkspace")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-lg font-semibold">{card.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
        </div>

        {!!card.stats?.length && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {card.stats.map((stat) => (
              <div
                key={`${cardKey}-${stat.label}`}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="max-w-[11rem] text-xs uppercase tracking-[0.14em] text-slate-300">{stat.label}</p>
                  <p className="text-right text-lg font-semibold text-white whitespace-nowrap tabular-nums">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!!card.badges?.length && (
          <div className="mt-5 flex flex-wrap gap-2">
            {card.badges.slice(0, 3).map((badge) => (
              <span
                key={`${cardKey}-${badge}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function DepartmentDistribution({ departments, total, t }) {
  if (!departments.length || total <= 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">{t("dashboard.companyAdmin.departmentsEmpty")}</p>;
  }

  return (
    <div className="space-y-4">
      {departments.map(([label, value], index) => {
        const percent = clampPercent((Number(value || 0) / total) * 100);
        const fills = [
          "bg-gradient-to-r from-blue-500 to-sky-500",
          "bg-gradient-to-r from-emerald-500 to-teal-500",
          "bg-gradient-to-r from-amber-500 to-orange-500",
          "bg-gradient-to-r from-slate-700 to-slate-500",
        ];

        return (
          <div key={`${label}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">
                {value} / {total}
              </p>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={`h-2 rounded-full ${fills[index % fills.length]}`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityList({ items, locale, t }) {
  if (!items.length) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">{t("dashboard.companyAdmin.recentActivityEmpty")}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-900 dark:text-white">
                {item.description || t("dashboard.companyAdmin.activityFallback")}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {item.actor_email || t("dashboard.systemActor")} | {formatDateTime(item.created_at, locale) || "-"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CompanyAdminDashboard({
  t,
  locale,
  user,
  profileTitle,
  profileFocus,
  companyDashboard,
  workspaceCards,
  quickEntries,
  statuses,
  financeDashboard,
  inventoryDashboard,
  projectsDashboard,
}) {
  const companyName = companyDashboard?.company?.legal_name || t("workspaceProfiles.company_admin.title");
  const totalUsers = Number(companyDashboard?.users?.total || 0);
  const activeUsers = Number(companyDashboard?.users?.active || 0);
  const inactiveUsers = Number(companyDashboard?.users?.inactive || 0);
  const managers = Number(companyDashboard?.personnel?.managers || 0);
  const incompleteProfiles = Number(companyDashboard?.personnel?.incomplete_profiles || 0);
  const recentHires = Number(companyDashboard?.personnel?.recent_hires_30d || 0);
  const activeProjects = Number(companyDashboard?.projects?.in_progress || 0);
  const outstandingInvoices = Number(companyDashboard?.finance?.outstanding_invoices || 0);
  const lowStockItems = Number(companyDashboard?.inventory?.low_stock_items || 0);
  const alertsCount = Number(companyDashboard?.alerts?.length || 0);
  const pendingInventoryValidations = Number(inventoryDashboard?.summary?.pending_validations || 0);
  const financePendingInvoices = Number(financeDashboard?.kpis?.pending_invoices || 0);
  const delayedProjects = Number(projectsDashboard?.counts?.delayed_projects || 0);
  const overdueTasks = Number(projectsDashboard?.alerts?.overdue_tasks || 0);
  const projectSpotlight = (companyDashboard?.projects?.spotlight || []).slice(0, 5);
  const projectPressure = delayedProjects + overdueTasks;
  const budgetConsumed = Number(projectsDashboard?.financials?.budget_consumed_percent || 0);
  const financeAttentionCount = (financeDashboard?.alerts || []).filter((alert) =>
    ["overdue_invoice", "pending_expense", "budget_overrun", "cash_alert", "vat_due"].includes(alert.code)
  ).length;
  const integerFormatter = new Intl.NumberFormat(locale);
  const subscriptionEndDate = companyDashboard?.subscription?.end_date || null;
  const remainingDays = getRemainingDays(subscriptionEndDate);
  const completionRate = totalUsers ? ((totalUsers - incompleteProfiles) / totalUsers) * 100 : 100;
  const activityRate = totalUsers ? (activeUsers / totalUsers) * 100 : 0;
  const managementRate = totalUsers ? (managers / totalUsers) * 100 : 0;
  const accountStatus = resolveStatusBadge(companyDashboard?.company?.account_status, t);
  const subscriptionStatus = resolveStatusBadge(companyDashboard?.subscription?.status, t);
  const commandCards = (workspaceCards?.length ? workspaceCards : quickEntries || [])
    .slice(0, 4)
    .map((card) => ({
      ...card,
      key: card.key || card.id,
    }));
  const departments = Object.entries(companyDashboard?.users?.by_department || {}).slice(0, 5);
  const recentActivity = (companyDashboard?.latest_activity || []).slice(0, 5);
  const moduleStatuses = statuses || [];
  const subscriptionAtRisk = remainingDays !== null && remainingDays >= 0 && remainingDays <= 30;
  const priorityCount =
    incompleteProfiles +
    pendingInventoryValidations +
    financeAttentionCount +
    lowStockItems +
    projectPressure +
    (subscriptionAtRisk ? 1 : 0);

  const validationQueue = [];
  if (pendingInventoryValidations > 0) {
    validationQueue.push({
      key: "inventory-validations",
      title: t("dashboard.companyAdmin.queueValidationTitle"),
      description: t("dashboard.companyAdmin.queueValidationDescription", { count: pendingInventoryValidations }),
      countLabel: integerFormatter.format(pendingInventoryValidations),
      actionLabel: t("navigation.inventory"),
      to: "/app/inventory",
      variant: "warning",
      icon: Warehouse,
    });
  }
  if (incompleteProfiles > 0) {
    validationQueue.push({
      key: "profiles",
      title: t("dashboard.companyAdmin.signalProfilesTitle"),
      description: t("dashboard.companyAdmin.signalProfilesDescription", { count: incompleteProfiles }),
      countLabel: integerFormatter.format(incompleteProfiles),
      actionLabel: t("navigation.users"),
      to: "/app/users",
      variant: "warning",
      icon: UserCog,
    });
  }
  if (financePendingInvoices > 0 || outstandingInvoices > 0) {
    validationQueue.push({
      key: "finance",
      title: t("dashboard.companyAdmin.signalFinanceTitle"),
      description: t("dashboard.companyAdmin.signalFinanceDescription", { amount: formatCurrency(outstandingInvoices, locale) }),
      countLabel: integerFormatter.format(financePendingInvoices || financeAttentionCount || 1),
      actionLabel: t("navigation.finance"),
      to: "/app/finance",
      variant: outstandingInvoices > 0 ? "danger" : "warning",
      icon: ReceiptText,
    });
  }
  if (projectPressure > 0 || activeProjects > 0) {
    validationQueue.push({
      key: "projects",
      title: t("dashboard.companyAdmin.queueProjectsTitle"),
      description: t("dashboard.companyAdmin.queueProjectsDescription", { count: delayedProjects, tasks: overdueTasks }),
      countLabel: integerFormatter.format(projectPressure || activeProjects),
      actionLabel: t("navigation.projects"),
      to: "/app/projects",
      variant: projectPressure > 0 ? "danger" : "info",
      icon: FolderKanban,
    });
  }
  if (lowStockItems > 0) {
    validationQueue.push({
      key: "stock",
      title: t("dashboard.companyAdmin.signalStockTitle"),
      description: t("dashboard.companyAdmin.signalStockDescription", { count: lowStockItems }),
      countLabel: integerFormatter.format(lowStockItems),
      actionLabel: t("navigation.inventory"),
      to: "/app/inventory",
      variant: "danger",
      icon: AlertTriangle,
    });
  }
  if (subscriptionAtRisk) {
    validationQueue.push({
      key: "subscription",
      title: t("dashboard.companyAdmin.signalSubscriptionTitle"),
      description: t("dashboard.companyAdmin.signalSubscriptionDescription", { days: remainingDays }),
      countLabel: integerFormatter.format(Math.max(remainingDays, 0)),
      actionLabel: t("dashboard.companyAdmin.companyStatus"),
      variant: "warning",
      icon: ShieldCheck,
    });
  }
  if (!validationQueue.length) {
    validationQueue.push({
      key: "healthy",
      title: t("dashboard.companyAdmin.signalHealthyTitle"),
      description: t("dashboard.companyAdmin.signalHealthyDescription"),
      countLabel: integerFormatter.format(0),
      variant: "success",
      icon: BadgeCheck,
    });
  }

  const topDecision = validationQueue[0];
  const heroMetrics = [
    {
      icon: Users2,
      label: t("dashboard.companyAdmin.metricActiveEmployees"),
      value: integerFormatter.format(activeUsers),
      hint: t("dashboard.companyAdmin.healthActive", { count: activeUsers }),
    },
    {
      icon: UserCog,
      label: t("dashboard.companyAdmin.signalProfilesTitle"),
      value: integerFormatter.format(incompleteProfiles),
      hint: t("dashboard.companyAdmin.healthIncomplete", { count: incompleteProfiles }),
    },
    {
      icon: Warehouse,
      label: t("pages.inventory.pendingValidations"),
      value: integerFormatter.format(pendingInventoryValidations),
      hint: t("dashboard.companyAdmin.queueValidationDescription", { count: pendingInventoryValidations }),
    },
    {
      icon: ReceiptText,
      label: t("pages.finance.pendingInvoices"),
      value: integerFormatter.format(financePendingInvoices),
      hint: t("dashboard.companyAdmin.signalFinanceDescription", { amount: formatCurrency(outstandingInvoices, locale) }),
    },
    {
      icon: FolderKanban,
      label: t("dashboard.companyAdmin.metricProjects"),
      value: integerFormatter.format(activeProjects),
      hint: t("dashboard.companyAdmin.signalProjectsDescription", { count: activeProjects }),
    },
  ];

  const coverageChartItems = [
    {
      label: t("dashboard.companyAdmin.chartProfiles"),
      value: completionRate,
      displayValue: `${Math.round(completionRate)}%`,
      detail: `${Math.max(totalUsers - incompleteProfiles, 0)} / ${totalUsers || 0}`,
      accent: "from-blue-500 to-sky-500",
    },
    {
      label: t("dashboard.companyAdmin.chartActivity"),
      value: activityRate,
      displayValue: `${Math.round(activityRate)}%`,
      detail: `${activeUsers} / ${totalUsers || 0}`,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      label: t("dashboard.companyAdmin.chartManagement"),
      value: managementRate,
      displayValue: `${Math.round(managementRate)}%`,
      detail: `${managers} / ${totalUsers || 0}`,
      accent: "from-amber-500 to-orange-500",
    },
    {
      label: t("dashboard.companyAdmin.chartBudget"),
      value: budgetConsumed,
      displayValue: `${Math.round(budgetConsumed)}%`,
      detail: integerFormatter.format(activeProjects),
      accent: "from-slate-700 to-slate-500",
    },
  ];

  const attentionSegments = [
    { label: t("dashboard.companyAdmin.signalProfilesTitle"), value: incompleteProfiles, color: "#0ea5e9" },
    { label: t("dashboard.companyAdmin.queueValidationTitle"), value: pendingInventoryValidations + lowStockItems, color: "#f59e0b" },
    { label: t("dashboard.companyAdmin.signalFinanceTitle"), value: financePendingInvoices || financeAttentionCount, color: "#ef4444" },
    { label: t("dashboard.companyAdmin.queueProjectsTitle"), value: projectPressure, color: "#10b981" },
  ].filter((segment) => segment.value > 0);
  const attentionTotal = attentionSegments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-[34px] border border-slate-900/10 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.24),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(14,165,233,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,_#020617,_#0f172a_48%,_#1f2937)] p-6 text-white shadow-[0_36px_90px_-48px_rgba(15,23,42,0.92)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)]" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/10 text-white" variant="neutral">
                {t("dashboard.companyAdmin.eyebrow")}
              </Badge>
              <Badge className="bg-amber-400/20 text-amber-100" variant="neutral">
                {profileTitle}
              </Badge>
            </div>

            <h2 className="mt-5 text-3xl font-semibold leading-tight sm:text-4xl">
              {t("dashboard.companyAdmin.headline", { company: companyName })}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {t("dashboard.companyAdmin.description")}
            </p>

            {!!profileFocus?.length && (
              <div className="mt-5 flex flex-wrap gap-2">
                {profileFocus.map((label) => (
                  <span
                    key={`company-admin-focus-${label}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {heroMetrics.map((metric) => (
                <HeroMetric
                  key={metric.label}
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                  hint={metric.hint}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/6 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {t("dashboard.companyAdmin.controlCardTitle")}
                </p>
                <p className="mt-3 text-4xl font-semibold text-white">{integerFormatter.format(priorityCount)}</p>
                <p className="mt-2 max-w-sm text-sm text-slate-300">
                  {priorityCount > 0
                    ? t("dashboard.companyAdmin.priorityCounter", { count: priorityCount })
                    : t("dashboard.companyAdmin.priorityCounterQuiet")}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
                <BadgeCheck className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-slate-950/45 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/10 text-white" variant="neutral">
                  {topDecision.countLabel}
                </Badge>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {t("dashboard.companyAdmin.priorityTitle")}
                </p>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{topDecision.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{topDecision.description}</p>
              {topDecision.to ? (
                <div className="mt-4">
                  <Link
                    to={topDecision.to}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                  >
                    {topDecision.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t("dashboard.companyAdmin.companyStatus")}</p>
                <div className="mt-3">
                  <Badge variant={accountStatus.variant}>{accountStatus.label}</Badge>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t("dashboard.companyAdmin.subscriptionStatus")}</p>
                <div className="mt-3">
                  <Badge variant={subscriptionStatus.variant}>{subscriptionStatus.label}</Badge>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t("dashboard.companyAdmin.subscriptionEnd")}</p>
                <p className="mt-3 text-sm font-medium text-white">
                  {formatDate(subscriptionEndDate, locale) || t("dashboard.companyAdmin.subscriptionEndFallback")}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{t("workspace.departmentLabel")}</p>
                <p className="mt-3 text-sm font-medium text-white">
                  {user?.department || t("workspace.departmentFallback")}
                </p>
              </div>
            </div>

            {!!quickEntries?.length && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {t("dashboard.quickEntriesTitle")}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {quickEntries.slice(0, 4).map((entry) => (
                    <Link
                      key={`quick-entry-${entry.id}`}
                      to={entry.to}
                      className="flex items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
                    >
                      <span className="truncate">{entry.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(340px,0.78fr)]">
        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.chartsTitle")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{t("dashboard.companyAdmin.chartsSubtitle")}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
            <div className="rounded-[28px] border border-slate-900/10 bg-slate-950 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.organizationTitle")}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-white">{t("dashboard.companyAdmin.organizationSubtitle")}</h4>
              <div className="mt-5">
                <CoverageBarChart items={coverageChartItems} />
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-50/90 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.attentionTitle")}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-slate-900">{t("dashboard.companyAdmin.attentionSubtitle")}</h4>
              <div className="mt-5">
                <AttentionDonut
                  segments={attentionSegments}
                  total={attentionTotal}
                  totalLabel={t("dashboard.companyAdmin.attentionTotal")}
                  integerFormatter={integerFormatter}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.validationTitle")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{t("dashboard.companyAdmin.validationSubtitle")}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            {validationQueue.map((item) => (
              <ValidationQueueItem key={item.key} item={item} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.commandCenterTitle")}
              </p>
              <h3 className="mt-2 max-w-3xl text-xl font-semibold leading-snug text-slate-900">
                {t("dashboard.companyAdmin.commandCenterSubtitle")}
              </h3>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {commandCards.map((card) => (
              <WorkspaceActionCard key={`${card.key || card.id}-${card.to}`} card={card} t={t} />
            ))}
          </div>
        </Card>

        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              {t("dashboard.companyAdmin.organizationTitle")}
            </p>
            <h3 className="mt-2 max-w-2xl text-xl font-semibold leading-snug text-slate-900">
              {t("dashboard.companyAdmin.organizationSubtitle")}
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SummaryMetric label={t("dashboard.totalEmployees")} value={integerFormatter.format(totalUsers)} />
            <SummaryMetric label={t("dashboard.inactiveEmployees")} value={integerFormatter.format(inactiveUsers)} tone="text-amber-700" />
            <SummaryMetric label={t("dashboard.companyAdmin.healthNewHires", { count: recentHires })} value={integerFormatter.format(recentHires)} tone="text-emerald-700" />
          </div>

          <div className="mt-5 rounded-[26px] border border-slate-200 bg-slate-50/85 p-4">
            <p className="text-sm font-semibold text-slate-900">{t("dashboard.companyAdmin.departmentsTitle")}</p>
            <div className="mt-4">
              <DepartmentDistribution departments={departments} total={totalUsers} t={t} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <HealthBar
              label={t("dashboard.companyAdmin.profileCoverage")}
              percent={completionRate}
              summary={`${t("dashboard.companyAdmin.healthComplete", { count: Math.max(totalUsers - incompleteProfiles, 0) })} / ${t("dashboard.companyAdmin.healthIncomplete", { count: incompleteProfiles })}`}
              fillClass="bg-gradient-to-r from-blue-500 to-sky-500"
            />
            <HealthBar
              label={t("dashboard.companyAdmin.activityCoverage")}
              percent={activityRate}
              summary={`${t("dashboard.companyAdmin.healthActive", { count: activeUsers })} / ${t("dashboard.companyAdmin.healthInactive", { count: inactiveUsers })}`}
              fillClass="bg-gradient-to-r from-emerald-500 to-teal-500"
            />
            <HealthBar
              label={t("dashboard.companyAdmin.managementCoverage")}
              percent={managementRate}
              summary={`${t("dashboard.companyAdmin.healthManagers", { count: managers })} / ${t("dashboard.companyAdmin.metricProjects")}: ${integerFormatter.format(activeProjects)}`}
              fillClass="bg-gradient-to-r from-amber-500 to-orange-500"
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(320px,0.98fr)]">
        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.recentActivityTitle")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{t("dashboard.companyAdmin.recentActivitySubtitle")}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <ActivityList items={recentActivity} locale={locale} t={t} />
        </Card>

        <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                {t("dashboard.companyAdmin.technicalTitle")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{t("dashboard.companyAdmin.technicalSubtitle")}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          {!moduleStatuses.length ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t("dashboard.healthHint")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {moduleStatuses.map((row) => (
                <div
                  key={row.module}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/85 px-4 py-4 text-sm text-slate-700"
                >
                  <p className="font-medium text-slate-900">{row.module}</p>
                  <p className="mt-2 text-emerald-600">{row.status}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label={t("dashboard.companyAdmin.metricAlerts")} value={integerFormatter.format(alertsCount)} tone="text-amber-700" />
            <SummaryMetric label={t("dashboard.companyAdmin.metricProjects")} value={integerFormatter.format(activeProjects)} tone="text-sky-700" />
          </div>
        </Card>
      </div>

      <Card className="rounded-[30px] border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_75px_-46px_rgba(15,23,42,0.46)] backdrop-blur">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
              {t("dashboard.companyAdmin.projectSpotlightTitle")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">
              {t("dashboard.companyAdmin.projectSpotlightSubtitle")}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>

        {!projectSpotlight.length ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("common.noData")}</p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {projectSpotlight.map((project) => {
              const status = String(project.status || "planned");
              const badgeVariant = resolveProjectStatusBadge(status);
              const progress = Math.max(0, Math.min(Number(project.progress_percent || 0), 100));

              return (
                <div
                  key={`project-spotlight-${project.id}`}
                  className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                    <Badge variant={badgeVariant}>{t(`projectStatus.${status}`)}</Badge>
                  </div>

                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                    {project.code || t("dashboard.companyAdmin.projectCodeFallback")}
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                        {t("dashboard.companyAdmin.projectProgress")}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{Math.round(progress)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                        {t("dashboard.companyAdmin.projectBudget")}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatCurrency(project.budget_amount || 0, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                        {t("dashboard.companyAdmin.projectDeadline")}
                      </p>
                      <p className={`mt-1 text-lg font-semibold ${project.is_delayed ? "text-rose-700" : "text-slate-900"}`}>
                        {project.days_to_deadline == null
                          ? t("dashboard.companyAdmin.projectNoDeadline")
                          : project.days_to_deadline < 0
                            ? t("dashboard.companyAdmin.projectDaysLate", { days: Math.abs(project.days_to_deadline) })
                            : t("dashboard.companyAdmin.projectDaysLeft", { days: project.days_to_deadline })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full ${project.is_delayed ? "bg-gradient-to-r from-rose-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-sky-500"}`}
                      style={{ width: `${Math.max(progress, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
