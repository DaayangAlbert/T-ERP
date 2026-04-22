import {
  Activity,
  ArrowRight,
  BellRing,
  Briefcase,
  Building2,
  CheckSquare,
  Landmark,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";
import { CompanyAdminDashboard } from "@/features/dashboard/CompanyAdminDashboard";
import { getDashboardQuickEntries } from "@/shared/navigation/appNavigation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";
import { getRoleWorkspaceFlags } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const DASHBOARD_COPY = {
  fr: {
    cockpitEyebrow: "Cockpit ERP",
    cockpitTitle: "Vue opérationnelle priorisée",
    cockpitDescription:
      "Retrouvez vos indicateurs clés, les modules métier prioritaires et les actions qui demandent une décision rapide.",
    kpiProjects: "Projets en cours",
    kpiSites: "Chantiers actifs",
    kpiExpenses: "Dépenses",
    kpiInvoices: "Factures",
    kpiProjectsHint: "Portefeuille actuellement piloté",
    kpiSitesHint: "Espaces chantier visibles",
    kpiExpensesHint: "Dépenses consolidées",
    kpiInvoicesHint: "Factures à suivre",
    modulesTitle: "Modules prioritaires",
    modulesHint: "Les espaces métier les plus utiles à votre profil aujourd'hui.",
    chartsTitle: "Vue analytique",
    chartsHint: "Lecture rapide des finances, des chantiers et de la répartition opérationnelle.",
    lineTitle: "Trajectoire financière",
    lineHint: "Revenus, dépenses et marge par chantier visible.",
    barTitle: "Tension par chantier",
    barHint: "Budget consommé, risques et tâches en retard.",
    pieTitle: "Répartition opérationnelle",
    pieHint: "Synthèse des stocks ou des équipes par catégorie.",
    activityTitle: "Activités récentes",
    activityHint: "Derniers événements qui ont un impact sur l'exploitation.",
    tasksTitle: "Tâches à surveiller",
    tasksHint: "Points projet à suivre en priorité.",
    notificationsTitle: "Notifications",
    notificationsHint: "Alertes métier remontées par les modules actifs.",
    healthTitle: "Santé des modules",
    healthHint: "État technique des modules connectés.",
    noChart: "Pas encore assez de données pour alimenter ce graphique.",
    noNotifications: "Aucune notification prioritaire pour le moment.",
    noActivity: "Aucune activité récente n'est remontée.",
    noTasks: "Aucun chantier prioritaire à surveiller.",
    openWorkspace: "Ouvrir l'espace",
    openShortcut: "Ouvrir",
    budgetConsumed: "Budget consommé",
    overdueTasks: "Tâches en retard",
    openRisks: "Risques ouverts",
    teamSplit: "Répartition équipes",
    stockSplit: "Répartition stock",
    projectCodeFallback: "Projet",
  },
  en: {
    cockpitEyebrow: "ERP cockpit",
    cockpitTitle: "Prioritized operational view",
    cockpitDescription:
      "See your key indicators, priority modules, and the actions that need a fast decision in one place.",
    kpiProjects: "Projects in progress",
    kpiSites: "Active sites",
    kpiExpenses: "Expenses",
    kpiInvoices: "Invoices",
    kpiProjectsHint: "Portfolio currently under review",
    kpiSitesHint: "Visible site workspaces",
    kpiExpensesHint: "Consolidated expenses",
    kpiInvoicesHint: "Invoices to follow up",
    modulesTitle: "Priority modules",
    modulesHint: "The workspaces that matter most for your profile right now.",
    chartsTitle: "Analytical view",
    chartsHint: "A quick read of finances, project pressure, and operational split.",
    lineTitle: "Financial trajectory",
    lineHint: "Revenue, expenses, and margin by visible project.",
    barTitle: "Project pressure",
    barHint: "Budget usage, risks, and overdue tasks.",
    pieTitle: "Operational split",
    pieHint: "A stock or team breakdown by category.",
    activityTitle: "Recent activity",
    activityHint: "The latest events impacting daily operations.",
    tasksTitle: "Tasks to watch",
    tasksHint: "Project points that need close follow-up.",
    notificationsTitle: "Notifications",
    notificationsHint: "Business alerts surfaced by active modules.",
    healthTitle: "Module health",
    healthHint: "Technical status for connected modules.",
    noChart: "Not enough data yet to feed this chart.",
    noNotifications: "No priority notification right now.",
    noActivity: "No recent activity has been surfaced yet.",
    noTasks: "No priority project needs monitoring right now.",
    openWorkspace: "Open workspace",
    openShortcut: "Open",
    budgetConsumed: "Budget used",
    overdueTasks: "Overdue tasks",
    openRisks: "Open risks",
    teamSplit: "Team split",
    stockSplit: "Stock split",
    projectCodeFallback: "Project",
  },
};

const PIE_COLORS = ["#2563EB", "#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

function MetricCard({ icon: Icon, label, value, hint, tone = "text-slate-900" }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--app-border)] bg-white/80 p-4 shadow-[var(--app-shadow-sm)] dark:bg-slate-950/55">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
          {hint ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{hint}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ModuleSpotlightCard({ title, description, badges = [], stats = [], to, actionLabel }) {
  return (
    <div className="h-full rounded-[24px] border border-[color:var(--app-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[var(--app-shadow-sm)] dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.88),rgba(15,23,42,0.72))]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to={to}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {!!badges.length && (
        <div className="mt-5 flex flex-wrap gap-2">
          {badges.slice(0, 3).map((badge) => (
            <Badge key={badge} variant="info">
              {badge}
            </Badge>
          ))}
        </div>
      )}
      {!!stats.length && (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={`${title}-${stat.label}`}
              className="rounded-[18px] border border-[color:var(--app-border)] bg-white/78 px-4 py-3 dark:bg-slate-950/45"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className={`mt-2 text-xl font-semibold ${stat.tone || "text-slate-900 dark:text-slate-50"}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickEntryCard({ title, description, badge, badgeVariant, to, actionLabel }) {
  return (
    <Link
      to={to}
      className="rounded-[20px] border border-[color:var(--app-border)] bg-white/72 p-4 shadow-[var(--app-shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-white dark:bg-slate-950/45"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        {badge ? <Badge variant={badgeVariant || "neutral"}>{badge}</Badge> : null}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{actionLabel}</p>
    </Link>
  );
}

function InsightCard({ icon: Icon, title, description, children, action }) {
  return (
    <Card className="space-y-4 rounded-[24px]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="app-eyebrow">{title}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">{description}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {action}
      {children}
    </Card>
  );
}

function EmptyChartState({ text }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-[20px] border border-dashed border-[color:var(--app-border)] bg-slate-50/70 px-6 text-center text-sm text-slate-500 dark:bg-slate-950/35 dark:text-slate-300">
      {text}
    </div>
  );
}

function formatMetric(value, locale, options = {}) {
  if (options.type === "currency") {
    return new Intl.NumberFormat(locale, { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  return new Intl.NumberFormat(locale).format(Number(value || 0));
}

function formatCompactValue(value, locale, options = {}) {
  const amount = Number(value || 0);

  if (options.type === "currency") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "XAF",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(amount);
}

function safePercent(value) {
  return Math.max(0, Math.min(Number(value || 0), 100));
}

function humanize(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { tenantId, user } = useAuth();
  const isSuperAdmin = user?.user_type === "super_admin";
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const hasPermission = (permission) => isSuperAdmin || user?.permissions?.includes(permission);
  const locale = i18n.language?.startsWith("en") ? "en-US" : "fr-FR";
  const copy = DASHBOARD_COPY[i18n.language?.startsWith("en") ? "en" : "fr"];
  const {
    workspaceProfile,
    isComptable,
    isAcheteur,
    isMagasinier,
    isRH,
    isJuriste,
    isChefProjet,
    isOuvrier,
    isExecutive,
    isTechnicalDirector,
    isFinanceLead,
    isLogisticsLead,
    isExternalController,
    isCandidate,
    isITSupport,
    isCompanyAdmin,
    canReadCompanies,
    canManageCompanies,
    canManageFinance,
    canManageInventory,
    canManageProjects,
    canManageProcurement,
    canManageRecruitment,
  } = getRoleWorkspaceFlags(user);
  const profileTitle = user?.job_title || t(workspaceProfile.titleKey);
  const profileFocus = (workspaceProfile.focusKeys || []).map((key) => t(key));
  const quickEntries = getDashboardQuickEntries(user, isCompanyAdmin ? 4 : 3).map((item) => ({
    ...item,
    title: t(item.labelKey),
    description: item.descriptionKey ? t(item.descriptionKey) : "",
    badge: item.badgeKey ? t(item.badgeKey) : null,
  }));

  const { data: companies } = useApiQuery("/companies/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("companies") && hasPermission("companies.read"),
  });
  const { data: users } = useApiQuery("/users/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("users") && hasPermission("users.read"),
  });
  const { data: projects } = useApiQuery("/projects/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("projects") && hasPermission("projects.read"),
  });
  const { data: finance } = useApiQuery("/finance/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("finance") && hasPermission("finance.read"),
  });
  const { data: inventory } = useApiQuery("/inventory/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("inventory") && hasPermission("inventory.read"),
  });
  const { data: procurement } = useApiQuery("/procurement/status", {
    enabled: !isSuperAdmin && isBackendModuleEnabled("procurement") && hasPermission("procurement.read"),
  });
  const { data: financeDashboard } = useApiQuery("/finance/reports/dashboard", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("finance") && hasPermission("finance.read"),
  });
  const { data: profitability } = useApiQuery("/finance/reports/project-profitability", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("finance") && hasPermission("finance.read"),
  });
  const { data: inventoryDashboard } = useApiQuery("/inventory/dashboard", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("inventory") && hasPermission("inventory.read"),
  });
  const { data: inventoryReports } = useApiQuery("/inventory/reports/summary", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("inventory") && hasPermission("inventory.read"),
  });
  const { data: procurementSummary } = useApiQuery("/procurement/summary", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("procurement") && hasPermission("procurement.read"),
  });
  const { data: projectsDashboard } = useApiQuery("/projects/dashboard", {
    enabled: canLoadTenantData && !isSuperAdmin && isBackendModuleEnabled("projects") && hasPermission("projects.read"),
  });
  const { data: recruitmentOffers } = useApiQuery("/recruitment/job-offers", {
    enabled:
      canLoadTenantData &&
      !isSuperAdmin &&
      isBackendModuleEnabled("recruitment") &&
      (hasPermission("recruitment.read") || canManageRecruitment),
    params: isCandidate ? { status: "published" } : undefined,
  });
  const { data: myCandidateProfile } = useApiQuery("/recruitment/candidate-profiles/me", {
    enabled: !isSuperAdmin && isCandidate,
  });
  const { data: myCandidateApplications } = useApiQuery("/recruitment/applications/me", {
    enabled: !isSuperAdmin && isCandidate,
  });
  const { data: adminStats } = useApiQuery("/admin/stats", { enabled: isSuperAdmin });
  const { data: adminAuditLogs } = useApiQuery("/admin/audit-logs?limit=8", { enabled: isSuperAdmin });
  const { data: companyDashboard } = useApiQuery("/users/dashboard", {
    enabled: !isSuperAdmin && hasPermission("users.read"),
  });

  const statuses = [companies, users, projects, finance, inventory, procurement].filter(Boolean);
  const workspaceCards = [];

  if (
    !isSuperAdmin &&
    (isComptable || isFinanceLead || isExecutive || canManageFinance) &&
    isBackendModuleEnabled("finance") &&
    hasPermission("finance.read")
  ) {
    workspaceCards.push({
      key: "finance",
      title: t("pages.finance.workspaceTitle"),
      description: t("pages.finance.workspaceSubtitle"),
      to: "/app/finance",
      actionLabel: t("navigation.finance"),
      badges: [
        t("pages.finance.workspaceActionExpenses"),
        t("pages.finance.workspaceActionInvoices"),
        t("pages.finance.workspaceActionCash"),
      ],
      stats: [
        { label: t("pages.finance.pendingInvoices"), value: formatMetric(financeDashboard?.kpis?.pending_invoices ?? companyDashboard?.finance?.outstanding_invoices, locale) },
        { label: t("pages.finance.revenuesToday"), value: formatMetric(financeDashboard?.kpis?.revenues_today, locale, { type: "currency" }), tone: "text-emerald-700" },
        { label: t("pages.finance.expensesToday"), value: formatMetric(financeDashboard?.kpis?.expenses_today, locale, { type: "currency" }), tone: "text-amber-700" },
      ],
    });
  }

  if (
    !isSuperAdmin &&
    (isMagasinier || isLogisticsLead || isTechnicalDirector || isExecutive || canManageInventory) &&
    isBackendModuleEnabled("inventory") &&
    hasPermission("inventory.read")
  ) {
    workspaceCards.push({
      key: "inventory",
      title: t("pages.inventory.workspaceTitle"),
      description: t("pages.inventory.workspaceSubtitle"),
      to: "/app/inventory",
      actionLabel: t("navigation.inventory"),
      badges: [
        t("pages.inventory.workflowEntries"),
        t("pages.inventory.workflowExits"),
        t("pages.inventory.workflowInventory"),
      ],
      stats: [
        { label: t("pages.inventory.pendingValidations"), value: formatMetric(inventoryDashboard?.summary?.pending_validations, locale), tone: "text-amber-700" },
        { label: t("pages.inventory.criticalItems"), value: formatMetric(inventoryDashboard?.summary?.critical_items ?? companyDashboard?.inventory?.low_stock_items, locale), tone: "text-rose-700" },
        { label: t("pages.inventory.stockValue"), value: formatMetric(inventoryDashboard?.summary?.stock_value, locale, { type: "currency" }), tone: "text-emerald-700" },
      ],
    });
  }

  if (
    !isSuperAdmin &&
    (isAcheteur || isJuriste || isLogisticsLead || canManageProcurement) &&
    isBackendModuleEnabled("procurement") &&
    hasPermission("procurement.read")
  ) {
    workspaceCards.push({
      key: "procurement",
      title: t(
        isJuriste && !isAcheteur
          ? "workspaceProfiles.juriste.title"
          : "workspaceProfiles.acheteur.title"
      ),
      description: t(
        isJuriste && !isAcheteur
          ? "workspaceProfiles.juriste.description"
          : "pages.procurement.workspaceSubtitle"
      ),
      to: isJuriste && canReadCompanies ? "/app/companies" : "/app/procurement",
      actionLabel: t(isJuriste && canReadCompanies ? "navigation.companies" : "navigation.procurement"),
      badges: isJuriste
        ? [
            t("workspaceProfiles.juriste.focusCompliance"),
            t("workspaceProfiles.juriste.focusContracts"),
            t("workspaceProfiles.juriste.focusEvidence"),
          ]
        : [
            t("pages.procurement.workflowMonitoring"),
            t("pages.procurement.workflowChecklist"),
            t("pages.procurement.workflowSubmissions"),
          ],
      stats: [
        {
          label: t("pages.procurement.tenders"),
          value: formatMetric(procurementSummary?.counts?.tenders, locale),
          tone: "text-sky-700",
        },
        {
          label: t("pages.procurement.submissions"),
          value: formatMetric(procurementSummary?.counts?.submissions, locale),
          tone: "text-amber-700",
        },
        {
          label: t("pages.procurement.checklistLabel"),
          value: formatMetric(procurementSummary?.counts?.checklist_items, locale),
          tone: "text-emerald-700",
        },
      ],
    });
  }

  if (!isSuperAdmin && (isRH || isExecutive || isCompanyAdmin || canManageRecruitment || hasPermission("users.manage"))) {
    const recruitmentEnabled = isBackendModuleEnabled("recruitment") && (hasPermission("recruitment.read") || canManageRecruitment);
    workspaceCards.push({
      key: "rh",
      title: t("pages.recruitment.workspaceTitle"),
      description: t("pages.recruitment.workspaceSubtitle"),
      to: recruitmentEnabled ? "/app/recruitment" : "/app/users",
      actionLabel: recruitmentEnabled ? t("navigation.recruitment") : t("navigation.users"),
      badges: [
        t("pages.recruitment.flowOffers"),
        t("pages.recruitment.flowApplications"),
        t("pages.recruitment.flowIntegration"),
      ],
      stats: [
        { label: t("dashboard.totalEmployees"), value: formatMetric(companyDashboard?.users?.total, locale) },
        { label: t("dashboard.activeEmployees"), value: formatMetric(companyDashboard?.users?.active, locale), tone: "text-emerald-700" },
        { label: t("pages.recruitment.openOffers"), value: formatMetric(recruitmentOffers?.items?.length, locale), tone: "text-sky-700" },
      ],
    });
  }

  if (!isSuperAdmin && isCandidate && isBackendModuleEnabled("recruitment") && hasPermission("recruitment.read")) {
    workspaceCards.push({
      key: "candidate",
      title: t("workspaceProfiles.candidat_job_seeker.title"),
      description: t("workspaceProfiles.candidat_job_seeker.description"),
      to: "/app/recruitment",
      actionLabel: t("navigation.recruitment"),
      badges: [
        t("workspaceProfiles.candidat_job_seeker.focusProfile"),
        t("workspaceProfiles.candidat_job_seeker.focusOffers"),
        t("workspaceProfiles.candidat_job_seeker.focusApplications"),
      ],
      stats: [
        {
          label: t("pages.recruitment.openOffers"),
          value: formatMetric(recruitmentOffers?.items?.length, locale),
          tone: "text-sky-700",
        },
        {
          label: t("pages.recruitment.applications"),
          value: formatMetric(myCandidateApplications?.pagination?.total ?? myCandidateApplications?.items?.length, locale),
          tone: "text-amber-700",
        },
        {
          label: t("pages.recruitment.profileScore"),
          value: formatMetric(myCandidateProfile?.candidate?.profile_score, locale),
          tone: "text-emerald-700",
        },
      ],
    });
  }

  if (
    !isSuperAdmin &&
    (isChefProjet || isTechnicalDirector || isExecutive || canManageProjects) &&
    isBackendModuleEnabled("projects") &&
    hasPermission("projects.read")
  ) {
    workspaceCards.push({
      key: "projects",
      title: t("pages.projects.workspaceTitleChef"),
      description: t("pages.projects.workspaceSubtitleChef"),
      to: "/app/projects",
      actionLabel: t("navigation.projects"),
      badges: [
        t("pages.projects.focusAssignments"),
        t("pages.projects.focusPlanning"),
        t("pages.projects.focusSite"),
      ],
      stats: [
        { label: t("pages.projects.activeProjects"), value: formatMetric(projectsDashboard?.counts?.active_projects ?? companyDashboard?.projects?.in_progress, locale), tone: "text-sky-700" },
        { label: t("pages.projects.delayedProjects"), value: formatMetric(projectsDashboard?.counts?.delayed_projects, locale), tone: "text-amber-700" },
        { label: t("pages.projects.alerts"), value: formatMetric(projectsDashboard?.alerts?.overdue_tasks, locale), tone: "text-rose-700" },
      ],
    });
  }

  if (!isSuperAdmin && isOuvrier && isBackendModuleEnabled("projects") && hasPermission("projects.read")) {
    workspaceCards.push({
      key: "worker",
      title: t("pages.projects.workspaceTitleWorker"),
      description: t("pages.projects.workspaceSubtitleWorker"),
      to: "/app/projects",
      actionLabel: t("navigation.projects"),
      badges: [
        t("pages.projects.myTasksTitle"),
        t("pages.projects.focusSite"),
      ],
      stats: [
        { label: t("pages.projects.activeProjects"), value: formatMetric(projectsDashboard?.counts?.active_projects ?? companyDashboard?.projects?.in_progress, locale), tone: "text-sky-700" },
        { label: t("pages.projects.delayedProjects"), value: formatMetric(projectsDashboard?.counts?.delayed_projects, locale), tone: "text-amber-700" },
        { label: t("pages.projects.alerts"), value: formatMetric(projectsDashboard?.alerts?.overdue_tasks, locale), tone: "text-rose-700" },
      ],
    });
  }

  if (!isSuperAdmin && isITSupport && hasPermission("users.read")) {
    workspaceCards.push({
      key: "support",
      title: t("workspaceProfiles.informaticien.title"),
      description: t("workspaceProfiles.informaticien.description"),
      to: "/app/users",
      actionLabel: t("navigation.users"),
      badges: [
        t("workspaceProfiles.informaticien.focusSupport"),
        t("workspaceProfiles.informaticien.focusAccess"),
        t("workspaceProfiles.informaticien.focusIncidents"),
      ],
      stats: [
        { label: t("dashboard.totalEmployees"), value: formatMetric(companyDashboard?.users?.total, locale) },
        { label: t("dashboard.activeEmployees"), value: formatMetric(companyDashboard?.users?.active, locale), tone: "text-emerald-700" },
        { label: t("dashboard.alertsTitle"), value: formatMetric(companyDashboard?.alerts?.length, locale), tone: "text-amber-700" },
      ],
    });
  }

  if (
    !isSuperAdmin &&
    isExternalController &&
    isBackendModuleEnabled("companies") &&
    canReadCompanies
  ) {
    workspaceCards.push({
      key: "audit",
      title: t("workspaceProfiles.controleur_externe.title"),
      description: t("workspaceProfiles.controleur_externe.description"),
      to: "/app/companies",
      actionLabel: t("navigation.companies"),
      badges: [
        t("workspaceProfiles.controleur_externe.focusAudit"),
        t("workspaceProfiles.controleur_externe.focusTraceability"),
        t("workspaceProfiles.controleur_externe.focusRisk"),
      ],
      stats: [
        {
          label: t("pages.finance.pendingInvoices"),
          value: formatMetric(financeDashboard?.kpis?.pending_invoices, locale),
          tone: "text-amber-700",
        },
        {
          label: t("pages.inventory.criticalItems"),
          value: formatMetric(inventoryDashboard?.summary?.critical_items, locale),
          tone: "text-rose-700",
        },
        {
          label: t("pages.projects.activeProjects"),
          value: formatMetric(projectsDashboard?.counts?.active_projects, locale),
          tone: "text-sky-700",
        },
      ],
    });
  }

  const kpiCards = [
    {
      key: "projects",
      icon: Briefcase,
      label: copy.kpiProjects,
      value: formatMetric(projectsDashboard?.counts?.active_projects ?? companyDashboard?.projects?.in_progress, locale),
      hint: copy.kpiProjectsHint,
      tone: "text-slate-900 dark:text-slate-50",
    },
    {
      key: "sites",
      icon: Building2,
      label: copy.kpiSites,
      value: formatMetric(projectsDashboard?.counts?.projects_total ?? companyDashboard?.projects?.total, locale),
      hint: copy.kpiSitesHint,
      tone: "text-blue-700 dark:text-blue-200",
    },
    {
      key: "expenses",
      icon: Wallet,
      label: copy.kpiExpenses,
      value: formatMetric(
        financeDashboard?.kpis?.expenses ?? companyDashboard?.finance?.expenses ?? projectsDashboard?.financials?.expenses_total,
        locale,
        { type: "currency" }
      ),
      hint: copy.kpiExpensesHint,
      tone: "text-amber-700 dark:text-amber-200",
    },
    {
      key: "invoices",
      icon: ReceiptText,
      label: copy.kpiInvoices,
      value: formatMetric(
        financeDashboard?.kpis?.pending_invoices ?? companyDashboard?.finance?.outstanding_invoices,
        locale,
        financeDashboard?.kpis?.pending_invoices != null ? {} : { type: "currency" }
      ),
      hint: copy.kpiInvoicesHint,
      tone: "text-emerald-700 dark:text-emerald-200",
    },
  ];

  const financialLineData = (profitability?.items || [])
    .slice(0, 6)
    .map((item) => ({
      name: item.project_code || item.project_name || copy.projectCodeFallback,
      revenus: Number(item.revenues || 0),
      depenses: Number(item.expenses || 0),
      marge: Number(item.margin || 0),
    }));

  const projectPressureData = (projectsDashboard?.items || [])
    .slice(0, 6)
    .map((item) => ({
      name: item.code || item.name || copy.projectCodeFallback,
      budget: safePercent(item.budget_consumed_percent),
      retard: Number(item.overdue_tasks || 0),
      risques: Number(item.open_risks || 0),
    }));

  const stockSplitData = (inventoryReports?.stock_state?.by_category || []).map((row) => ({
    name: row.category,
    label: humanize(row.category),
    value: Number(row.stock_value || row.items || 0),
  }));
  const teamSplitData = Object.entries(companyDashboard?.users?.by_department || {})
    .slice(0, 6)
    .map(([name, value]) => ({ name, label: name, value: Number(value || 0) }));
  const operationalSplitData = stockSplitData.length ? stockSplitData : teamSplitData;
  const splitDataLabel = stockSplitData.length ? copy.stockSplit : copy.teamSplit;

  const recentActivityItems = isSuperAdmin
    ? adminAuditLogs?.items || []
    : companyDashboard?.latest_activity || [];
  const notificationItems = [
    ...((financeDashboard?.alerts || []).map((alert) => ({
      key: `finance-${alert.code}`,
      title: alert.message,
      meta: t("navigation.finance"),
      variant: alert.level === "high" ? "danger" : "warning",
    })) || []),
    ...((companyDashboard?.alerts || []).map((alert, index) => ({
      key: `company-${alert.type}-${index}`,
      title: t(`dashboard.alertMessages.${alert.message}`),
      meta:
        typeof alert.count === "number"
          ? `${alert.count}`
          : typeof alert.days_remaining === "number"
            ? `${alert.days_remaining}j`
            : t("navigation.dashboard"),
      variant: "warning",
    })) || []),
  ].slice(0, 6);
  const taskItems = (projectsDashboard?.items || [])
    .slice()
    .sort((left, right) => {
      const leftScore = Number(left.overdue_tasks || 0) + Number(left.open_risks || 0);
      const rightScore = Number(right.overdue_tasks || 0) + Number(right.open_risks || 0);
      return rightScore - leftScore;
    })
    .slice(0, 5);

  if (!isSuperAdmin && isCompanyAdmin) {
    return (
      <CompanyAdminDashboard
        t={t}
        locale={locale}
        user={user}
        profileTitle={profileTitle}
        profileFocus={profileFocus}
        companyDashboard={companyDashboard}
        workspaceCards={workspaceCards}
        quickEntries={quickEntries}
        statuses={statuses}
        financeDashboard={financeDashboard}
        inventoryDashboard={inventoryDashboard}
        projectsDashboard={projectsDashboard}
      />
    );
  }

  return (
    <section className="space-y-5">
      {!isSuperAdmin ? (
        <>
          <Card className="overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_48%,#2563eb_100%)] text-white shadow-[var(--app-shadow-lg)]">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">{copy.cockpitEyebrow}</p>
                <h2 className="mt-3 text-3xl font-semibold">{copy.cockpitTitle}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-50/88">{copy.cockpitDescription}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="border-white/10 bg-white/10 text-white" variant="neutral">
                    {t("workspace.activeProfile")}
                  </Badge>
                  <Badge className="border-white/10 bg-white/10 text-white" variant="neutral">
                    {profileTitle}
                  </Badge>
                  {user?.department ? (
                    <Badge className="border-white/10 bg-white/10 text-white" variant="neutral">
                      {user.department}
                    </Badge>
                  ) : null}
                </div>

                {!!profileFocus.length ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {profileFocus.map((label) => (
                      <Badge key={`${workspaceProfile.code}-${label}`} className="border-white/10 bg-white/10 text-white" variant="neutral">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {kpiCards.map((item) => (
                  <div key={item.key} className="rounded-[22px] border border-white/10 bg-white/10 p-4 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100/80">{item.label}</p>
                        <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                        <p className="mt-2 text-sm text-blue-50/78">{item.hint}</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-white">
                        <item.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {!!workspaceCards.length && (
            <Card className="rounded-[26px]">
              <div className="mb-5">
                <p className="app-eyebrow">{copy.modulesTitle}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.modulesHint}</h3>
              </div>
              <div className={`grid gap-4 ${workspaceCards.length === 1 ? "xl:grid-cols-1" : "xl:grid-cols-2"}`}>
                {workspaceCards.map((card) => (
                  <ModuleSpotlightCard
                    key={card.key}
                    title={card.title}
                    description={card.description}
                    badges={card.badges}
                    stats={card.stats}
                    to={card.to}
                    actionLabel={copy.openWorkspace}
                  />
                ))}
              </div>
            </Card>
          )}

          <Card className="rounded-[26px]">
            <div className="mb-5">
              <p className="app-eyebrow">{copy.chartsTitle}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.chartsHint}</h3>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-[22px] border border-[color:var(--app-border)] bg-white/72 p-4 dark:bg-slate-950/45">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{copy.lineTitle}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{copy.lineHint}</p>
                </div>
                {financialLineData.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={financialLineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tickFormatter={(value) => formatCompactValue(value, locale, { type: "currency" })} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip
                        formatter={(value, name) => [formatMetric(value, locale, { type: "currency" }), name]}
                        contentStyle={{ borderRadius: 16, borderColor: "#dbe5f1", boxShadow: "var(--app-shadow-sm)" }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenus" name={t("dashboard.revenues")} stroke="#2563EB" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="depenses" name={t("dashboard.expenses")} stroke="#F59E0B" strokeWidth={3} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="marge" name={t("pages.finance.margin")} stroke="#10B981" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState text={copy.noChart} />
                )}
              </div>

              <div className="rounded-[22px] border border-[color:var(--app-border)] bg-white/72 p-4 dark:bg-slate-950/45">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{copy.pieTitle}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{copy.pieHint}</p>
                </div>
                {operationalSplitData.length ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Tooltip formatter={(value) => formatCompactValue(value, locale, stockSplitData.length ? { type: "currency" } : {})} />
                        <Pie data={operationalSplitData} dataKey="value" innerRadius={52} outerRadius={82} paddingAngle={2}>
                          {operationalSplitData.map((entry, index) => (
                            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{splitDataLabel}</p>
                      {operationalSplitData.slice(0, 5).map((entry, index) => (
                        <div key={entry.name} className="flex items-center justify-between gap-3 rounded-[16px] border border-[color:var(--app-border)] bg-white/80 px-3 py-2 dark:bg-slate-900/60">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{entry.label}</p>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {formatCompactValue(entry.value, locale, stockSplitData.length ? { type: "currency" } : {})}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyChartState text={copy.noChart} />
                )}
              </div>

              <div className="xl:col-span-3 rounded-[22px] border border-[color:var(--app-border)] bg-white/72 p-4 dark:bg-slate-950/45">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{copy.barTitle}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{copy.barHint}</p>
                </div>
                {projectPressureData.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={projectPressureData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#dbe5f1", boxShadow: "var(--app-shadow-sm)" }} />
                      <Legend />
                      <Bar dataKey="budget" name={copy.budgetConsumed} fill="#2563EB" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="retard" name={copy.overdueTasks} fill="#F59E0B" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="risques" name={copy.openRisks} fill="#EF4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState text={copy.noChart} />
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-3">
            <InsightCard icon={Activity} title={copy.activityTitle} description={copy.activityHint}>
              <div className="space-y-3">
                {recentActivityItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[color:var(--app-border)] bg-white/74 px-4 py-3 dark:bg-slate-950/45">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{item.description || `${item.module}.${item.action}`}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {item.actor_email || t("dashboard.systemActor")} | {item.created_at || "-"}
                    </p>
                  </div>
                ))}
                {!recentActivityItems.length ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.noActivity}</p> : null}
              </div>
            </InsightCard>

            <InsightCard icon={CheckSquare} title={copy.tasksTitle} description={copy.tasksHint}>
              <div className="space-y-3">
                {taskItems.map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[color:var(--app-border)] bg-white/74 px-4 py-3 dark:bg-slate-950/45">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.code || copy.projectCodeFallback}</p>
                      </div>
                      <Badge variant={Number(item.overdue_tasks || 0) > 0 ? "warning" : "info"}>
                        {item.status ? t(`projectStatus.${item.status}`) : t("navigation.projects")}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-[14px] border border-[color:var(--app-border)] bg-white/90 px-3 py-2 text-sm dark:bg-slate-900/60">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.budgetConsumed}</p>
                        <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">{Math.round(Number(item.budget_consumed_percent || 0))}%</p>
                      </div>
                      <div className="rounded-[14px] border border-[color:var(--app-border)] bg-white/90 px-3 py-2 text-sm dark:bg-slate-900/60">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.overdueTasks}</p>
                        <p className="mt-1 font-semibold text-amber-700 dark:text-amber-200">{item.overdue_tasks || 0}</p>
                      </div>
                      <div className="rounded-[14px] border border-[color:var(--app-border)] bg-white/90 px-3 py-2 text-sm dark:bg-slate-900/60">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.openRisks}</p>
                        <p className="mt-1 font-semibold text-rose-700 dark:text-rose-200">{item.open_risks || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {!taskItems.length ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.noTasks}</p> : null}
              </div>
            </InsightCard>

            <InsightCard
              icon={BellRing}
              title={copy.notificationsTitle}
              description={copy.notificationsHint}
              action={
                !!quickEntries.length ? (
                  <div className="grid gap-3">
                    {quickEntries.slice(0, 3).map((entry) => (
                      <QuickEntryCard
                        key={`${entry.id}-${entry.to}`}
                        title={entry.title}
                        description={entry.description}
                        badge={entry.badge}
                        badgeVariant={entry.badgeVariant}
                        to={entry.to}
                        actionLabel={copy.openShortcut}
                      />
                    ))}
                  </div>
                ) : null
              }
            >
              <div className="space-y-3">
                {notificationItems.map((item) => (
                  <div key={item.key} className="rounded-[18px] border border-[color:var(--app-border)] bg-white/74 px-4 py-3 dark:bg-slate-950/45">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{item.meta}</p>
                      </div>
                      <Badge variant={item.variant}>{item.meta}</Badge>
                    </div>
                  </div>
                ))}
                {!notificationItems.length ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.noNotifications}</p> : null}
              </div>
            </InsightCard>
          </div>

          <Card className="rounded-[26px]">
            <div className="mb-4">
              <p className="app-eyebrow">{copy.healthTitle}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.healthHint}</h3>
            </div>
            {!statuses.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">{t("dashboard.healthHint")}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {statuses.map((row) => (
                  <div key={row.module} className="rounded-[18px] border border-[color:var(--app-border)] bg-white/74 px-4 py-3 dark:bg-slate-950/45">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{row.module}</p>
                    <p className="mt-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">{row.status}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card className="overflow-hidden rounded-[28px] border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_48%,#2563eb_100%)] text-white shadow-[var(--app-shadow-lg)]">
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100/80">{t("dashboard.title")}</p>
                <h2 className="mt-3 text-3xl font-semibold">{t("dashboard.platformDescription")}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-50/88">{t("dashboard.platformSummary")}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard icon={Building2} label={t("dashboard.totalCompanies")} value={formatMetric(adminStats?.companies?.total, locale)} />
                <MetricCard icon={Landmark} label={t("dashboard.activeCompanies")} value={formatMetric(adminStats?.companies?.active, locale)} tone="text-emerald-700 dark:text-emerald-200" />
                <MetricCard icon={ReceiptText} label={t("dashboard.pendingCompanies")} value={formatMetric(adminStats?.companies?.pending, locale)} tone="text-amber-700 dark:text-amber-200" />
                <MetricCard icon={BellRing} label={t("dashboard.totalUsers")} value={formatMetric(adminStats?.users?.total, locale)} />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[26px]">
              <div className="mb-5">
                <p className="app-eyebrow">{t("dashboard.registrationTrend")}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{t("dashboard.subscriptionSummary")}</h3>
              </div>
              {adminStats?.registrations_trend?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adminStats.registrations_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, borderColor: "#dbe5f1", boxShadow: "var(--app-shadow-sm)" }} />
                    <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChartState text={t("common.noData")} />
              )}
            </Card>

            <Card className="rounded-[26px]">
              <div className="mb-5">
                <p className="app-eyebrow">{t("dashboard.platformAudit")}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.activityHint}</h3>
              </div>
              <div className="space-y-3">
                {(adminAuditLogs?.items || []).slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-[color:var(--app-border)] bg-white/74 px-4 py-3 dark:bg-slate-950/45">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{item.description || `${item.module}.${item.action}`}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                      {item.actor_email || t("dashboard.systemActor")} | {item.created_at || "-"}
                    </p>
                  </div>
                ))}
                {!adminAuditLogs?.items?.length ? <p className="text-sm text-slate-500 dark:text-slate-300">{t("common.noData")}</p> : null}
              </div>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
