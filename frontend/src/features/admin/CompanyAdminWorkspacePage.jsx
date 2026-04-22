import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  FolderKanban,
  Landmark,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  UserCog,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { isBackendModuleEnabled } from "@/shared/config/runtimeConfig";

const COPY = {
  fr: {
    eyebrow: "Administration entreprise",
    title: "Espace administrateur",
    subtitle:
      "Pilotez les acces, la configuration et l'etat operationnel de votre organisation depuis un espace dedie.",
    openModule: "Ouvrir",
    companyCard: "Fiche entreprise",
    companyHint: "Statuts, identite legale et documents de reference.",
    teamCard: "Equipe & acces",
    teamHint: "Gestion du personnel, des roles et des statuts de compte.",
    addEmployee: "Ajouter un collaborateur",
    openTeam: "Voir tout le personnel",
    totalEmployees: "Effectif total",
    activeEmployees: "Actifs",
    incompleteProfiles: "Profils incomplets",
    recentHires: "Embauches recentes",
    modulesTitle: "Etat des modules",
    modulesHint: "Visibility de l etat actif ou inactif de chaque module metier.",
    moduleEnabled: "Actif",
    moduleDisabled: "Inactif",
    alertsTitle: "File administrative",
    alertsHint: "Points necessitant une decision ou une action de votre part.",
    noAlerts: "Aucune alerte administrative pour le moment.",
    quickActionsTitle: "Actions rapides",
    goToUsers: "Personnel",
    goToCompanies: "Societe",
    goToProjects: "Projets",
    goToFinance: "Finance",
    goToInventory: "Stock",
    goToRecruitment: "Recrutement",
    profileCompletion: "Taux de completion des profils",
    activeRate: "Taux d'activite",
    subscriptionStatus: "Abonnement",
    accountStatus: "Compte",
    lowStockAlert: "{{count}} article(s) sous seuil",
    financePendingAlert: "{{count}} facture(s) ouverte(s)",
    profilesAlert: "{{count}} profil(s) a completer",
    projectsAlert: "{{count}} projet(s) actif(s)",
  },
  en: {
    eyebrow: "Company administration",
    title: "Admin workspace",
    subtitle:
      "Manage access, configuration, and the operational health of your organization from a dedicated space.",
    openModule: "Open",
    companyCard: "Company profile",
    companyHint: "Account status, legal identity, and reference documents.",
    teamCard: "Team & access",
    teamHint: "Manage staff, roles, and account statuses.",
    addEmployee: "Add a collaborator",
    openTeam: "View all staff",
    totalEmployees: "Total staff",
    activeEmployees: "Active",
    incompleteProfiles: "Incomplete profiles",
    recentHires: "Recent hires",
    modulesTitle: "Module status",
    modulesHint: "See which operational modules are active or inactive.",
    moduleEnabled: "Active",
    moduleDisabled: "Inactive",
    alertsTitle: "Admin queue",
    alertsHint: "Items that need a decision or action from you.",
    noAlerts: "No administrative alerts right now.",
    quickActionsTitle: "Quick actions",
    goToUsers: "Staff",
    goToCompanies: "Company",
    goToProjects: "Projects",
    goToFinance: "Finance",
    goToInventory: "Inventory",
    goToRecruitment: "Recruitment",
    profileCompletion: "Profile completion rate",
    activeRate: "Activity rate",
    subscriptionStatus: "Subscription",
    accountStatus: "Account",
    lowStockAlert: "{{count}} item(s) below threshold",
    financePendingAlert: "{{count}} outstanding invoice(s)",
    profilesAlert: "{{count}} profile(s) to complete",
    projectsAlert: "{{count}} active project(s)",
  },
};

const ADMIN_PROJECT_RETURN_STATE = {
  returnTo: "/app/admin",
  returnLabelKey: "pages.projects.backToAdminWorkspace",
};

const MODULE_CONFIG = [
  { key: "companies", labelFr: "Entreprises", labelEn: "Companies", icon: Building2, to: "/app/companies" },
  { key: "users", labelFr: "Personnel", labelEn: "Staff", icon: Users, to: "/app/users" },
  { key: "projects", labelFr: "Projets", labelEn: "Projects", icon: FolderKanban, to: "/app/projects", state: ADMIN_PROJECT_RETURN_STATE },
  { key: "finance", labelFr: "Finance", labelEn: "Finance", icon: Landmark, to: "/app/finance" },
  { key: "inventory", labelFr: "Stock", labelEn: "Inventory", icon: Package, to: "/app/inventory" },
  { key: "procurement", labelFr: "Marches publics", labelEn: "Procurement", icon: ShoppingCart, to: "/app/procurement" },
  { key: "recruitment", labelFr: "Recrutement", labelEn: "Recruitment", icon: Briefcase, to: "/app/recruitment" },
  { key: "attendance", labelFr: "Presence", labelEn: "Attendance", icon: BookOpen, to: "/app/attendance" },
  { key: "payroll", labelFr: "Paie", labelEn: "Payroll", icon: FileText, to: "/app/payroll" },
  { key: "chat", labelFr: "Messagerie", labelEn: "Chat", icon: Activity, to: "/app/chat" },
];

function safeCount(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function clampPercent(value) {
  return Math.max(0, Math.min(Number.isFinite(value) ? value : 0, 100));
}

function StatBox({ label, value, tone = "text-slate-900 dark:text-slate-50" }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--app-border)] bg-white/80 px-4 py-4 dark:bg-slate-950/55">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ label, percent }) {
  const safe = clampPercent(percent);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="font-semibold text-slate-500 dark:text-slate-300">{Math.round(safe)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-sky-500"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function AlertCard({ icon: Icon, title, description, to, state, actionLabel, variant = "warning" }) {
  const colorMap = {
    warning: "border-amber-200 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-950/30",
    danger: "border-rose-200 bg-rose-50/90 dark:border-rose-500/25 dark:bg-rose-950/30",
    success: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-950/30",
    info: "border-sky-200 bg-sky-50/90 dark:border-sky-500/25 dark:bg-sky-950/30",
  };
  const iconMap = {
    warning: "text-amber-600 dark:text-amber-300",
    danger: "text-rose-600 dark:text-rose-300",
    success: "text-emerald-600 dark:text-emerald-300",
    info: "text-sky-600 dark:text-sky-300",
  };

  return (
    <div className={`rounded-[22px] border px-4 py-4 ${colorMap[variant] || colorMap.warning}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${iconMap[variant] || iconMap.warning}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          {to && actionLabel ? (
            <Link
              to={to}
              state={state}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
            >
              {actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CompanyAdminWorkspacePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const copy = COPY[locale];

  const { data: companyDashboard } = useApiQuery("/users/dashboard", {
    enabled: isBackendModuleEnabled("users"),
  });
  const { data: financeDashboard } = useApiQuery("/finance/reports/dashboard", {
    enabled: isBackendModuleEnabled("finance"),
  });
  const { data: inventoryDashboard } = useApiQuery("/inventory/dashboard", {
    enabled: isBackendModuleEnabled("inventory"),
  });
  const { data: projectsDashboard } = useApiQuery("/projects/dashboard", {
    enabled: isBackendModuleEnabled("projects"),
  });

  const totalUsers = Number(companyDashboard?.users?.total || 0);
  const activeUsers = Number(companyDashboard?.users?.active || 0);
  const incompleteProfiles = Number(companyDashboard?.personnel?.incomplete_profiles || 0);
  const recentHires = Number(companyDashboard?.personnel?.recent_hires_30d || 0);
  const activeProjects = Number(companyDashboard?.projects?.in_progress || 0);
  const outstandingInvoices = Number(companyDashboard?.finance?.outstanding_invoices || 0);
  const lowStockItems = Number(companyDashboard?.inventory?.low_stock_items || 0);
  const financePendingInvoices = Number(financeDashboard?.kpis?.pending_invoices || 0);
  const pendingInventoryValidations = Number(inventoryDashboard?.summary?.pending_validations || 0);

  const completionPercent = totalUsers ? ((totalUsers - incompleteProfiles) / totalUsers) * 100 : 100;
  const activityPercent = totalUsers ? (activeUsers / totalUsers) * 100 : 0;

  const companyName = companyDashboard?.company?.legal_name || t("workspaceProfiles.company_admin.title");
  const accountStatus = companyDashboard?.company?.account_status || "active";
  const subscriptionStatus = companyDashboard?.subscription?.status || "active";

  const alertItems = [];
  if (incompleteProfiles > 0) {
    alertItems.push({
      key: "profiles",
      icon: UserCog,
      title: copy.profilesAlert.replace("{{count}}", incompleteProfiles),
      description: t("dashboard.companyAdmin.signalProfilesDescription", { count: incompleteProfiles }),
      to: "/app/users",
      actionLabel: copy.goToUsers,
      variant: "warning",
    });
  }
  if (financePendingInvoices > 0 || outstandingInvoices > 0) {
    alertItems.push({
      key: "finance",
      icon: Landmark,
      title: copy.financePendingAlert.replace("{{count}}", financePendingInvoices || 1),
      description: t("dashboard.companyAdmin.signalFinanceDescription", {
        amount: new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(outstandingInvoices),
      }),
      to: "/app/finance",
      actionLabel: copy.goToFinance,
      variant: outstandingInvoices > 0 ? "danger" : "warning",
    });
  }
  if (lowStockItems > 0 || pendingInventoryValidations > 0) {
    alertItems.push({
      key: "inventory",
      icon: Package,
      title: copy.lowStockAlert.replace("{{count}}", lowStockItems || pendingInventoryValidations),
      description: t("dashboard.companyAdmin.queueValidationDescription", { count: pendingInventoryValidations }),
      to: "/app/inventory",
      actionLabel: copy.goToInventory,
      variant: "warning",
    });
  }
  if (activeProjects > 0) {
    alertItems.push({
      key: "projects",
      icon: FolderKanban,
      title: copy.projectsAlert.replace("{{count}}", activeProjects),
      description: t("dashboard.companyAdmin.signalProjectsDescription", { count: activeProjects }),
      to: "/app/projects",
      state: ADMIN_PROJECT_RETURN_STATE,
      actionLabel: copy.goToProjects,
      variant: "info",
    });
  }
  if (!alertItems.length) {
    alertItems.push({
      key: "healthy",
      icon: BadgeCheck,
      title: t("dashboard.companyAdmin.signalHealthyTitle"),
      description: t("dashboard.companyAdmin.signalHealthyDescription"),
      variant: "success",
    });
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(241,245,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.14),_transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.97),rgba(15,23,42,0.92))]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700 dark:text-blue-300">
                {copy.eyebrow}
              </p>
              <Badge variant="info">{t("workspaceProfiles.company_admin.title")}</Badge>
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {copy.title} — {companyName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {copy.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="rounded-[18px] border border-[color:var(--app-border)] bg-white/80 px-4 py-2 dark:bg-slate-950/55">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.accountStatus}</p>
              <div className="mt-1.5">
                <Badge variant={accountStatus === "active" ? "success" : accountStatus === "suspended" ? "danger" : "warning"}>
                  {t(`dashboard.companyAdmin.status${accountStatus.charAt(0).toUpperCase() + accountStatus.slice(1)}`) || accountStatus}
                </Badge>
              </div>
            </div>
            <div className="rounded-[18px] border border-[color:var(--app-border)] bg-white/80 px-4 py-2 dark:bg-slate-950/55">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{copy.subscriptionStatus}</p>
              <div className="mt-1.5">
                <Badge variant={subscriptionStatus === "active" ? "success" : subscriptionStatus === "expired" ? "danger" : "warning"}>
                  {t(`dashboard.companyAdmin.status${subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}`) || subscriptionStatus}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="default" className="rounded-full">
            <Link to="/app/users">
              <UserPlus className="h-4 w-4" />
              {copy.addEmployee}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/app/companies">
              <Building2 className="h-4 w-4" />
              {copy.companyCard}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/app/projects" state={ADMIN_PROJECT_RETURN_STATE}>
              <FolderKanban className="h-4 w-4" />
              {copy.goToProjects}
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/app/finance">
              <Landmark className="h-4 w-4" />
              {copy.goToFinance}
            </Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        {/* LEFT: Team + Modules */}
        <div className="space-y-5">
          {/* Team management */}
          <Card className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow">{copy.teamCard}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.teamHint}</h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatBox label={copy.totalEmployees} value={safeCount(totalUsers)} />
              <StatBox label={copy.activeEmployees} value={safeCount(activeUsers)} tone="text-emerald-700 dark:text-emerald-300" />
              <StatBox label={copy.incompleteProfiles} value={safeCount(incompleteProfiles)} tone={incompleteProfiles > 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-50"} />
              <StatBox label={copy.recentHires} value={safeCount(recentHires)} tone="text-sky-700 dark:text-sky-200" />
            </div>

            <div className="space-y-4">
              <ProgressBar label={copy.profileCompletion} percent={completionPercent} />
              <ProgressBar label={copy.activeRate} percent={activityPercent} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="default">
                <Link to="/app/users">
                  {copy.openTeam}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/users">
                  <UserPlus className="h-4 w-4" />
                  {copy.addEmployee}
                </Link>
              </Button>
            </div>
          </Card>

          {/* Module status grid */}
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="app-eyebrow">{copy.modulesTitle}</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.modulesHint}</h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200">
                <Settings className="h-5 w-5" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {MODULE_CONFIG.map((mod) => {
                const enabled = isBackendModuleEnabled(mod.key);
                const Icon = mod.icon;
                const label = locale === "en" ? mod.labelEn : mod.labelFr;

                return (
                  <div
                    key={mod.key}
                    className={`rounded-[20px] border px-3 py-3 ${enabled ? "border-[color:var(--app-border)] bg-white/80 dark:bg-slate-950/55" : "border-dashed border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/30"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${enabled ? "border-blue-100 bg-blue-50 text-primary dark:border-white/10 dark:bg-white/5 dark:text-blue-200" : "border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {enabled ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <p className={`mt-2 text-sm font-semibold ${enabled ? "text-slate-900 dark:text-slate-50" : "text-slate-400 dark:text-slate-500"}`}>{label}</p>
                    <p className={`mt-0.5 text-xs ${enabled ? "text-emerald-700 dark:text-emerald-300" : "text-slate-400 dark:text-slate-500"}`}>
                      {enabled ? copy.moduleEnabled : copy.moduleDisabled}
                    </p>
                    {enabled ? (
                      <Link
                        to={mod.to}
                        state={mod.state}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        {copy.openModule}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT: Admin alert queue */}
        <Card className="space-y-4 self-start">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="app-eyebrow">{copy.alertsTitle}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-50">{copy.alertsHint}</h3>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-3">
            {alertItems.map((alert) => (
              <AlertCard
                key={alert.key}
                icon={alert.icon}
                title={alert.title}
                description={alert.description}
                to={alert.to}
                state={alert.state}
                actionLabel={alert.actionLabel}
                variant={alert.variant}
              />
            ))}
          </div>

          <div className="mt-2 rounded-[20px] border border-[color:var(--app-border)] bg-slate-50/70 p-4 dark:bg-slate-950/35">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t("workspaceProfiles.company_admin.title")}
              </p>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {user?.email || "-"}
            </p>
            <div className="mt-3">
              <Button asChild variant="outline" className="w-full rounded-[18px]">
                <Link to="/app/profile">
                  <UserCog className="h-4 w-4" />
                  {t("navigation.profile")}
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
