import {
  ArrowLeft,
  CalendarCheck,
  CalendarRange,
  CircleDollarSign,
  FileStack,
  LayoutDashboard,
  MapPin,
  Package,
  ShieldAlert,
  Users,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { cn } from "@/shared/utils/cn";

const WORKSPACE_TABS = [
  { id: "overview", to: "overview", labelKey: "pages.projects.workspaceDashboardTab", hintKey: "pages.projects.workspaceDashboardHint", icon: LayoutDashboard },
  { id: "team", to: "team", labelKey: "pages.projects.teamSection", hintKey: "pages.projects.teamSectionHint", icon: Users },
  { id: "planning", to: "planning", labelKey: "pages.projects.planningSection", hintKey: "pages.projects.planningSectionHint", icon: CalendarCheck },
  { id: "risks", to: "risks", labelKey: "pages.projects.riskSection", hintKey: "pages.projects.riskSectionHint", icon: ShieldAlert },
  { id: "finance", to: "finance", labelKey: "pages.projects.financeSection", hintKey: "pages.projects.financeSectionHint", icon: CircleDollarSign },
  { id: "stock", to: "stock", labelKey: "pages.projects.stockSection", hintKey: "pages.projects.stockSectionHint", icon: Package },
  { id: "documents", to: "documents", labelKey: "pages.projects.docsSection", hintKey: "pages.projects.docsSectionHint", icon: FileStack },
  { id: "presence", to: "presence", labelKey: "pages.projects.presenceSection", hintKey: "pages.projects.presenceSectionHint", icon: UserCheck },
];

function parseProjectId(rawProjectId) {
  const parsed = Number(rawProjectId);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(toFiniteNumber(value))));
}

function formatMoney(value, language) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "--";
  }

  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(amount)} FCFA`;
}

function formatProjectDate(value, language) {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function WorkspaceMetaItem({ icon: Icon, label, value, helper }) {
  return (
    <div className="app-surface-soft rounded-2xl p-3">
      <div className="flex items-start gap-2.5">
        <div className="rounded-xl border border-slate-200 bg-white/80 p-1.5 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
          <Icon className="h-3.5 w-3.5 shrink-0" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-[1rem] font-semibold leading-tight text-slate-950 dark:text-slate-100 sm:text-[1.12rem]">{value}</p>
          {helper ? <p className="mt-0.5 text-[11px] leading-snug text-slate-600 dark:text-slate-400">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

function WorkspaceProgressItem({ label, value, fillClassName }) {
  const safeValue = clampPercent(value);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/70 p-3 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600 dark:text-slate-400">{label}</p>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          {safeValue}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={cn("h-full rounded-full transition-[width]", fillClassName)} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function ProjectWorkspaceLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);
  const { data: projectData, loading: projectLoading, error: projectError } = useApiQuery(parsedProjectId ? `/projects/${parsedProjectId}` : "/projects/0", {
    enabled: Boolean(parsedProjectId),
  });
  const { data: workspaceData, loading: workspaceLoading, error: workspaceError } = useApiQuery(
    parsedProjectId ? `/projects/${parsedProjectId}/workspace` : "/projects/0/workspace",
    {
      enabled: Boolean(parsedProjectId),
    }
  );
  const { data: projectsData } = useApiQuery("/projects", {
    enabled: Boolean(parsedProjectId),
  });

  if (!parsedProjectId) {
    return <Navigate to="/app/projects" replace />;
  }

  const projectRecord = workspaceData?.project || projectData;
  const financeSnapshot = workspaceData?.finance || {};
  const activeTab = WORKSPACE_TABS.find((tab) => location.pathname.endsWith(`/${tab.to}`)) || WORKSPACE_TABS[0];
  const projectTitle = projectRecord?.name || projectRecord?.code || `#${parsedProjectId}`;
  const projectItems = projectsData?.items || [];
  const projectOptions = projectItems.some((item) => item.id === parsedProjectId)
    ? projectItems
    : [{ id: parsedProjectId, code: projectRecord?.code || `#${parsedProjectId}`, name: projectTitle }, ...projectItems];
  const returnTo = typeof location.state?.returnTo === "string" ? location.state.returnTo : "";
  const returnLabelKey = typeof location.state?.returnLabelKey === "string" ? location.state.returnLabelKey : "";
  const returnLabel =
    typeof location.state?.returnLabel === "string"
      ? location.state.returnLabel
      : t(returnLabelKey || "pages.projects.backToAdminWorkspace");
  const returnState = returnTo ? { returnTo, ...(returnLabelKey ? { returnLabelKey } : { returnLabel }) } : undefined;
  const returnLinkTarget = returnTo && returnTo !== "/app/projects" ? returnTo : "";
  const buildWorkspacePath = (nextTab) => `/app/projects/${parsedProjectId}/${nextTab}`;
  const projectCode = projectRecord?.code || `#${parsedProjectId}`;
  const projectMetaItems = [
    {
      icon: MapPin,
      label: t("pages.projects.location"),
      value: projectRecord?.location || "--",
      helper: projectRecord?.client_name ? `${t("pages.projects.client")}: ${projectRecord.client_name}` : null,
    },
    {
      icon: CalendarRange,
      label: t("pages.projects.startDate"),
      value: formatProjectDate(projectRecord?.start_date, i18n.language),
      helper: `${t("pages.projects.endDate")}: ${formatProjectDate(projectRecord?.end_date, i18n.language)}`,
    },
  ];
  const progressItems = [
    { label: t("pages.projects.globalProgress"), value: projectRecord?.progress_percent, fillClassName: "bg-emerald-400" },
    { label: t("pages.projects.physicalProgress"), value: projectRecord?.physical_progress_percent, fillClassName: "bg-sky-400" },
    { label: t("pages.projects.financialProgress"), value: projectRecord?.financial_progress_percent, fillClassName: "bg-amber-300" },
  ];
  const financeMetaItems = [
    {
      icon: CircleDollarSign,
      label: t("pages.projects.contractAmount"),
      value: formatMoney(projectRecord?.contract_amount, i18n.language),
    },
    {
      icon: Wallet,
      label: t("pages.projects.budget"),
      value: formatMoney(financeSnapshot?.budget_amount ?? projectRecord?.budget_amount, i18n.language),
    },
  ];
  const summaryItems = [...projectMetaItems, ...financeMetaItems];

  const handleProjectSwitch = (event) => {
    const nextProjectId = Number(event.target.value);

    if (!Number.isFinite(nextProjectId) || nextProjectId <= 0 || nextProjectId === parsedProjectId) {
      return;
    }

    if (returnState) {
      navigate(`/app/projects/${nextProjectId}/${activeTab.to}`, { state: returnState });
      return;
    }

    navigate(`/app/projects/${nextProjectId}/${activeTab.to}`);
  };

  const handleWorkspaceSwitch = (event) => {
    const nextTab = String(event.target.value || "");
    const tabExists = WORKSPACE_TABS.some((tab) => tab.to === nextTab);

    if (!tabExists || nextTab === activeTab.to) {
      return;
    }

    if (returnState) {
      navigate(buildWorkspacePath(nextTab), { state: returnState });
      return;
    }

    navigate(buildWorkspacePath(nextTab));
  };

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-[26px] border border-slate-900/10 bg-[linear-gradient(105deg,#2563eb_0%,#0891b2_52%,#0f9d8a_100%)] p-4 text-white shadow-[0_24px_65px_-40px_rgba(2,6,23,0.75)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_36%)]" />
        <div className="relative space-y-4">
          <div className="rounded-2xl border border-white/25 bg-white/12 p-4 backdrop-blur-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/70">{t("pages.projects.switchProject")}</p>
              <div className="mt-2 flex w-full items-center gap-2">
                {projectOptions.length > 1 ? (
                  <select
                    aria-label={t("pages.projects.switchProject")}
                    className="min-w-0 flex-1 rounded-xl border border-white/35 bg-white/90 px-3 py-2.5 text-sm font-semibold text-slate-900"
                    value={String(parsedProjectId)}
                    onChange={handleProjectSwitch}
                  >
                    {projectOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code ? `${item.code} - ${item.name || `#${item.id}`}` : item.name || `#${item.id}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="flex-1 text-sm font-semibold text-white">{projectCode}</p>
                )}

                <div className="flex shrink-0 gap-2">
                  {returnLinkTarget ? (
                    <NavLink
                      to={returnLinkTarget}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/35 bg-white/12 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                    >
                      {returnLabel}
                    </NavLink>
                  ) : null}
                  <NavLink
                    to="/app/projects"
                    state={returnState}
                    aria-label={t("pages.projects.backToPortfolio")}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white text-slate-900 transition hover:bg-slate-100"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </NavLink>
                </div>
              </div>
              {(projectLoading || workspaceLoading) && !projectRecord ? <p className="mt-2 text-xs text-white/75">{t("common.loading")}</p> : null}
              {projectError || workspaceError ? <p className="mt-2 text-xs text-rose-100">{projectError || workspaceError}</p> : null}
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summaryItems.map((item) => (
                <WorkspaceMetaItem key={item.label} icon={item.icon} label={item.label} value={item.value} helper={item.helper} />
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {progressItems.map((item) => (
                <WorkspaceProgressItem key={item.label} label={item.label} value={item.value} fillClassName={item.fillClassName} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white/88 shadow-[var(--app-shadow-sm)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/75">
        <div className="sm:hidden">
          <label className="sr-only" htmlFor="project-workspace-view-select">
            {t("pages.projects.workspaceNavigation")}
          </label>
          <select
            id="project-workspace-view-select"
            aria-label={t("pages.projects.workspaceNavigation")}
            className="app-field mb-1 w-full px-3 py-2 text-sm font-semibold"
            value={activeTab.to}
            onChange={handleWorkspaceSwitch}
          >
            {WORKSPACE_TABS.map((tab) => (
              <option key={tab.id} value={tab.to}>
                {t(tab.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden overflow-x-auto px-2 py-2 sm:block [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700">
          <div className="flex min-w-max gap-2">
            {WORKSPACE_TABS.map((tab) => (
              <NavLink
                key={tab.id}
                to={buildWorkspacePath(tab.to)}
                state={returnState}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
                    isActive
                      ? "border-b-4 border-cyan-500 bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900/70 dark:hover:text-slate-100"
                  )
                }
              >
                {tab.icon ? <tab.icon className="h-4 w-4" /> : null}
                {t(tab.labelKey)}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <Outlet />
    </section>
  );
}

export function ProjectWorkspaceOverviewPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="overview" />;
}

export function ProjectWorkspaceTeamPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="team" />;
}

export function ProjectWorkspacePlanningPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="planning" />;
}

export function ProjectWorkspaceRisksPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="risks" />;
}

export function ProjectWorkspaceFinancePage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="finance" />;
}

export function ProjectWorkspaceDocumentsPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="documents" />;
}

export function ProjectWorkspaceStockPage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="stock" />;
}

export function ProjectWorkspacePresencePage() {
  const { projectId } = useParams();
  const parsedProjectId = parseProjectId(projectId);

  return <ProjectsPage forcedProjectId={parsedProjectId} workspaceTab="presence" />;
}
