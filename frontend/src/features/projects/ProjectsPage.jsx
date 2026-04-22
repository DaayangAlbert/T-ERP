import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, BarChart2, Check, CreditCard, Download, FileText, FlaskConical, FolderOpen, LayoutDashboard, Lightbulb, LogIn, LogOut, Package, Pencil, Plus, Search, Send, ShoppingCart, Trash2, Users2, Wrench, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TenantScopeNotice } from "@/components/layout/TenantScopeNotice";
import { useAuth } from "@/features/auth/AuthContext";
import { AssistantProjectsPage } from "@/features/projects/AssistantProjectsPage";
import { ProjectActionDialog } from "@/features/projects/ProjectActionDialog";
import { ProjectsFinanceDocumentsPanel } from "@/features/projects/ProjectsFinanceDocumentsPanel";
import { ProjectsPresencePanel } from "@/features/projects/ProjectsPresencePanel";
import { ProjectsSiteRisksPanel } from "@/features/projects/ProjectsSiteRisksPanel";
import { ProjectsTeamPlanningPanel } from "@/features/projects/ProjectsTeamPlanningPanel";
import { WorkerProjectsPage } from "@/features/projects/WorkerProjectsPage";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { cn } from "@/shared/utils/cn";
import { getRoleWorkspaceFlags, getUserRoleCodes } from "@/shared/utils/operationalRoles";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";

const projectStatuses = ["draft", "preparation", "submitted", "awarded", "in_progress", "suspended", "completed", "provisional_acceptance", "final_acceptance", "archived"];
const projectTypes = ["public_market", "private_market", "internal_project", "project_preparation"];
const taskStatuses = ["not_started", "in_progress", "blocked", "completed"];
const taskTypes = ["phase", "task", "subtask"];
const priorities = ["low", "medium", "high", "urgent"];
const reportTypes = ["daily", "weekly", "monthly", "final"];
const riskSeverities = ["low", "medium", "high", "critical"];
const riskStatuses = ["open", "monitoring", "mitigated", "closed"];
const changeOrderStatuses = ["draft", "submitted", "approved", "rejected", "implemented"];
const documentCategories = ["dao", "contract", "plan", "invoice", "report", "pv", "decompte", "photo", "other"];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const portfolioPeriods = ["all", "30d", "quarter", "year"];
const cockpitBudgetGapThreshold = 10;
const cockpitWorkflowStages = ["qualification", "validation", "execution"];
const terminalProjectStatuses = ["completed", "final_acceptance"];

function MetricCard({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.42)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">{label}</p>
      <p className={`mt-2 text-[1.9rem] font-semibold leading-none ${tone}`}>{value}</p>
    </div>
  );
}

function BudgetGaugeCard({ budgetConsumed, physicalProgress, budgetGap, t, tone }) {
  const clamp = (v) => Math.min(100, Math.max(0, Math.round(v)));
  const consumed = clamp(budgetConsumed);
  const progress = clamp(physicalProgress);
  const outerFill = tone === "text-amber-600" ? "#d97706" : "#4f46e5";
  const outer = [
    { name: t("pages.projects.budgetConsumed"), value: consumed, fill: outerFill },
    { name: "", value: Math.max(0, 100 - consumed), fill: "#e2e8f0" },
  ];
  const inner = [
    { name: t("pages.projects.physicalProgress"), value: progress, fill: "#0ea5e9" },
    { name: "", value: Math.max(0, 100 - progress), fill: "#e2e8f0" },
  ];
  const gapColor = Math.abs(budgetGap) > cockpitBudgetGapThreshold ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="rounded-[20px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.42)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.budgetConsumed")}</p>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-[96px] w-[96px] shrink-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={outer} cx="50%" cy="50%" innerRadius={34} outerRadius={46} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                {outer.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Pie data={inner} cx="50%" cy="50%" innerRadius={18} outerRadius={30} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                {inner.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", boxShadow: "0 4px 20px rgba(15,23,42,0.12)", fontSize: 12, padding: "8px 12px" }}
                formatter={(value, name) => (name ? [`${value}%`, name] : null)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className={`text-[13px] font-bold leading-none ${tone}`}>{consumed}%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: outerFill }} />
            <span className="text-[11px] text-slate-600">{t("pages.projects.budgetConsumed")} <span className="font-semibold text-slate-900">{consumed}%</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
            <span className="text-[11px] text-slate-600">{t("pages.projects.physicalProgress")} <span className="font-semibold text-slate-900">{progress}%</span></span>
          </div>
          <p className={`mt-1 text-[11px] font-semibold ${gapColor}`}>Ecart : {budgetGap >= 0 ? "+" : ""}{Math.round(budgetGap * 10) / 10}%</p>
        </div>
      </div>
    </div>
  );
}

function MarginBarCard({ finance, t, language, tone }) {
  const data = [
    { name: t("pages.projects.projectBudget"), value: Math.abs(Math.round(toFiniteNumber(finance.budget_amount))), fill: "#4f46e5" },
    { name: t("pages.projects.projectExpenses"), value: Math.abs(Math.round(toFiniteNumber(finance.expenses))), fill: "#e11d48" },
    { name: t("pages.projects.projectRevenue"), value: Math.abs(Math.round(toFiniteNumber(finance.revenues))), fill: "#059669" },
  ].filter((d) => d.value > 0);

  return (
    <div className="rounded-[20px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.42)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.finance.margin")}</p>
        <p className={`text-[1.25rem] font-semibold leading-none ${tone}`}>{formatCompactMoney(toFiniteNumber(finance.margin), language)}</p>
      </div>
      <div className="mt-2 h-[86px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
                contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0", boxShadow: "0 4px 20px rgba(15,23,42,0.12)", fontSize: 12, padding: "8px 12px" }}
                labelFormatter={(label) => label}
                formatter={(value) => [formatCompactMoney(value, language), ""]}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[11px] text-slate-400">-</p>
          </div>
        )}
      </div>
    </div>
  );
}

const taskStatusStyle = {
  completed: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  done: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50" },
  in_progress: { dot: "bg-sky-400", text: "text-sky-700", bg: "bg-sky-50" },
  blocked: { dot: "bg-rose-400", text: "text-rose-700", bg: "bg-rose-50" },
  not_started: { dot: "bg-slate-300", text: "text-slate-500", bg: "bg-slate-50" },
};
const priorityDot = { urgent: "bg-rose-500", high: "bg-amber-400", medium: "bg-sky-400", low: "bg-slate-300" };
const riskSeverityStyle = {
  critical: { dot: "bg-rose-500", badge: "bg-rose-50 border-rose-200 text-rose-700" },
  high: { dot: "bg-amber-500", badge: "bg-amber-50 border-amber-200 text-amber-700" },
  medium: { dot: "bg-yellow-400", badge: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  low: { dot: "bg-slate-300", badge: "bg-slate-50 border-slate-200 text-slate-500" },
};

function TaskListCard({ tasks, t }) {
  const allTasks = tasks.slice(0, 5);
  const completedCount = tasks.filter((task) => ["completed", "done"].includes(task.status)).length;
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.42)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.completedTasks")}</p>
        <span className="text-[11px] font-semibold text-slate-700">{completedCount} / {tasks.length}</span>
      </div>
      {!allTasks.length ? (
        <p className="py-2 text-center text-[11px] italic text-slate-400">Aucune tache trouvee pour ce projet.</p>
      ) : (
        <ul className="space-y-1">
          {allTasks.map((task) => {
            const style = taskStatusStyle[task.status] || taskStatusStyle.not_started;
            const pdot = priorityDot[task.priority] || "bg-slate-300";
            return (
              <li key={task.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} title={task.status} />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-800" title={task.title}>{task.title}</span>
                <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.bg} ${style.text} border-current/20`}>
                  {getTranslationOrFallback(t, `enums.projectTaskStatus.${task.status}`, humanizeToken(task.status))}
                </span>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pdot}`} title={task.priority} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RiskListCard({ risks, t }) {
  const openRisks = risks.filter((r) => ["open", "monitoring"].includes(r.status)).slice(0, 4);
  const totalOpen = risks.filter((r) => ["open", "monitoring"].includes(r.status)).length;
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.9))] px-4 py-3 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.42)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.openRisks")}</p>
        <span className={`text-[11px] font-semibold ${totalOpen > 0 ? "text-amber-600" : "text-emerald-600"}`}>{totalOpen}</span>
      </div>
      {!openRisks.length ? (
        <p className="py-2 text-center text-[11px] italic text-slate-400">Aucun risque ouvert - situation sous controle.</p>
      ) : (
        <ul className="space-y-1.5">
          {openRisks.map((risk) => {
            const style = riskSeverityStyle[risk.severity] || riskSeverityStyle.low;
            const cause = risk.description ? (risk.description.length > 60 ? `${risk.description.slice(0, 60)}...` : risk.description) : null;
            return (
              <li key={risk.id} className="rounded-lg border border-slate-100 bg-white/70 px-2.5 py-1.5">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-slate-800" title={risk.title}>{risk.title}</p>
                    {cause ? <p className="mt-0.5 text-[10px] leading-snug text-slate-500" title={risk.description}>{cause}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.badge}`}>
                    {getTranslationOrFallback(t, `enums.riskSeverity.${risk.severity}`, risk.severity)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function WorkspacePanel({ className, ...props }) {
  return (
    <Card
      className={cn(
        "space-y-5 rounded-[28px] border border-[color:var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,252,0.94))] p-5 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.34)]",
        className
      )}
      {...props}
    />
  );
}

function SectionHeader({ eyebrow, title, description, meta }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        {eyebrow ? (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            {eyebrow}
          </span>
        ) : null}
        <h3 className="mt-3 text-[1.45rem] font-semibold leading-tight text-slate-950 dark:text-slate-50">{title}</h3>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
      {meta ? <div className="flex flex-wrap gap-2 lg:justify-end">{meta}</div> : null}
    </div>
  );
}

function FocusCard({ title, description, value, accent = "primary" }) {
  const accents = {
    primary: "border-primary/15 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,0.96))]",
    success: "border-emerald-200 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.96))]",
    warning: "border-amber-200 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),rgba(255,255,255,0.96))]",
    info: "border-sky-200 bg-[linear-gradient(180deg,rgba(14,165,233,0.08),rgba(255,255,255,0.96))]",
    neutral: "border-slate-200 bg-[linear-gradient(180deg,rgba(148,163,184,0.08),rgba(255,255,255,0.96))]",
  };

  return (
    <div className={cn("rounded-[22px] border px-4 py-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.36)]", accents[accent] || accents.neutral)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}

function ProjectStatusDonut({ counts, t }) {
  const total = Number(counts.total || 0);
  const active = Number(counts.active || 0);
  const completed = Number(counts.completed || 0);
  const delayed = Number(counts.delayed || 0);
  const other = Math.max(total - active - completed - delayed, 0);

  const data = [
    { label: t("pages.projects.activeProjects"), value: active, color: "#10b981", bg: "bg-emerald-50 border-emerald-200" },
    { label: t("pages.projects.completedProjects"), value: completed, color: "#2563eb", bg: "bg-blue-50 border-blue-200" },
    { label: t("pages.projects.delayedProjects"), value: delayed, color: "#f59e0b", bg: "bg-amber-50 border-amber-200" },
    { label: t("common.other"), value: other, color: "#94a3b8", bg: "bg-slate-50 border-slate-200" },
  ].filter((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={64}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-4xl font-semibold text-slate-950">{total}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("pages.projects.totalProjectsLabel")}</p>
        </div>
      </div>
      <div className="grid w-full gap-2">
        {data.map((item) => (
          <div key={item.label} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${item.bg}`}>
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <p className="text-sm font-medium text-slate-700">{item.label}</p>
            </div>
            <span className="text-sm font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperationalKpiChart({ staffCount = 0, assignments = 0, overdueTasks = 0, criticalRisks = 0, t }) {
  const data = [
    { name: t("pages.projects.totalStaff"), value: staffCount, fill: "url(#opGreen)" },
    { name: t("pages.projects.focusAssignments"), value: assignments, fill: "url(#opBlue)" },
    { name: t("pages.projects.overdueTasks"), value: overdueTasks, fill: "url(#opAmber)" },
    { name: t("pages.projects.criticalRisks"), value: criticalRisks, fill: "url(#opRose)" },
  ];

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barCategoryGap="28%">
          <defs>
            <linearGradient id="opGreen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="opBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="opAmber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="opRose" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, maxVal]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={148} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
            contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)", fontSize: 13 }}
            formatter={(value, name) => [value, name]}
          />
          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={18}>
            {data.map((entry, index) => (
              <Cell key={`op-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProjectCommandCenter({ t, counts, financials, activeView, onViewChange, onCreateProject }) {
  const tabs = [
    { id: "dashboard",   label: t("pages.projects.commandDashboard"),       Icon: LayoutDashboard },
    { id: "active",      label: t("pages.projects.commandActiveProjects"),   Icon: FolderOpen     },
    { id: "staff",       label: t("pages.projects.commandStaff"),            Icon: Users2         },
    { id: "finance",     label: t("pages.projects.commandFinance"),          Icon: CreditCard     },
    { id: "performance", label: t("pages.projects.commandPerformance"),      Icon: BarChart2      },
    { id: "documents",   label: t("pages.projects.commandDocuments"),        Icon: FileText       },
    { id: "suggestions", label: t("pages.projects.commandSuggestions"),      Icon: Lightbulb      },
  ];
  const activeTab = tabs.find((tab) => tab.id === activeView) || tabs[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-1">
          {/* mobile: compact picker to avoid horizontal clipping */}
          <div className="w-full p-2 sm:hidden">
            <label className="sr-only" htmlFor="projects-view-select">{t("navigation.projects")}</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <activeTab.Icon className="h-4 w-4 shrink-0 text-primary" />
              <select
                id="projects-view-select"
                className="w-full bg-transparent text-sm font-medium text-slate-700 focus:outline-none"
                value={activeView}
                onChange={(event) => onViewChange(event.target.value)}
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* tablet/desktop: horizontal tabs */}
          <div className="hidden min-w-0 flex-1 overflow-x-auto sm:block [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            <div className="flex min-w-max border-b border-slate-200">
              {tabs.map(({ id, label, Icon }) => {
                const isActive = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onViewChange(id)}
                    className={cn(
                      "relative flex items-center gap-2 whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isActive ? "text-primary" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-sm bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* add button — always visible, separated by a border */}
        {onCreateProject ? (
          <div className="flex shrink-0 items-center border-l border-slate-200 px-3">
            <button
              type="button"
              onClick={onCreateProject}
              title={t("pages.projects.addNewProject")}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm transition hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FinanceConsumptionChart({ consumedPercent, t }) {
  const safePercent = clampPercent(consumedPercent);
  const chartData = [
    { name: t("pages.projects.budgetConsumed"), value: safePercent, color: "url(#budgetConsumedGradient)" },
    { name: t("pages.projects.globalBudget"), value: Math.max(100 - safePercent, 0), color: "#dbeafe" },
  ];

  return (
    <div className="relative h-56 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <defs>
            <linearGradient id="budgetConsumedGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            startAngle={90}
            endAngle={-270}
            innerRadius={64}
            outerRadius={86}
            stroke="none"
            paddingAngle={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => `${Math.round(Number(value || 0))}%`}
            contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-4xl font-semibold text-slate-950">{safePercent}%</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("pages.projects.budgetConsumed")}</p>
      </div>
    </div>
  );
}

function PortfolioEvolutionChart({ projects, t }) {
  const rows = projects.slice(0, 6).map((project, index) => ({
    id: project.id ?? index,
    name: String(project.name || "--").slice(0, 28),
    fullName: project.name || "--",
    code: project.code || "--",
    progress: clampPercent(project.progress_percent),
  }));

  if (!rows.length) {
    return <p className="text-sm text-slate-600">{t("common.noData")}</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="projectProgressGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="#64748b" fontSize={12} />
          <YAxis type="category" dataKey="name" width={160} stroke="#64748b" fontSize={12} />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.14)" }}
            formatter={(value) => [`${Math.round(Number(value || 0))}%`, t("pages.projects.portfolioEvolutionTitle")]}
            labelFormatter={(_, payload) => {
              const entry = payload?.[0]?.payload;
              if (!entry) {
                return "";
              }
              return `${entry.fullName} (${entry.code})`;
            }}
            contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)" }}
          />
          <Bar dataKey="progress" fill="url(#projectProgressGradient)" radius={[0, 10, 10, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FinancialOverviewChart({ budget, expenses, revenues, margin, language, t }) {
  function formatShort(value) {
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Md`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} M`;
    if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} k`;
    return String(Math.round(value));
  }

  const isNegativeMargin = Number(margin || 0) < 0;
  const data = [
    { name: t("pages.projects.globalBudget"),  value: Number(budget   || 0), fill: "url(#finBudget)"   },
    { name: t("pages.projects.globalExpenses"), value: Number(expenses || 0), fill: "url(#finExpenses)" },
    { name: t("pages.projects.globalRevenue"),  value: Number(revenues || 0), fill: "url(#finRevenue)"  },
    { name: t("pages.projects.globalMargin"),   value: Number(margin   || 0), fill: isNegativeMargin ? "url(#finDanger)" : "url(#finMargin)" },
  ];

  const kpis = [
    { label: t("pages.projects.globalBudget"),   value: formatCompactMoney(budget,   language), color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200" },
    { label: t("pages.projects.globalExpenses"),  value: formatCompactMoney(expenses, language), color: "text-rose-600",    bg: "bg-rose-50 border-rose-200"    },
    { label: t("pages.projects.globalRevenue"),   value: formatCompactMoney(revenues, language), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { label: t("pages.projects.globalMargin"),    value: formatCompactMoney(margin,   language), color: isNegativeMargin ? "text-rose-600" : "text-sky-700", bg: isNegativeMargin ? "bg-rose-50 border-rose-200" : "bg-sky-50 border-sky-200" },
  ];

  return (
    <div className="space-y-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 20, right: 16, left: 8, bottom: 4 }} barCategoryGap="32%">
            <defs>
              <linearGradient id="finBudget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
              <linearGradient id="finExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
              <linearGradient id="finRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="finMargin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="finDanger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatShort} />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
              contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)", fontSize: 13 }}
              formatter={(value) => [formatCompactMoney(value, language), ""]}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={52} label={{ position: "top", formatter: formatShort, fontSize: 11, fontWeight: 600, fill: "#475569" }}>
              {data.map((entry, index) => (
                <Cell key={`fin-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${kpi.bg}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{kpi.label}</p>
            <p className={`text-base font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectFinancialDashboard({ t, language, period, onPeriodChange, financials, projects }) {
  const topProjects = projects.slice(0, 6);

  return (
    <Card id="project-finance" className="space-y-5">
      <SectionHeader
        eyebrow={t("pages.projects.financeEyebrow")}
        title={t("pages.projects.globalFinanceTitle")}
        description={t("pages.projects.globalFinanceHint")}
        meta={
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer"
          >
            {portfolioPeriods.map((value) => (
              <option key={value} value={value}>
                {t(`pages.projects.periods.${value}`)}
              </option>
            ))}
          </select>
        }
      />
      <FinancialOverviewChart
        budget={financials.budget}
        expenses={financials.expenses}
        revenues={financials.revenues}
        margin={financials.margin}
        language={language}
        t={t}
      />
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.budgetConsumed")}</p>
              <p className="mt-1 text-sm text-slate-600">{t("pages.projects.globalFinanceRatioHint")}</p>
            </div>
            <p className="text-3xl font-semibold text-slate-950">{financials.consumedPercent}%</p>
          </div>
          <div className="mt-2">
            <FinanceConsumptionChart consumedPercent={financials.consumedPercent} t={t} />
          </div>
          <div className="-mt-1 flex items-center justify-between rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-xs">
            <span className="font-semibold text-emerald-700">{t("pages.projects.budgetConsumed")}</span>
            <span className="font-semibold text-slate-700">{financials.consumedPercent}%</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.portfolioEvolutionTitle")}</p>
          <p className="mt-1 text-sm text-slate-600">{t("pages.projects.portfolioEvolutionHint")}</p>
          <div className="mt-3">
            <PortfolioEvolutionChart projects={topProjects} t={t} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProjectDashboardPanel({ t, language, counts, dashboard, staffCount, financials, period, onPeriodChange, projects }) {
  const assignments = dashboard?.counts?.assignments ?? 0;
  const overdueTasks = dashboard?.counts?.overdue_tasks ?? 0;
  const criticalRisks = dashboard?.counts?.critical_risks ?? 0;

  return (
    <div className="space-y-5">
      <Card id="project-dashboard" className="space-y-6">
        <SectionHeader
          eyebrow={t("navigation.dashboard")}
          title={t("pages.projects.dashboardTitle")}
          description={t("pages.projects.dashboardHint")}
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.totalProjectsLabel")}</p>
            <ProjectStatusDonut counts={counts} t={t} />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("pages.projects.dashboardHint").split(".")[0]}</p>
            <OperationalKpiChart
              staffCount={staffCount}
              assignments={assignments}
              overdueTasks={overdueTasks}
              criticalRisks={criticalRisks}
              t={t}
            />
          </div>
        </div>
      </Card>
      <ProjectFinancialDashboard
        t={t}
        language={language}
        period={period}
        onPeriodChange={onPeriodChange}
        financials={financials}
        projects={projects}
      />
    </div>
  );
}

function WorkspaceHorizontalBarChart({ data, valueFormatter = (value) => String(Math.round(toFiniteNumber(value))), emptyLabel }) {
  const rows = (data || []).filter(Boolean);
  const maxValue = Math.max(...rows.map((row) => toFiniteNumber(row.value)), 0);

  if (!rows.length || maxValue <= 0) {
    return <p className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">{emptyLabel}</p>;
  }

  const domainMax = Math.max(Math.ceil(maxValue * 1.12), 1);

  return (
    <div className="rounded-[22px] border border-slate-200/90 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 52, left: 8, bottom: 8 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, domainMax]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" width={150} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(148,163,184,0.08)" }}
            contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)", fontSize: 12 }}
            formatter={(value, _name, props) => [valueFormatter(value), props?.payload?.label || ""]}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            barSize={22}
            label={{ position: "right", formatter: (value) => valueFormatter(value), fill: "#475569", fontSize: 11, fontWeight: 700 }}
          >
            {rows.map((row) => (
              <Cell key={row.label} fill={row.fill || "#2563eb"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function WorkspaceFinanceDonutChart({ data, valueFormatter = (value) => String(Math.round(toFiniteNumber(value))), emptyLabel, centerLabel = "Total" }) {
  const rows = (data || []).filter((row) => toFiniteNumber(row?.value) > 0);
  const total = rows.reduce((sum, row) => sum + toFiniteNumber(row.value), 0);
  const normalizedCenterLabel = String(centerLabel || "").replace(/\s+/g, " ").trim();
  const centerWords = normalizedCenterLabel.split(" ").filter(Boolean);
  const centerLabelLines = (() => {
    if (centerWords.length <= 2) {
      return [normalizedCenterLabel || "Total"];
    }

    const midpoint = Math.ceil(centerWords.length / 2);
    return [centerWords.slice(0, midpoint).join(" "), centerWords.slice(midpoint).join(" ")];
  })();
  const isLongCenterLabel = normalizedCenterLabel.length > 14;
  const formattedTotal = valueFormatter(total);
  const valueParts = String(formattedTotal).trim().split(/\s+/);
  const hasStandaloneUnit = valueParts.length >= 2 && valueParts[valueParts.length - 1].length <= 6;
  const centerPrimaryValue = hasStandaloneUnit ? valueParts.slice(0, -1).join(" ") : formattedTotal;
  const centerSecondaryValue = hasStandaloneUnit ? valueParts[valueParts.length - 1] : "";

  if (!rows.length || total <= 0) {
    return <p className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">{emptyLabel}</p>;
  }

  return (
    <div className="rounded-[22px] border border-slate-200/90 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div className="relative h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="53%"
                outerRadius="76%"
                paddingAngle={2}
                stroke="none"
              >
                {rows.map((row) => (
                  <Cell key={row.label} fill={row.fill || "#2563eb"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)", fontSize: 12 }}
                formatter={(value, name) => [valueFormatter(value), String(name || "")]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <p className={cn(
              "max-w-[8.4rem] font-semibold uppercase leading-tight text-slate-500",
              isLongCenterLabel ? "text-[8px] tracking-[0.08em]" : "text-[9px] tracking-[0.11em]"
            )}>
              {centerLabelLines.map((line, index) => (
                <span key={`${line}-${index}`} className="block">{line}</span>
              ))}
            </p>
            <p className="mt-0.5 max-w-[8.4rem] text-[clamp(0.9rem,2vw,1.22rem)] font-semibold leading-tight text-slate-900">{centerPrimaryValue}</p>
            {centerSecondaryValue ? (
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-slate-600">{centerSecondaryValue}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((row) => {
            const value = toFiniteNumber(row.value);
            const percent = Math.round((value / total) * 100);

            return (
              <div key={row.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill || "#2563eb" }} />
                      <p className="text-[12px] font-semibold leading-tight text-slate-800">{row.label}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] text-slate-600">{valueFormatter(value)}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{percent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkspaceProgressRadialChart({ data, emptyLabel }) {
  const rows = (data || []).filter((row) => toFiniteNumber(row?.value) > 0);

  if (!rows.length) {
    return <p className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">{emptyLabel}</p>;
  }

  const chartRows = rows.map((row) => ({
    ...row,
    value: Math.max(0, Math.min(100, toFiniteNumber(row.value))),
    full: 100,
  }));
  const average = Math.round(chartRows.reduce((sum, row) => sum + row.value, 0) / chartRows.length);

  return (
    <div className="rounded-[22px] border border-slate-200/90 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div className="relative h-56 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadialBarChart
              data={chartRows}
              cx="50%"
              cy="50%"
              innerRadius="36%"
              outerRadius="78%"
              barSize={8}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar dataKey="full" cornerRadius={999} fill="#e2e8f0" background clockWise />
              <RadialBar dataKey="value" cornerRadius={999} clockWise>
                {chartRows.map((row) => (
                  <Cell key={row.label} fill={row.fill || "#2563eb"} />
                ))}
              </RadialBar>
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", boxShadow: "0 10px 35px rgba(15,23,42,0.12)", fontSize: 12 }}
                formatter={(value, _name, props) => [`${Math.round(toFiniteNumber(value))}%`, props?.payload?.label || ""]}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-[0.11em] leading-tight text-slate-500">Moyenne</p>
            <p className="mt-0.5 text-[clamp(0.95rem,2.1vw,1.22rem)] font-semibold leading-tight text-slate-900">{average}%</p>
          </div>
        </div>

        <div className="space-y-2">
          {chartRows.map((row) => (
            <div key={row.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.fill || "#2563eb" }} />
                    <p className="text-[12px] font-semibold leading-tight text-slate-800">{row.label}</p>
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {Math.round(row.value)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectWorkspaceRiskChart({ t, risks, emptyLabel }) {
  const severityPalette = {
    critical: "#e11d48",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#38bdf8",
  };
  const severityRows = riskSeverities
    .map((severity) => ({
      id: severity,
      label: getTranslationOrFallback(t, `enums.riskSeverity.${severity}`, severity),
      value: risks.filter((risk) => risk.severity === severity).length,
      color: severityPalette[severity] || "#94a3b8",
    }))
    .filter((row) => row.value > 0);
  const statusRows = riskStatuses
    .map((status) => ({
      id: status,
      label: getTranslationOrFallback(t, `enums.riskStatus.${status}`, status),
      value: risks.filter((risk) => risk.status === status).length,
    }))
    .filter((row) => row.value > 0);

  if (!severityRows.length) {
    return <p className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-600">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      <WorkspaceFinanceDonutChart
        data={severityRows.map((row) => ({ label: row.label, value: row.value, fill: row.color }))}
        valueFormatter={(value) => String(Math.round(toFiniteNumber(value)))}
        emptyLabel={emptyLabel}
        centerLabel={t("pages.projects.riskSection")}
      />

      <div className="flex flex-wrap gap-2">
        {statusRows.map((row) => (
          <Badge key={row.id} variant={row.id === "closed" ? "success" : row.id === "mitigated" ? "info" : row.id === "monitoring" ? "warning" : "danger"}>
            {row.label}: {row.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function humanizeToken(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "--";
  }

  return text
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStockCategoryLabel(t, category) {
  if (category === "material") return t("pages.projects.stockMaterials");
  if (category === "equipment") return t("pages.projects.equipment");
  if (category === "consumable") return t("pages.projects.stockConsumables");
  return t("pages.projects.stockOther");
}

function isSameScheduleDay(value, referenceDate) {
  const parsedDate = parseScheduleDate(value);
  return Boolean(parsedDate && referenceDate && parsedDate.getTime() === referenceDate.getTime());
}

function isBeforeScheduleDay(value, referenceDate) {
  const parsedDate = parseScheduleDate(value);
  return Boolean(parsedDate && referenceDate && parsedDate.getTime() < referenceDate.getTime());
}

function getTaskStatusBadgeVariant(status) {
  if (status === "blocked") return "danger";
  if (status === "in_progress") return "info";
  if (status === "completed" || status === "done") return "success";
  return "neutral";
}

function ProjectWorkspaceDashboard({
  t,
  language,
  project,
  workspace,
  assignmentItems,
  taskItems,
  reportItems,
  riskItems,
  changeOrderItems,
  documentItems,
  budgetItems,
  onOpenDocuments,
  onOpenStock,
}) {
  const finance = workspace?.finance || {};
  const resources = workspace?.resources || {};
  const kpis = workspace?.kpis || {};
  const alerts = workspace?.alerts || [];
  const budgetConsumed = Math.max(toFiniteNumber(finance.budget_consumed_percent), 0);
  const progressReference = toFiniteNumber(project?.progress_percent || project?.physical_progress_percent);
  const budgetGap = Math.round((budgetConsumed - progressReference) * 10) / 10;
  const completedTasks = Number(kpis.tasks_completed || 0);
  const totalTasks = Number(kpis.tasks_total || taskItems.length || 0);
  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDate = parseScheduleDate(todayKey);
  const activeAssignments = assignmentItems.filter((assignment) => {
    if (assignment?.is_active === false) {
      return false;
    }

    const assignmentStartDate = parseScheduleDate(assignment.start_date);
    const assignmentEndDate = parseScheduleDate(assignment.end_date);
    if (assignmentStartDate && todayDate && assignmentStartDate.getTime() > todayDate.getTime()) {
      return false;
    }
    if (assignmentEndDate && todayDate && assignmentEndDate.getTime() < todayDate.getTime()) {
      return false;
    }

    return true;
  });
  const activePeople = Array.from(
    new Map(
      activeAssignments
        .filter((assignment) => assignment.user_id)
        .map((assignment) => [assignment.user_id, assignment])
    ).values()
  );
  const latestDailyReport = reportItems.find((report) => report.report_type === "daily") || reportItems[0];
  const todayReports = reportItems.filter((report) => report.report_date === todayKey);
  const reportedPersonnelToday = todayReports[0]?.personnel_present ?? latestDailyReport?.personnel_present ?? null;
  const peopleTodayCount = Number(reportedPersonnelToday || activePeople.length || kpis.assignments_count || 0);
  const taskFocusItems = taskItems
    .filter((task) => !["completed", "done"].includes(task.status))
    .map((task) => {
      const deliveryDate = task.end_date || task.due_date;
      const startsToday = isSameScheduleDay(task.start_date, todayDate);
      const dueToday = isSameScheduleDay(deliveryDate, todayDate);
      const overdue = isBeforeScheduleDay(deliveryDate, todayDate);
      const inProgress = task.status === "in_progress";
      const relevantToday = startsToday || dueToday || overdue || inProgress;
      const urgencyScore =
        (overdue ? 400 : 0)
        + (dueToday ? 240 : 0)
        + (startsToday ? 180 : 0)
        + (task.priority === "urgent" ? 80 : task.priority === "high" ? 40 : 0)
        + (inProgress ? 20 : 0);

      return {
        ...task,
        startsToday,
        dueToday,
        overdue,
        inProgress,
        relevantToday,
        deliveryDate,
        urgencyScore,
      };
    })
    .filter((task) => task.relevantToday)
    .sort((left, right) => {
      if (right.urgencyScore !== left.urgencyScore) {
        return right.urgencyScore - left.urgencyScore;
      }
      return (
        (parseScheduleDate(left.deliveryDate)?.getTime() || Number.MAX_SAFE_INTEGER)
        - (parseScheduleDate(right.deliveryDate)?.getTime() || Number.MAX_SAFE_INTEGER)
      );
    });
  const alertsBySeverity = alerts.reduce(
    (summary, alert) => ({
      ...summary,
      [alert.severity || "neutral"]: (summary[alert.severity || "neutral"] || 0) + 1,
    }),
    { danger: 0, warning: 0, info: 0, neutral: 0 }
  );
  const stockChartRows = Object.entries(resources.by_category || {})
    .map(([category, value]) => ({
      label:
        category === "material"
          ? t("pages.projects.stockMaterials")
          : category === "equipment"
            ? t("pages.projects.equipment")
            : category === "consumable"
              ? t("pages.projects.stockConsumables")
              : t("pages.projects.stockOther"),
      value: toFiniteNumber(value),
      fill:
        category === "material"
          ? "#0ea5e9"
          : category === "equipment"
            ? "#8b5cf6"
            : category === "consumable"
              ? "#10b981"
              : "#64748b",
    }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value);
  const stockFamiliesCount = stockChartRows.length;
  const peopleChartRows = Object.entries(
    activeAssignments.reduce((summary, assignment) => {
      const label =
        assignment.user?.job_title
        || assignment.responsibility
        || humanizeToken(assignment.project_role)
        || t("pages.projects.notAssigned");
      summary[label] = (summary[label] || 0) + 1;
      return summary;
    }, {})
  )
    .map(([label, value], index) => ({
      label,
      value,
      fill: ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#0f766e"][index % 6],
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);
  const publicationChartMap = {};
  documentItems.forEach((document) => {
    const key = document.category || "other";
    publicationChartMap[key] = (publicationChartMap[key] || 0) + 1;
  });
  if (reportItems.length) {
    publicationChartMap.report = (publicationChartMap.report || 0) + reportItems.length;
  }
  if (changeOrderItems.length) {
    publicationChartMap.change_order = (publicationChartMap.change_order || 0) + changeOrderItems.length;
  }
  const totalPublications = Object.values(publicationChartMap).reduce((total, value) => total + toFiniteNumber(value), 0);
  const publicationChartRows = Object.entries(publicationChartMap)
    .map(([category, value]) => ({
      label:
        category === "change_order"
          ? getTranslationOrFallback(t, "pages.projects.validationTypes.change_order", "Avenant")
          : getTranslationOrFallback(t, `enums.projectDocumentCategory.${category}`, humanizeToken(category)),
      value: toFiniteNumber(value),
      fill:
        category === "pv"
          ? "#2563eb"
          : category === "decompte"
            ? "#f59e0b"
            : category === "report"
              ? "#10b981"
              : category === "change_order"
                ? "#8b5cf6"
                : category === "plan"
                  ? "#0ea5e9"
                  : "#64748b",
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  const financeChartRows = [
    { label: t("pages.projects.projectBudget"), value: toFiniteNumber(finance.budget_amount), fill: "#4f46e5" },
    { label: t("pages.projects.projectExpenses"), value: toFiniteNumber(finance.expenses), fill: "#e11d48" },
    { label: t("pages.projects.projectRevenue"), value: toFiniteNumber(finance.revenues), fill: "#059669" },
    { label: t("pages.finance.outstanding"), value: toFiniteNumber(finance.outstanding), fill: "#f59e0b" },
  ];
  const progressChartRows = [
    { label: t("pages.projects.globalProgress"), value: toFiniteNumber(project?.progress_percent), fill: "#10b981" },
    { label: t("pages.projects.physicalProgress"), value: toFiniteNumber(project?.physical_progress_percent), fill: "#0ea5e9" },
    { label: t("pages.projects.financialProgress"), value: toFiniteNumber(project?.financial_progress_percent), fill: "#facc15" },
    { label: t("pages.projects.budgetConsumed"), value: budgetConsumed, fill: "#6366f1" },
  ];
  const taskChartRows = taskStatuses.map((status) => ({
    label: getTranslationOrFallback(t, `enums.projectTaskStatus.${status}`, status),
    value: taskItems.filter((task) => task.status === status).length,
    fill:
      status === "completed"
        ? "#10b981"
        : status === "in_progress"
          ? "#0ea5e9"
          : status === "blocked"
            ? "#e11d48"
            : "#94a3b8",
  }));
  const operationsChartRows = [
    { label: t("pages.projects.focusAssignments"), value: Number(kpis.assignments_count || assignmentItems.length), fill: "#2563eb" },
    { label: getTranslationOrFallback(t, "pages.projects.validationTypes.report", "Rapport"), value: Number(kpis.reports_count || reportItems.length), fill: "#10b981" },
    { label: t("pages.projects.documents"), value: Number(kpis.documents_count || documentItems.length), fill: "#64748b" },
    { label: getTranslationOrFallback(t, "pages.projects.validationTypes.change_order", "Avenant"), value: Number(kpis.change_orders_count || changeOrderItems.length), fill: "#f59e0b" },
    { label: t("pages.projects.versionLabel"), value: budgetItems.length, fill: "#7c3aed" },
    { label: t("pages.projects.allocations"), value: Number(resources.allocations_count || 0), fill: "#0f766e" },
  ];
  const stockRows = Object.entries(resources.by_category || {})
    .map(([category, value]) => ({ category, value: toFiniteNumber(value) }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value);

  return (
    <div className="space-y-5">
      <WorkspacePanel className="space-y-5">
        <SectionHeader
          eyebrow={t("pages.projects.workspaceSnapshotEyebrow")}
          title={t("pages.projects.workspaceDashboardTab")}
          meta={
            alerts.length ? (
              <div className="flex flex-wrap gap-2">
                {alerts.slice(0, 4).map((alert) => (
                  <Badge key={`${alert.code}-${alert.value}`} variant={getBadgeVariantForSeverity(alert.severity)}>
                    <AlertText alert={alert} t={t} language={language} />
                  </Badge>
                ))}
              </div>
            ) : null
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <BudgetGaugeCard
            budgetConsumed={budgetConsumed}
            physicalProgress={progressReference}
            budgetGap={budgetGap}
            t={t}
            tone={budgetGap > cockpitBudgetGapThreshold ? "text-amber-600" : "text-slate-900"}
          />
          <MarginBarCard
            finance={finance}
            t={t}
            language={language}
            tone={toFiniteNumber(finance.margin) < 0 ? "text-rose-600" : "text-emerald-600"}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TaskListCard tasks={taskItems} t={t} />
          <RiskListCard risks={riskItems} t={t} />
        </div>
      </WorkspacePanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.teamEyebrow")}
            title={t("pages.projects.workspacePeopleChartTitle")}
            meta={<Badge variant="info">{t("pages.projects.focusAssignments")}: {activeAssignments.length}</Badge>}
          />
          <div className="rounded-2xl border border-slate-200/90 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(240,249,255,0.9)_55%,rgba(248,250,252,0.98))] px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                <Users2 className="h-4.5 w-4.5" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Equipe active</span>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <p className="text-[2.2rem] font-semibold leading-none text-slate-900">{activePeople.length}</p>
              <p className="pb-1 text-sm text-slate-600">{activePeople.length > 1 ? "personnes" : "personne"}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById("project-staff");
                if (target) {
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className="group mt-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.6)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              <Users2 className="h-4 w-4 transition group-hover:scale-110" />
              Consulter
            </button>
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("navigation.inventory")}
            title={t("pages.projects.workspaceStockChartTitle")}
            meta={<Badge variant="neutral">{t("pages.projects.allocations")}: {resources.allocations_count || 0}</Badge>}
          />
          <div className="space-y-3">
            {stockRows.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 px-4 py-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Package className="h-4.5 w-4.5" />
                  <p className="text-sm">Aucun stock mobilise pour ce projet.</p>
                </div>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {stockRows.map((row) => {
                  const StockCategoryIcon =
                    row.category === "equipment"
                      ? Wrench
                      : row.category === "consumable"
                        ? FlaskConical
                        : Package;

                  return (
                    <li key={row.category} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-[0_10px_22px_-20px_rgba(15,23,42,0.45)]">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                          <StockCategoryIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm font-semibold text-slate-900">{getStockCategoryLabel(t, row.category)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                        <span className="text-sm font-semibold text-slate-700">{Math.round(row.value)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={onOpenStock}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.6)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                Voir plus
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </WorkspacePanel>

      </div>

      <WorkspacePanel className="space-y-4">
        <SectionHeader
          eyebrow={t("pages.projects.docsEyebrow")}
          title={t("pages.projects.workspaceDocumentsChartTitle")}
          meta={<Badge variant="neutral">{t("pages.projects.documents")}: {documentItems.length}</Badge>}
        />
        {!documentItems.length ? (
          <p className="text-sm text-slate-600">Aucun document mis en ligne pour ce projet.</p>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2.5">
              {[...documentItems]
              .sort((left, right) => parseRecentDocumentTime(right.added_at || right.document_date) - parseRecentDocumentTime(left.added_at || left.document_date))
              .slice(0, 2)
              .map((doc) => (
                <li key={doc.id} className="rounded-xl border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-4 py-3.5 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.65)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.97rem] font-semibold text-slate-800">{doc.title}</p>
                      <p className="mt-1.5 text-sm text-slate-500">
                        {formatProjectDateTime(doc.added_at || doc.document_date, language)}
                        {doc.uploaded_by?.full_name ? ` | ${doc.uploaded_by.full_name}` : ""}
                      </p>
                    </div>
                    {doc.file_url ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                        aria-label="Telecharger"
                        title="Telecharger"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={onOpenDocuments}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.6)] transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
              >
                Voir plus
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </WorkspacePanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.planningEyebrow")}
            title={t("pages.projects.workspaceDayPlanTitle")}
            meta={
              <div className="flex flex-wrap gap-2">
                <Badge variant={taskFocusItems.length ? "info" : "success"}>{t("pages.projects.workspaceTasksTodayMetric")}: {taskFocusItems.length}</Badge>
                <Badge variant="neutral">{t("pages.projects.overdueTasks")}: {taskFocusItems.filter((task) => task.overdue).length}</Badge>
              </div>
            }
          />
          {!taskFocusItems.length ? <p className="text-sm text-slate-600">{t("pages.projects.workspaceDayPlanEmpty")}</p> : null}
          {!!taskFocusItems.length && (
            <div className="space-y-3">
              {taskFocusItems.slice(0, 6).map((task) => (
                <div key={task.id} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-4 py-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.36)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {task.responsible_user?.full_name || task.assigned_user?.full_name || t("pages.projects.notAssigned")}
                        {" | "}
                        {getTranslationOrFallback(t, `enums.taskPriority.${task.priority}`, humanizeToken(task.priority))}
                      </p>
                    </div>
                    <Badge variant={getTaskStatusBadgeVariant(task.status)}>
                      {getTranslationOrFallback(t, `enums.projectTaskStatus.${task.status}`, humanizeToken(task.status))}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {task.overdue ? <Badge variant="danger">{t("pages.projects.workspacePlannerOverdue")}</Badge> : null}
                    {task.dueToday ? <Badge variant="warning">{t("pages.projects.workspacePlannerDueToday")}</Badge> : null}
                    {task.startsToday ? <Badge variant="info">{t("pages.projects.workspacePlannerStartsToday")}</Badge> : null}
                    {task.inProgress ? <Badge variant="success">{t("pages.projects.workspacePlannerInProgress")}</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {t("pages.projects.workspacePlannerDate")}: {formatProjectDate(task.deliveryDate || task.start_date, language)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.alerts")}
            title={t("pages.projects.workspaceAlertsFeedTitle")}
            meta={
              <div className="flex flex-wrap gap-2">
                <Badge variant={alertsBySeverity.danger ? "danger" : "neutral"}>{t("pages.projects.workspaceAlertSeverityDanger")}: {alertsBySeverity.danger || 0}</Badge>
                <Badge variant={alertsBySeverity.warning ? "warning" : "neutral"}>{t("pages.projects.workspaceAlertSeverityWarning")}: {alertsBySeverity.warning || 0}</Badge>
                <Badge variant={alertsBySeverity.info ? "info" : "neutral"}>{t("pages.projects.workspaceAlertSeverityInfo")}: {alertsBySeverity.info || 0}</Badge>
              </div>
            }
          />
          {!alerts.length ? <p className="text-sm text-slate-600">{t("pages.projects.workspaceAlertEmpty")}</p> : null}
          {!!alerts.length && (
            <div className="space-y-3">
              {alerts.slice(0, 6).map((alert) => (
                <div key={`${alert.code}-${alert.value}`} className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] px-4 py-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.36)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        <AlertText alert={alert} t={t} language={language} />
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{t("pages.projects.workspaceAlertsMetric")}</p>
                    </div>
                    <Badge variant={getBadgeVariantForSeverity(alert.severity)}>
                      {humanizeToken(alert.severity)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.financeEyebrow")}
            title={t("pages.projects.workspaceFinanceChartTitle")}
            meta={<Badge variant={toFiniteNumber(finance.margin) < 0 ? "danger" : "success"}>{formatCompactMoney(finance.margin, language)}</Badge>}
          />
          <WorkspaceFinanceDonutChart
            data={financeChartRows}
            valueFormatter={(value) => formatCompactMoney(value, language)}
            emptyLabel={t("common.noData")}
          />
        </WorkspacePanel>

        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.performanceEyebrow")}
            title={t("pages.projects.workspaceProgressChartTitle")}
            meta={
              <Badge variant={budgetGap > cockpitBudgetGapThreshold ? "warning" : budgetGap < 0 ? "success" : "info"}>
                {t("pages.projects.cockpitBudgetProgress")}: {budgetGap > 0 ? "+" : ""}{Math.round(budgetGap)}%
              </Badge>
            }
          />
          <WorkspaceProgressRadialChart
            data={progressChartRows}
            emptyLabel={t("common.noData")}
          />
        </WorkspacePanel>
      </div>

    </div>
  );
}

function ProjectWorkspaceStockPanel({ t, workspace, projectAllocations = [], projectMovements = [], projectSupplyRequests = [], loadingSupplyRequests = false, inventoryItems = [], projectTeam = [], collaborators = [], onCreateInventoryItem, onUpdateInventoryItem, onDeleteInventoryItem, onAddProjectStock, onSubmitSupplyRequest, onUpdateSupplyRequest, savingInventoryItem = false, canCreateStockItem = false }) {
  const resources = workspace?.resources || {};
  const allocationRows = projectAllocations || [];
  const computeProjectMovementDelta = (row) => {
    const quantity = toFiniteNumber(row?.quantity || 0);
    const movementType = String(row?.movement_type || "").toLowerCase();

    if (movementType === "in" || movementType === "allocation") return quantity;
    if (movementType === "out") return -quantity;

    if ((movementType === "adjustment" || movementType === "transfer") && row?.stock_before != null && row?.stock_after != null) {
      return toFiniteNumber(row.stock_after) - toFiniteNumber(row.stock_before);
    }

    return 0;
  };
  const allocatedItemsById = allocationRows.reduce((summary, row) => {
    const item = row?.item;
    const itemId = item?.id || row?.item_id;
    if (!item || !itemId) {
      return summary;
    }
    const existing = summary[itemId] || {
      ...item,
      allocated_quantity: 0,
    };
    existing.allocated_quantity = toFiniteNumber(existing.allocated_quantity) + toFiniteNumber(row.quantity_allocated || 0);
    summary[itemId] = existing;
    return summary;
  }, {});
  const movementItemsById = projectMovements.reduce((summary, row) => {
    const item = row?.item;
    const itemId = item?.id || row?.item_id;
    if (!item || !itemId || summary[itemId]) return summary;
    summary[itemId] = { ...item, allocated_quantity: 0 };
    return summary;
  }, {});
  const projectRelevantMovements = [...projectMovements].filter((row) => {
    // Ignore technical replenishment lines and keep business-relevant project history.
    const ref = String(row?.reference || "");
    return !(row?.movement_type === "in" && ref.startsWith("UI-PROJECT-STOCK-"));
  });
  const projectCurrentByItem = (() => {
    const balanceByItem = new Map();
    [...projectRelevantMovements]
      .sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
        return leftDate - rightDate;
      })
      .forEach((row) => {
        const itemId = row?.item_id;
        if (!itemId) return;
        const key = String(itemId);
        const current = toFiniteNumber(balanceByItem.get(key) || 0);
        const next = Math.max(current + computeProjectMovementDelta(row), 0);
        balanceByItem.set(key, next);
      });
    return balanceByItem;
  })();
  const allocatedItems = Object.values({ ...movementItemsById, ...allocatedItemsById })
    .map((item) => ({
      ...item,
      project_available_quantity: toFiniteNumber(projectCurrentByItem.get(String(item.id)) ?? item.allocated_quantity ?? 0),
    }))
    .filter((item) => toFiniteNumber(item.allocated_quantity) > 0 || toFiniteNumber(item.project_available_quantity) > 0)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "fr", { sensitivity: "base" }));

  const stockRowsFromAllocations = ["material", "equipment", "consumable"]
    .map((category) => ({
      category,
      value: allocatedItems
        .filter((item) => item.category === category)
        .reduce((total, item) => total + toFiniteNumber(item.project_available_quantity), 0),
    }))
    .filter((row) => row.value > 0);
  const categoryRows = (stockRowsFromAllocations.length ? stockRowsFromAllocations : Object.entries(resources.by_category || {})
    .map(([category, value]) => ({ category, value: toFiniteNumber(value) })))
    .sort((left, right) => right.value - left.value);
  const equipmentQuantity = stockRowsFromAllocations.find((row) => row.category === "equipment")?.value ?? toFiniteNumber(resources.equipment_quantity || 0);
  const allocationsCount = allocationRows.length || Math.round(toFiniteNumber(resources.allocations_count || 0));
  const criticalRows = categoryRows.filter((row) => row.value > 0 && row.value <= 3);
  const totalCriticalFallback = criticalRows.reduce((total, row) => total + Math.round(row.value), 0);
  const isAllocatedCriticalItem = (item) => {
    const allocated = toFiniteNumber(item?.allocated_quantity || 0);
    const threshold = toFiniteNumber(item?.min_threshold || 0);
    return threshold > 0 && allocated <= threshold;
  };
  const criticalItemsCount = allocatedItems.filter((item) => isAllocatedCriticalItem(item)).length;
  const criticalItems = allocatedItems
    .filter((item) => isAllocatedCriticalItem(item))
    .sort((left, right) => Number(left.allocated_quantity || 0) - Number(right.allocated_quantity || 0));
  const totalCritical = allocatedItems.length ? criticalItemsCount : totalCriticalFallback;
  const categoryMeta = [
    { key: "material", label: getStockCategoryLabel(t, "material"), singular: "materiau", icon: Package },
    { key: "equipment", label: getStockCategoryLabel(t, "equipment"), singular: "equipement", icon: Wrench },
    { key: "consumable", label: getStockCategoryLabel(t, "consumable"), singular: "consommable", icon: FlaskConical },
  ];
  const [categoryDrafts, setCategoryDrafts] = useState({
    material: { sku: "", name: "", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "", initial_quantity: "1" },
    equipment: { sku: "", name: "", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "", initial_quantity: "1" },
    consumable: { sku: "", name: "", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "", initial_quantity: "1" },
  });
  const [categorySelectedItemIds, setCategorySelectedItemIds] = useState({
    material: "",
    equipment: "",
    consumable: "",
  });
  const [supplyDraft, setSupplyDraft] = useState({ item_id: "", requested_quantity: "1", urgency: "normal", assignee_user_id: "", reason: "" });
  const [supplyRequestError, setSupplyRequestError] = useState("");
  const [savingSupplyRequest, setSavingSupplyRequest] = useState(false);
  const [stockAvailableQuery, setStockAvailableQuery] = useState("");
  const [stockAvailableCategory, setStockAvailableCategory] = useState("all");
  const [requestsQuery, setRequestsQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [editingItemId, setEditingItemId] = useState(null);
  const [createCatalogDraft, setCreateCatalogDraft] = useState({ sku: "", name: "", category: "material", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "" });
  const [editItemDraft, setEditItemDraft] = useState({ sku: "", name: "", category: "material", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "" });
  const [itemActionBusyId, setItemActionBusyId] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [isExportingHistoryPdf, setIsExportingHistoryPdf] = useState(false);
  const [updatingSupplyRequestId, setUpdatingSupplyRequestId] = useState(null);
  const [supplyRequestEditDrafts, setSupplyRequestEditDrafts] = useState({});
  const [activeStockSection, setActiveStockSection] = useState("available");

  const categoryFilterOptions = [
    { value: "all", label: "Toutes" },
    ...categoryMeta.map((meta) => ({ value: meta.key, label: meta.label })),
  ];
  const collaboratorNameById = collaborators.reduce((summary, user) => {
    if (!user?.id) return summary;
    summary[user.id] = user.full_name || user.email || "";
    return summary;
  }, {});
  const resolveActorLabel = (row, entryType) => {
    if (entryType === "movement") {
      return (
        row?.performed_by?.full_name ||
        row?.performed_by?.email ||
        row?.performed_by_user?.full_name ||
        row?.performed_by_user?.email ||
        collaboratorNameById[row?.performed_by_user_id] ||
        "Utilisateur inconnu"
      );
    }

    return (
      row?.requester?.full_name ||
      row?.requester?.email ||
      row?.created_by?.full_name ||
      row?.created_by?.email ||
      collaboratorNameById[row?.requester_user_id] ||
      collaboratorNameById[row?.created_by_user_id] ||
      "Utilisateur inconnu"
    );
  };
  const categoryItemsByKey = categoryMeta.reduce((summary, meta) => {
    summary[meta.key] = inventoryItems
      .filter((item) => item.category === meta.key)
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "fr", { sensitivity: "base" }));
    return summary;
  }, {});
  const formatDateTimeFull = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  const formatHistoryDateParts = (value) => {
    if (!value) return { date: "-", time: "-" };
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };
    return {
      date: parsed.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      time: parsed.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };
  const normalizeText = (value) => String(value || "").toLowerCase().trim();
  const matchesCategory = (itemCategory, activeCategory) => activeCategory === "all" || itemCategory === activeCategory;
  const movementStatusLabels = {
    in: "Entrée",
    out: "Sortie",
    transfer: "Transfert",
    allocation: "Allocation",
    adjustment: "Ajustement",
    inventory: "Inventaire",
  };
  const formatHistoryNumber = (value) => {
    const numeric = Number(value || 0);
    if (!Number.isFinite(numeric)) return "0";
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  };
  const formatHistoryStockLabel = (value, unit) => `${formatHistoryNumber(value)} ${unit || "pcs"}`;
  const getMovementHistoryTypeLabel = (row) => {
    if (row.movement_type === "in" || row.movement_type === "allocation") return "Entrée";
    if (row.movement_type === "transfer") return "Entrée";
    if (row.movement_type === "adjustment") {
      return Number(row.stock_after || 0) >= Number(row.stock_before || 0) ? "Entrée" : "Sortie";
    }
    return "Sortie";
  };
  const getHistoryTypeBadgeVariant = (typeLabel) => {
    if (typeLabel === "Entrée") return "success";
    if (typeLabel === "Sortie") return "warning";
    return "info";
  };
  const getHistoryStatusBadgeVariant = (row) => {
    if (row.entryType === "movement") {
      if (row.rawStatus === "in") return "success";
      if (row.rawStatus === "out") return "danger";
      if (row.rawStatus === "allocation") return "info";
      return "neutral";
    }
    if (row.rawStatus === "approved" || row.rawStatus === "fulfilled") return "success";
    if (row.rawStatus === "rejected") return "danger";
    if (row.rawStatus === "transmitted") return "info";
    return "warning";
  };
  const getHistoryCategoryBadgeVariant = (category) => {
    if (category === "equipment") return "info";
    if (category === "consumable") return "success";
    return "warning";
  };
  const getSupplyRequestProcessingLabel = (status) => {
    if (status === "fulfilled") return "Traitée";
    if (status === "rejected") return "Rejetée";
    return "Non traitée";
  };
  const getSupplyRequestProcessingVariant = (status) => {
    if (status === "fulfilled") return "success";
    if (status === "rejected") return "danger";
    return "warning";
  };
  const formatStockQuantity = (value) => {
    const numeric = toFiniteNumber(value);
    if (Number.isInteger(numeric)) return String(numeric);
    return numeric.toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0$/, "$1");
  };

  const stockAvailableRows = allocatedItems.filter((item) => {
    const query = normalizeText(stockAvailableQuery);
    const searchable = `${item.name || ""} ${item.sku || ""} ${item.unit || ""}`.toLowerCase();
    return matchesCategory(item.category, stockAvailableCategory) && (!query || searchable.includes(query));
  });

  const inProgressStatuses = new Set(["pending", "approved", "transmitted"]);
  const canManageSupplyRequests = Boolean(onUpdateSupplyRequest);
  const supplyRequestsInProgressRows = projectSupplyRequests.filter((row) => {
    const query = normalizeText(requestsQuery);
    const searchable = `${row.item?.name || ""} ${row.requester?.full_name || ""} ${row.assignee?.full_name || ""} ${row.status || ""} ${row.urgency || ""}`.toLowerCase();
    return inProgressStatuses.has(row.status) && (!query || searchable.includes(query));
  });

  const inventoryCatalogRows = inventoryItems.filter((item) => {
    const query = normalizeText(catalogQuery);
    const searchable = `${item.name || ""} ${item.sku || ""} ${item.unit || ""} ${item.preferred_supplier || ""}`.toLowerCase();
    return matchesCategory(item.category, catalogCategory) && (!query || searchable.includes(query));
  });

  const historyMovementRows = (() => {
    const projectStockByItem = new Map();
    return [...projectRelevantMovements]
      .sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
        return leftDate - rightDate;
      })
      .map((row) => {
        const itemId = row.item_id;
        const unit = row.item?.unit || "pcs";
        const quantity = Number(row.quantity || 0);
        const currentStock = Number(projectStockByItem.get(itemId) || 0);
        const typeLabel = getMovementHistoryTypeLabel(row);
        const signedDelta = computeProjectMovementDelta(row);
        const nextStock = Math.max(currentStock + signedDelta, 0);
        projectStockByItem.set(itemId, nextStock);

        return {
          id: `mv-${row.id}`,
          rowOrderValue: Number(row.id || 0),
          entryType: "movement",
          rawStatus: row.movement_type || "unknown",
          rawCategory: row.item?.category || "material",
          date: row.created_at,
          dateValue: row.created_at ? new Date(row.created_at).getTime() : 0,
          typeLabel,
          statusLabel: movementStatusLabels[row.movement_type] || "Mouvement enregistré",
          itemLabel: row.item?.name || `Article #${row.item_id}`,
          itemSku: row.item?.sku || "Sans SKU",
          categoryLabel: getStockCategoryLabel(t, row.item?.category || "material"),
          quantityLabel: formatHistoryStockLabel(quantity, unit),
          newStockLabel: formatHistoryStockLabel(nextStock, unit),
          requestProcessingLabel: "Sans objet",
          actorLabel: resolveActorLabel(row, "movement"),
        };
      });
  })();
  const historySupplyRows = projectSupplyRequests.map((row) => {
    const dateSource = row.updated_at || row.created_at;
    const statusLabels = { pending: "En attente", approved: "Approuvée", rejected: "Rejetée", transmitted: "Transmise", fulfilled: "Traitée" };
    const unit = row.item?.unit || "pcs";
    const currentStock = Number(row.item?.available_quantity ?? row.item?.on_hand_quantity ?? 0);
    return {
      id: `sr-${row.id}`,
      rowOrderValue: Number(row.id || 0),
      entryType: "supply_request",
      rawStatus: row.status || "",
      rawCategory: row.item?.category || "material",
      date: dateSource,
      dateValue: dateSource ? new Date(dateSource).getTime() : 0,
      typeLabel: "Demande d'approvisionnement",
      statusLabel: statusLabels[row.status] || row.status || "En attente",
      itemLabel: row.item?.name || `Article #${row.item_id}`,
      itemSku: row.item?.sku || "Sans SKU",
      categoryLabel: getStockCategoryLabel(t, row.item?.category || "material"),
      quantityLabel: formatHistoryStockLabel(row.requested_quantity ?? 0, unit),
      newStockLabel: formatHistoryStockLabel(currentStock, unit),
      requestProcessingLabel: getSupplyRequestProcessingLabel(row.status),
      actorLabel: resolveActorLabel(row, "supply_request"),
    };
  });
  const historyRows = [...historyMovementRows, ...historySupplyRows]
    .filter((row) => {
      if (historyTypeFilter === "entry" && row.typeLabel !== "Entrée") return false;
      if (historyTypeFilter === "exit" && row.typeLabel !== "Sortie") return false;
      if (historyTypeFilter === "supply_request" && row.entryType !== "supply_request") return false;
      const query = normalizeText(historyQuery);
      if (query) {
        const searchable = `${row.typeLabel} ${row.statusLabel} ${row.itemLabel} ${row.categoryLabel} ${row.quantityLabel} ${row.newStockLabel} ${row.requestProcessingLabel} ${row.actorLabel}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (historyStartDate) {
        const minDate = new Date(`${historyStartDate}T00:00:00`).getTime();
        if (Number.isFinite(minDate) && row.dateValue < minDate) return false;
      }
      if (historyEndDate) {
        const maxDate = new Date(`${historyEndDate}T23:59:59`).getTime();
        if (Number.isFinite(maxDate) && row.dateValue > maxDate) return false;
      }
      return true;
    })
    .sort((left, right) => {
      if (right.dateValue !== left.dateValue) {
        return right.dateValue - left.dateValue;
      }
      return Number(right.rowOrderValue || 0) - Number(left.rowOrderValue || 0);
    });

  const updateCategoryDraft = (category, key, value) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: value,
      },
    }));
  };

  const resetCategoryDraft = (category) => {
    setCategoryDrafts((prev) => ({
      ...prev,
      [category]: { sku: "", name: "", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "", initial_quantity: "1" },
    }));
    setCategorySelectedItemIds((prev) => ({ ...prev, [category]: "" }));
  };

  const selectCategoryTemplateItem = (category, itemId) => {
    setCategorySelectedItemIds((prev) => ({ ...prev, [category]: itemId }));
    if (!itemId) {
      resetCategoryDraft(category);
      return;
    }
    const selectedItem = inventoryItems.find((item) => String(item.id) === String(itemId) && item.category === category);
    if (!selectedItem) {
      return;
    }
    setCategoryDrafts((prev) => ({
      ...prev,
      [category]: {
        sku: String(selectedItem.sku || ""),
        name: String(selectedItem.name || ""),
        unit: String(selectedItem.unit || "pcs"),
        min_threshold: String(selectedItem.min_threshold ?? "0"),
        preferred_supplier: String(selectedItem.preferred_supplier || ""),
        notes: String(selectedItem.notes || ""),
        initial_quantity: String(prev?.[category]?.initial_quantity || "1"),
      },
    }));
  };

  const submitCategoryItem = (category, close) => async (event) => {
    event.preventDefault();
    if (!onCreateInventoryItem && !onUpdateInventoryItem) return;
    const draft = categoryDrafts[category] || {};
    const payload = {
      sku: String(draft.sku || "").trim(),
      name: String(draft.name || "").trim(),
      unit: String(draft.unit || "pcs").trim() || "pcs",
      category,
      min_threshold: Number(draft.min_threshold || 0),
      preferred_supplier: String(draft.preferred_supplier || "").trim() || null,
      notes: String(draft.notes || "").trim() || null,
    };

    const selectedItemId = categorySelectedItemIds[category];
    const selectedTemplate = inventoryItems.find((item) => String(item.id) === String(selectedItemId));
    const normalizedSku = String(payload.sku || "").toUpperCase();
    const selectedSku = String(selectedTemplate?.sku || "").toUpperCase();
    const parsedQuantity = Number(draft.initial_quantity);
    const initialQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : 1;
    let targetItemId = selectedTemplate?.id || null;

    // If user picked an existing article and keeps same SKU, update that item instead of trying to create a duplicate SKU.
    if (selectedTemplate && onUpdateInventoryItem && normalizedSku && normalizedSku === selectedSku) {
      await onUpdateInventoryItem(selectedTemplate.id, payload);
    } else if (onCreateInventoryItem) {
      const created = await onCreateInventoryItem(payload);
      targetItemId = created?.id || created?.item?.id || null;
    }

    if (onAddProjectStock && targetItemId) {
      await onAddProjectStock({
        itemId: targetItemId,
        quantity: initialQuantity,
        note: `Ajout ${category} via workspace projet`,
      });
    }

    resetCategoryDraft(category);
    setActiveStockSection("available");
    close();
  };

  const openEditInventoryItemDialog = (item) => {
    setEditingItemId(item.id);
    setEditItemDraft({
      sku: String(item.sku || ""),
      name: String(item.name || ""),
      category: String(item.category || "material"),
      unit: String(item.unit || "pcs"),
      min_threshold: String(item.min_threshold ?? "0"),
      preferred_supplier: String(item.preferred_supplier || ""),
      notes: String(item.notes || ""),
    });
  };

  const submitEditInventoryItem = async (itemId, close) => {
    if (!onUpdateInventoryItem) return;
    setItemActionBusyId(itemId);
    try {
      await onUpdateInventoryItem(itemId, {
        sku: String(editItemDraft.sku || "").trim(),
        name: String(editItemDraft.name || "").trim(),
        category: String(editItemDraft.category || "material"),
        unit: String(editItemDraft.unit || "pcs").trim() || "pcs",
        min_threshold: Number(editItemDraft.min_threshold || 0),
        preferred_supplier: String(editItemDraft.preferred_supplier || "").trim() || null,
        notes: String(editItemDraft.notes || "").trim() || null,
      });
      close();
    } finally {
      setItemActionBusyId(null);
      setEditingItemId(null);
    }
  };

  const submitCreateCatalogItem = async (close) => {
    if (!onCreateInventoryItem) return;
    setItemActionBusyId("catalog-create");
    try {
      await onCreateInventoryItem({
        sku: String(createCatalogDraft.sku || "").trim(),
        name: String(createCatalogDraft.name || "").trim(),
        category: String(createCatalogDraft.category || "material"),
        unit: String(createCatalogDraft.unit || "pcs").trim() || "pcs",
        min_threshold: Number(createCatalogDraft.min_threshold || 0),
        preferred_supplier: String(createCatalogDraft.preferred_supplier || "").trim() || null,
        notes: String(createCatalogDraft.notes || "").trim() || null,
      });
      setCreateCatalogDraft({ sku: "", name: "", category: "material", unit: "pcs", min_threshold: "0", preferred_supplier: "", notes: "" });
      close();
    } finally {
      setItemActionBusyId(null);
    }
  };

  const handleDeleteInventoryItem = async (item) => {
    if (!onDeleteInventoryItem) return;
    const confirmed = window.confirm(`Supprimer l'article ${item.name || item.sku || "sélectionné"} ?`);
    if (!confirmed) return;
    setItemActionBusyId(item.id);
    try {
      await onDeleteInventoryItem(item.id);
    } finally {
      setItemActionBusyId(null);
    }
  };

  const fetchImageAsDataUrl = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSupplyRequestDecision = async (requestId, status) => {
    if (!onUpdateSupplyRequest) return;
    setUpdatingSupplyRequestId(requestId);
    try {
      await onUpdateSupplyRequest(requestId, { status });
      setRequestsQuery("");
      setHistoryQuery("");
      setHistoryTypeFilter("all");
      setHistoryStartDate("");
      setHistoryEndDate("");
    } finally {
      setUpdatingSupplyRequestId(null);
    }
  };

  const getSupplyRequestEditDraft = (requestRow) => {
    return supplyRequestEditDrafts[requestRow.id] || {
      status: requestRow.status || "pending",
      transmitted_to_user_id: requestRow.transmitted_to_user_id ? String(requestRow.transmitted_to_user_id) : "",
      notes: requestRow.notes || "",
    };
  };

  const updateSupplyRequestEditDraft = (requestRow, key, value) => {
    setSupplyRequestEditDrafts((prev) => {
      const current = prev[requestRow.id] || {
        status: requestRow.status || "pending",
        transmitted_to_user_id: requestRow.transmitted_to_user_id ? String(requestRow.transmitted_to_user_id) : "",
        notes: requestRow.notes || "",
      };
      return {
        ...prev,
        [requestRow.id]: {
          ...current,
          [key]: value,
        },
      };
    });
  };

  const submitSupplyRequestEdit = async (requestRow, close) => {
    if (!onUpdateSupplyRequest) return;
    const draft = getSupplyRequestEditDraft(requestRow);
    setUpdatingSupplyRequestId(requestRow.id);
    try {
      await onUpdateSupplyRequest(requestRow.id, {
        status: draft.status,
        transmitted_to_user_id: draft.transmitted_to_user_id ? Number(draft.transmitted_to_user_id) : null,
        notes: String(draft.notes || "").trim() || null,
      });
      setSupplyRequestEditDrafts((prev) => {
        const next = { ...prev };
        delete next[requestRow.id];
        return next;
      });
      setRequestsQuery("");
      setHistoryQuery("");
      setHistoryTypeFilter("all");
      setHistoryStartDate("");
      setHistoryEndDate("");
      close();
    } finally {
      setUpdatingSupplyRequestId(null);
    }
  };

  const exportHistoryPdf = async () => {
    if (!historyRows.length) return;
    setIsExportingHistoryPdf(true);
    try {
      const documentTitle = `Historique stock - ${workspace?.project?.code || workspace?.project?.name || "Projet"}`;
      const generatedAt = new Date();
      const pdf = new jsPDF({ unit: "pt", format: "a4" });

      pdf.setFontSize(14);
      pdf.setTextColor(15, 23, 42);
      pdf.text(documentTitle, 40, 42);

      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Généré le ${generatedAt.toLocaleString("fr-FR")}`, 40, 58);
      pdf.text(`Période: ${historyStartDate || "début"} au ${historyEndDate || "maintenant"}`, 40, 72);

      try {
        const companyLogo = await fetchImageAsDataUrl("/favicon.svg");
        pdf.addImage(companyLogo, "PNG", 480, 28, 28, 28);
      } catch {
        // Optional logo fallback
      }

      const qrPayload = JSON.stringify({
        module: "stock_history",
        project_id: workspace?.project?.id,
        project_code: workspace?.project?.code,
        from: historyStartDate || null,
        to: historyEndDate || null,
        generated_at: generatedAt.toISOString(),
        rows: historyRows.length,
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 140 });
      pdf.addImage(qrCodeDataUrl, "PNG", 525, 740, 42, 42);

      autoTable(pdf, {
        startY: 90,
        head: [["Date (hh:mm:ss)", "Type", "Statut", "Article", "Catégorie", "Qté", "Acteur", "Nouveau stock", "Statut demande"]],
        body: historyRows.map((row) => ([
          formatDateTimeFull(row.date),
          row.typeLabel,
          row.statusLabel,
          row.itemLabel,
          row.categoryLabel,
          row.quantityLabel,
          row.actorLabel,
          row.newStockLabel,
          row.requestProcessingLabel,
        ])),
        styles: { fontSize: 8.5, cellPadding: 4, textColor: [30, 41, 59] },
        headStyles: { fillColor: [15, 23, 42], textColor: [248, 250, 252] },
        margin: { left: 32, right: 32 },
      });

      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text("Document généré par T-ERP", 40, 810);
        pdf.text("[T-ERP]", 155, 810);
      }

      const safeCode = (workspace?.project?.code || "projet").replace(/[^a-zA-Z0-9_-]+/g, "-");
      pdf.save(`historique-stock-${safeCode}.pdf`);
    } finally {
      setIsExportingHistoryPdf(false);
    }
  };

  const stockSectionTabs = [
    { id: "available", label: "Stock disponible", Icon: Package },
    { id: "requests", label: "Demandes d'approvisionnement", Icon: ShoppingCart },
    { id: "catalog", label: "Liste des articles", Icon: FolderOpen },
    { id: "history", label: "Historique détaillé", Icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label={t("pages.projects.allocations")} value={Math.round(allocationsCount)} tone="text-slate-900" />
        <MetricCard label={t("pages.projects.equipment")} value={Math.round(equipmentQuantity)} tone="text-slate-900" />
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.projects.criticalItems")}</p>
          {criticalItems.length ? (
            <ul className="mt-2 space-y-1.5">
              {criticalItems.slice(0, 3).map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-amber-900">{item.name}</span>
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {formatStockQuantity(item.allocated_quantity)} {item.unit || "pcs"}
                  </span>
                </li>
              ))}
              {criticalItems.length > 3 ? <li className="text-xs text-slate-500">+{criticalItems.length - 3} autres</li> : null}
            </ul>
          ) : (
            <p className={cn("mt-2 text-2xl font-semibold", totalCritical > 0 ? "text-amber-700" : "text-emerald-700")}>{totalCritical > 0 ? totalCritical : t("common.noData")}</p>
          )}
        </div>
      </div>

      {/* Action toolbar */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {categoryMeta.map((meta) => {
          const catColors = {
            material: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
            equipment: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
            consumable: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
          };
          const MetaIcon = meta.icon;
          return (
            <div key={meta.key} className="w-full">
              <ProjectActionDialog
                triggerLabel={`Ajouter ${meta.singular}`}
                title={`Ajouter ${meta.singular}`}
                description={`Création rapide d'un ${meta.singular} dans la catégorie ${meta.label.toLowerCase()}.`}
                closeLabel={t("common.close")}
                compact={false}
                triggerContent={<><MetaIcon className="h-4 w-4" />{`Ajouter ${meta.singular}`}</>}
                triggerClassName={`h-10 w-full justify-center rounded-xl border px-3 text-sm font-semibold flex items-center gap-2 ${catColors[meta.key]}`}
              >
                {({ close }) => (
                  <form className="grid gap-3" onSubmit={submitCategoryItem(meta.key, close)}>
                    <fieldset disabled={!canCreateStockItem || savingInventoryItem} className="grid gap-3 disabled:cursor-not-allowed disabled:opacity-70">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Article *</label>
                      <select
                        required
                        value={categorySelectedItemIds[meta.key] || ""}
                        onChange={(event) => selectCategoryTemplateItem(meta.key, event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                      >
                        <option value="">— Choisir un article —</option>
                        {(categoryItemsByKey[meta.key] || []).map((item) => (
                          <option key={`template-${meta.key}-${item.id}`} value={item.id}>{item.name} ({item.sku || "sans-sku"})</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input required placeholder="SKU" value={categoryDrafts[meta.key]?.sku || ""} onChange={(event) => updateCategoryDraft(meta.key, "sku", event.target.value)} />
                      <Input required placeholder="Nom" value={categoryDrafts[meta.key]?.name || ""} onChange={(event) => updateCategoryDraft(meta.key, "name", event.target.value)} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input placeholder="Unité" value={categoryDrafts[meta.key]?.unit || "pcs"} onChange={(event) => updateCategoryDraft(meta.key, "unit", event.target.value)} />
                      <Input type="number" placeholder="Seuil mini" value={categoryDrafts[meta.key]?.min_threshold || "0"} onChange={(event) => updateCategoryDraft(meta.key, "min_threshold", event.target.value)} />
                    </div>
                    <Input
                      required
                      type="number"
                      min="1"
                      placeholder="Quantité à ajouter au stock projet"
                      value={categoryDrafts[meta.key]?.initial_quantity || "1"}
                      onChange={(event) => updateCategoryDraft(meta.key, "initial_quantity", event.target.value)}
                    />
                    <Input placeholder="Fournisseur" value={categoryDrafts[meta.key]?.preferred_supplier || ""} onChange={(event) => updateCategoryDraft(meta.key, "preferred_supplier", event.target.value)} />
                    <Textarea rows={2} placeholder="Notes" value={categoryDrafts[meta.key]?.notes || ""} onChange={(event) => updateCategoryDraft(meta.key, "notes", event.target.value)} />
                    <Button type="submit" disabled={!canCreateStockItem || savingInventoryItem}>Ajouter</Button>
                    </fieldset>
                  </form>
                )}
              </ProjectActionDialog>
            </div>
          );
        })}
        <div className="w-full">
          <ProjectActionDialog
            triggerLabel="Demande d'approvisionnement"
            title="Demande d'approvisionnement"
            description="Créez une demande pour réapprovisionner un article du projet."
            closeLabel="Annuler"
            compact={false}
            triggerContent={<><ShoppingCart className="h-4 w-4" />Demande d&apos;approvisionnement</>}
            triggerClassName="h-10 w-full justify-center rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100 flex items-center gap-2"
          >
            {({ close }) => (
              <form
              className="grid gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!onSubmitSupplyRequest) return;
                setSavingSupplyRequest(true);
                setSupplyRequestError("");
                try {
                  const parsedRequestedQuantity = Number(supplyDraft.requested_quantity);
                  const safeRequestedQuantity = Number.isFinite(parsedRequestedQuantity) && parsedRequestedQuantity > 0
                    ? parsedRequestedQuantity
                    : 1;
                  await onSubmitSupplyRequest({
                    item_id: Number(supplyDraft.item_id),
                    requested_quantity: safeRequestedQuantity,
                    urgency: supplyDraft.urgency,
                    assignee_user_id: supplyDraft.assignee_user_id ? Number(supplyDraft.assignee_user_id) : null,
                    reason: supplyDraft.reason,
                  });
                  setSupplyDraft({ item_id: "", requested_quantity: "1", urgency: "normal", assignee_user_id: "", reason: "" });
                  setRequestsQuery("");
                  setHistoryQuery("");
                  setHistoryTypeFilter("all");
                  setHistoryStartDate("");
                  setHistoryEndDate("");
                  setActiveStockSection("requests");
                  close();
                } catch (error) {
                  const message = error?.response?.data?.message || error?.message || "Impossible d'envoyer la demande pour le moment.";
                  setSupplyRequestError(message);
                } finally {
                  setSavingSupplyRequest(false);
                }
              }}
              >
                <fieldset disabled={savingSupplyRequest} className="grid gap-3 disabled:opacity-70">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Article *</label>
                  <select
                    required
                    value={supplyDraft.item_id}
                    onChange={(e) => {
                      setSupplyRequestError("");
                      setSupplyDraft((p) => ({ ...p, item_id: e.target.value }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">— Choisir un article —</option>
                    {allocatedItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit || "pcs"})</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Quantité *</label>
                    <Input
                      required
                      type="number"
                      min="1"
                      value={supplyDraft.requested_quantity}
                      onChange={(e) => {
                        setSupplyRequestError("");
                        setSupplyDraft((p) => ({ ...p, requested_quantity: e.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Urgence</label>
                    <select
                      value={supplyDraft.urgency}
                      onChange={(e) => setSupplyDraft((p) => ({ ...p, urgency: e.target.value }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      <option value="low">Faible</option>
                      <option value="normal">Normal</option>
                      <option value="high">Élevée</option>
                      <option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Transmettre à</label>
                  <select
                    value={supplyDraft.assignee_user_id}
                    onChange={(e) => {
                      setSupplyRequestError("");
                      setSupplyDraft((p) => ({ ...p, assignee_user_id: e.target.value }));
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    <option value="">— Supérieur hiérarchique (optionnel) —</option>
                    {collaborators
                      .filter((u) => projectTeam.some((a) => a.user_id === u.id) || u.job_title?.toLowerCase().includes("directeur") || u.job_title?.toLowerCase().includes("daf") || u.job_title?.toLowerCase().includes("dg"))
                      .map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}{u.job_title ? ` — ${u.job_title}` : ""}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Motif / Justification</label>
                  <Textarea
                    rows={2}
                    placeholder="Expliquer la raison de la demande..."
                    value={supplyDraft.reason}
                    onChange={(e) => {
                      setSupplyRequestError("");
                      setSupplyDraft((p) => ({ ...p, reason: e.target.value }));
                    }}
                  />
                </div>
                {supplyRequestError ? <p className="text-sm text-rose-600">{supplyRequestError}</p> : null}
                <Button type="submit" disabled={savingSupplyRequest || !supplyDraft.item_id}>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer la demande
                </Button>
                </fieldset>
              </form>
            )}
          </ProjectActionDialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto border-b border-slate-200 [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
          <div className="grid min-w-[760px] grid-cols-4 items-stretch">
            {stockSectionTabs.map(({ id, label, Icon }) => {
              const isActive = activeStockSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveStockSection(id)}
                  className={cn(
                    "relative flex w-full items-center justify-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isActive ? "text-primary" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {isActive ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-sm bg-primary" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeStockSection === "available" ? (
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow="Stock"
            title="Stock disponible"
            meta={<Badge variant="info">{stockAvailableRows.length}</Badge>}
          />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),220px,auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={stockAvailableQuery}
                onChange={(event) => setStockAvailableQuery(event.target.value)}
                className="pl-9"
                placeholder="Rechercher par article, SKU, unité..."
              />
            </div>
            <select
              value={stockAvailableCategory}
              onChange={(event) => setStockAvailableCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {categoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Article</th>
                  <th className="px-3 py-2 font-semibold">SKU</th>
                  <th className="px-3 py-2 font-semibold">Catégorie</th>
                  <th className="px-3 py-2 font-semibold">Stock courant</th>
                  <th className="px-3 py-2 font-semibold">Total alloué</th>
                  <th className="px-3 py-2 font-semibold">Seuil critique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockAvailableRows.length ? stockAvailableRows.map((item) => (
                  <tr key={`available-${item.id}`}>
                    <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                    <td className="px-3 py-2 text-slate-600">{item.sku || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{getStockCategoryLabel(t, item.category)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{formatStockQuantity(item.project_available_quantity)} {item.unit || "pcs"}</td>
                    <td className="px-3 py-2 text-slate-600">{formatStockQuantity(item.allocated_quantity)} {item.unit || "pcs"}</td>
                    <td className="px-3 py-2 text-slate-600">{formatStockQuantity(item.min_threshold)} {item.unit || "pcs"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-500">Aucun article disponible avec ce filtre.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspacePanel>
      ) : null}

      {activeStockSection === "requests" ? (
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow="Approvisionnement"
            title="Demandes d'approvisionnement en cours"
            meta={<Badge variant={supplyRequestsInProgressRows.length ? "warning" : "neutral"}>{supplyRequestsInProgressRows.length}</Badge>}
          />
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={requestsQuery}
              onChange={(event) => setRequestsQuery(event.target.value)}
              className="pl-9"
              placeholder="Rechercher par article, statut, demandeur..."
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-[780px] w-full text-sm">
              <thead className="bg-slate-100/90 dark:bg-slate-900/80">
                <tr>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Date</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Article</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Qté</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Urgence</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Statut</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Demandeur</th>
                  <th className="px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Assigné</th>
                  {canManageSupplyRequests ? <th className="px-4 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300 whitespace-nowrap">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/60">
                {loadingSupplyRequests ? (
                  <tr>
                    <td colSpan={canManageSupplyRequests ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <svg className="h-4 w-4 animate-spin text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Chargement depuis la base de données…
                      </span>
                    </td>
                  </tr>
                ) : supplyRequestsInProgressRows.length ? supplyRequestsInProgressRows.map((req) => {
                  const statusLabels = { pending: "En attente", approved: "Approuvée", transmitted: "Transmise" };
                  const urgencyLabels = { low: "Faible", normal: "Normal", high: "Élevée", urgent: "Urgente" };
                  const statusVariant = req.status === "approved" ? "info" : req.status === "transmitted" ? "neutral" : "warning";
                  const rowBusy = updatingSupplyRequestId === req.id;
                  const editDraft = getSupplyRequestEditDraft(req);
                  return (
                    <tr key={`running-request-${req.id}`} className="transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">{formatDateTimeFull(req.created_at)}</td>
                      <td className="px-4 py-4 align-top text-sm font-medium text-slate-900 dark:text-white">{req.item?.name || `#${req.item_id}`}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">{req.requested_quantity} {req.item?.unit || "pcs"}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">{urgencyLabels[req.urgency] || req.urgency}</td>
                      <td className="px-4 py-4 align-top"><Badge variant={statusVariant}>{statusLabels[req.status] || req.status}</Badge></td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">{req.requester?.full_name || "-"}</td>
                      <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-200">{req.assignee?.full_name || "-"}</td>
                      {canManageSupplyRequests ? (
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center justify-end gap-2">
                            <ProjectActionDialog
                              triggerLabel="Modifier"
                              title="Modifier la demande"
                              description="Ajustez le statut, la transmission ou la note de cette demande."
                              closeLabel="Fermer"
                              compact={false}
                              triggerContent={<Pencil className="h-4 w-4" />}
                              triggerClassName="h-8 w-8 rounded-md border border-slate-200 bg-white p-0 text-slate-700 hover:bg-slate-50"
                            >
                              {({ close }) => (
                                <form
                                  className="grid gap-3"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    await submitSupplyRequestEdit(req, close);
                                  }}
                                >
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Statut</label>
                                    <select
                                      value={editDraft.status}
                                      onChange={(event) => updateSupplyRequestEditDraft(req, "status", event.target.value)}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                                    >
                                      <option value="pending">En attente</option>
                                      <option value="approved">Approuvée</option>
                                      <option value="transmitted">Transmise</option>
                                      <option value="fulfilled">Traitée</option>
                                      <option value="rejected">Rejetée</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Transmettre à</label>
                                    <select
                                      value={editDraft.transmitted_to_user_id}
                                      onChange={(event) => updateSupplyRequestEditDraft(req, "transmitted_to_user_id", event.target.value)}
                                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                                    >
                                      <option value="">— Aucun —</option>
                                      {collaborators
                                        .filter((u) => projectTeam.some((a) => a.user_id === u.id) || u.job_title?.toLowerCase().includes("directeur") || u.job_title?.toLowerCase().includes("daf") || u.job_title?.toLowerCase().includes("dg"))
                                        .map((u) => (
                                          <option key={`tx-${req.id}-${u.id}`} value={u.id}>{u.full_name}{u.job_title ? ` — ${u.job_title}` : ""}</option>
                                        ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">Note</label>
                                    <Textarea
                                      rows={2}
                                      value={editDraft.notes}
                                      onChange={(event) => updateSupplyRequestEditDraft(req, "notes", event.target.value)}
                                      placeholder="Commentaire de traitement"
                                    />
                                  </div>
                                  <Button type="submit" disabled={rowBusy}>Enregistrer</Button>
                                </form>
                              )}
                            </ProjectActionDialog>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                              title="Approuver"
                              disabled={rowBusy}
                              onClick={() => handleSupplyRequestDecision(req.id, "approved")}
                            >
                              <span className="text-base font-bold leading-none">✓</span>
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                              title="Rejeter"
                              disabled={rowBusy}
                              onClick={() => handleSupplyRequestDecision(req.id, "rejected")}
                            >
                              <span className="text-base font-bold leading-none">✕</span>
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={canManageSupplyRequests ? 8 : 7} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Aucune demande en cours.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspacePanel>
      ) : null}

      {activeStockSection === "catalog" ? (
        <WorkspacePanel className="space-y-4">
          <SectionHeader
            eyebrow="Catalogue"
            title="Liste des articles"
            meta={<Badge variant="neutral">{inventoryCatalogRows.length}</Badge>}
          />
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                className="pl-9"
                placeholder="Rechercher un article..."
              />
            </div>
            <select
              value={catalogCategory}
              onChange={(event) => setCatalogCategory(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {categoryFilterOptions.map((option) => (
                <option key={`catalog-${option.value}`} value={option.value}>{option.label}</option>
              ))}
            </select>
            {canCreateStockItem && onCreateInventoryItem ? (
              <ProjectActionDialog
                triggerLabel="Ajouter un article"
                title="Ajouter un article"
                description="Créez un nouvel article dans le catalogue du projet."
                closeLabel="Fermer"
                compact={false}
                triggerContent={<><Plus className="h-4 w-4" />Ajouter un article</>}
                triggerClassName="h-10 w-full md:w-auto justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 flex items-center gap-2"
              >
                {({ close }) => (
                  <form
                    className="grid gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await submitCreateCatalogItem(close);
                    }}
                  >
                    <fieldset disabled={itemActionBusyId === "catalog-create" || savingInventoryItem} className="grid gap-3 disabled:opacity-70">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          required
                          placeholder="SKU"
                          value={createCatalogDraft.sku}
                          onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, sku: event.target.value }))}
                        />
                        <Input
                          required
                          placeholder="Nom"
                          value={createCatalogDraft.name}
                          onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, name: event.target.value }))}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <select
                          value={createCatalogDraft.category}
                          onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, category: event.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                        >
                          {categoryMeta.map((meta) => <option key={`create-${meta.key}`} value={meta.key}>{meta.label}</option>)}
                        </select>
                        <Input
                          placeholder="Unité"
                          value={createCatalogDraft.unit}
                          onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, unit: event.target.value }))}
                        />
                      </div>
                      <Input
                        type="number"
                        placeholder="Seuil critique"
                        value={createCatalogDraft.min_threshold}
                        onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, min_threshold: event.target.value }))}
                      />
                      <Input
                        placeholder="Fournisseur"
                        value={createCatalogDraft.preferred_supplier}
                        onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, preferred_supplier: event.target.value }))}
                      />
                      <Textarea
                        rows={2}
                        placeholder="Notes"
                        value={createCatalogDraft.notes}
                        onChange={(event) => setCreateCatalogDraft((prev) => ({ ...prev, notes: event.target.value }))}
                      />
                      <Button type="submit" disabled={itemActionBusyId === "catalog-create" || savingInventoryItem}>Ajouter</Button>
                    </fieldset>
                  </form>
                )}
              </ProjectActionDialog>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Article</th>
                  <th className="px-3 py-2 font-semibold">SKU</th>
                  <th className="px-3 py-2 font-semibold">Catégorie</th>
                  <th className="px-3 py-2 font-semibold">Unité</th>
                  <th className="px-3 py-2 font-semibold">Seuil critique</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryCatalogRows.length ? inventoryCatalogRows.map((item) => (
                  <tr key={`catalog-${item.id}`}>
                    <td className="px-3 py-2 font-medium text-slate-900">{item.name}</td>
                    <td className="px-3 py-2 text-slate-600">{item.sku || "-"}</td>
                    <td className="px-3 py-2 text-slate-600">{getStockCategoryLabel(t, item.category)}</td>
                    <td className="px-3 py-2 text-slate-600">{item.unit || "pcs"}</td>
                    <td className="px-3 py-2 text-slate-600">{Number(item.min_threshold || 0)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ProjectActionDialog
                          triggerLabel="Modifier"
                          title="Modifier l'article"
                          description="Mettez à jour les informations de l'article."
                          closeLabel="Fermer"
                          compact
                          triggerContent={<Pencil className="h-4 w-4" />}
                          triggerClassName="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        >
                          {({ close }) => (
                            <form
                              className="grid gap-3"
                              onSubmit={async (event) => {
                                event.preventDefault();
                                await submitEditInventoryItem(item.id, close);
                              }}
                            >
                              <fieldset disabled={itemActionBusyId === item.id} className="grid gap-3 disabled:opacity-70">
                                {editingItemId !== item.id ? openEditInventoryItemDialog(item) : null}
                                <div className="grid gap-3 md:grid-cols-2">
                                  <Input required placeholder="SKU" value={editItemDraft.sku} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, sku: event.target.value }))} />
                                  <Input required placeholder="Nom" value={editItemDraft.name} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, name: event.target.value }))} />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <select value={editItemDraft.category} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, category: event.target.value }))} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                    {categoryMeta.map((meta) => <option key={`edit-${meta.key}`} value={meta.key}>{meta.label}</option>)}
                                  </select>
                                  <Input placeholder="Unité" value={editItemDraft.unit} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, unit: event.target.value }))} />
                                </div>
                                <Input type="number" placeholder="Seuil critique" value={editItemDraft.min_threshold} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, min_threshold: event.target.value }))} />
                                <Input placeholder="Fournisseur" value={editItemDraft.preferred_supplier} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, preferred_supplier: event.target.value }))} />
                                <Textarea rows={2} placeholder="Notes" value={editItemDraft.notes} onChange={(event) => setEditItemDraft((prev) => ({ ...prev, notes: event.target.value }))} />
                                <Button type="submit" disabled={itemActionBusyId === item.id}>Enregistrer</Button>
                              </fieldset>
                            </form>
                          )}
                        </ProjectActionDialog>
                        <Button
                          type="button"
                          onClick={() => handleDeleteInventoryItem(item)}
                          disabled={itemActionBusyId === item.id}
                          className="h-8 rounded-lg border border-rose-200 bg-rose-50 px-2 text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-sm text-slate-500">Aucun article trouvé.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </WorkspacePanel>
      ) : null}

      {activeStockSection === "history" ? (
        <WorkspacePanel className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              eyebrow="Historique"
              title="Historique détaillé"
              meta={<Badge variant="neutral">{historyRows.length}</Badge>}
            />
            <Button type="button" disabled={!historyRows.length || isExportingHistoryPdf} onClick={exportHistoryPdf} className="h-9 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" />
              {isExportingHistoryPdf ? "Export..." : "Télécharger PDF"}
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_280px_minmax(360px,0.95fr)] xl:items-end">
              <label className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recherche</span>
                <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  className="border-slate-200 bg-white pl-9"
                  placeholder="Rechercher événement, statut, article..."
                />
                </div>
              </label>
              <label className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Type</span>
                <select value={historyTypeFilter} onChange={(event) => setHistoryTypeFilter(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <option value="all">Tout</option>
                  <option value="entry">Entrée</option>
                  <option value="exit">Sortie</option>
                  <option value="supply_request">Demande d'approvisionnement</option>
                </select>
              </label>
              <div className="grid gap-1.5">
                <span className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Période</span>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr]">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">De</span>
                    <Input type="date" value={historyStartDate} onChange={(event) => setHistoryStartDate(event.target.value)} className="border-slate-200 bg-white shadow-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">À</span>
                    <Input type="date" value={historyEndDate} onChange={(event) => setHistoryEndDate(event.target.value)} className="border-slate-200 bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full min-w-[1320px] table-fixed text-sm">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[24%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[11%]" />
                  <col className="w-[8%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-100/95 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 backdrop-blur">
                <tr>
                  <th className="px-5 py-3.5">Date / Heure</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Statut</th>
                  <th className="px-5 py-3.5">Article</th>
                  <th className="px-5 py-3.5">Catégorie</th>
                  <th className="px-5 py-3.5">Qté</th>
                  <th className="px-5 py-3.5">Acteur</th>
                  <th className="px-5 py-3.5">Nouveau stock</th>
                  <th className="px-5 py-3.5">Statut demande</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                {historyRows.length ? historyRows.map((row) => (
                  <tr key={`history-${row.id}`} className="align-top transition-colors hover:bg-sky-50/40">
                    <td className="px-5 py-4 align-top">
                      <div>
                        <p className="font-medium text-slate-900">{formatHistoryDateParts(row.date).date}</p>
                        <p className="text-xs text-slate-500">{formatHistoryDateParts(row.date).time}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getHistoryTypeBadgeVariant(row.typeLabel)}>{row.typeLabel}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getHistoryStatusBadgeVariant(row)}>{row.statusLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div>
                        <p className="font-semibold text-slate-900">{row.itemLabel}</p>
                        <p className="text-xs text-slate-500">SKU: {row.itemSku || "-"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={getHistoryCategoryBadgeVariant(row.rawCategory)}>{row.categoryLabel}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-slate-900 break-words">{row.quantityLabel}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-slate-700 break-words">{row.actorLabel}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-slate-900 break-words">{row.newStockLabel}</p>
                    </td>
                    <td className="px-5 py-4">
                      {row.entryType === "supply_request" ? (
                        <Badge variant={getSupplyRequestProcessingVariant(row.rawStatus)}>{row.requestProcessingLabel}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">Aucune entrée dans cette plage.</td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </WorkspacePanel>
      ) : null}

    </div>
  );
}

function StaffProjectsPanel({ t, staffItems, selectedProject, projectOptions = [], canManageProjects, onAssignProjects }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(6);
  const [editingUserId, setEditingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [assignForm, setAssignForm] = useState({
    project_ids: [],
    existing_project_ids: [],
    project_role: "chef_projet",
    assignment_mode: "immediate",
    start_date: "",
    end_date: "",
    responsibility: "",
  });

  const collectAssignments = (member) => {
    const assignments = member.project_assignments?.length
      ? [...member.project_assignments]
      : [];

    if (member.selected_project_assignment && !assignments.some((assignment) => assignment.id === member.selected_project_assignment.id)) {
      assignments.push(member.selected_project_assignment);
    }

    return assignments;
  };

  const isDirectorOrHRLocal = (member) => {
    const title = (member.job_title || "").toLowerCase();
    const dept = (member.department || "").toLowerCase();
    return (
      title.startsWith("directeur") ||
      title.startsWith("president") ||
      dept === "ressources humaines" ||
      title === "responsable rh" ||
      title === "rh / recruteur"
    );
  };

  const normalizedQuery = query.trim().toLowerCase();
  const workerStaff = staffItems.filter((member) => !isDirectorOrHRLocal(member));
  const unassignedCount = workerStaff.filter((member) => collectAssignments(member).length === 0).length;
  const filteredItems = workerStaff.filter((member) => {
    if (!normalizedQuery) {
      return true;
    }

    const assignmentsText = collectAssignments(member)
      .map((assignment) => `${assignment.project_code || ""} ${assignment.project_name || ""} ${assignment.project_role || ""}`)
      .join(" ");
    const haystack = `${member.full_name || ""} ${member.email || ""} ${member.job_title || ""} ${member.department || ""} ${assignmentsText}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const sortedItems = [...filteredItems].sort((left, right) =>
    String(left.full_name || getCollaboratorLabel(left)).localeCompare(String(right.full_name || getCollaboratorLabel(right)), "fr", { sensitivity: "base" })
  );
  const visibleItems = sortedItems.slice(0, shown);
  const hasMore = sortedItems.length > visibleItems.length;
  const remaining = sortedItems.length - visibleItems.length;

  const editableProjects = projectOptions
    .filter((project) => project?.id)
    .sort((left, right) => String(left.code || left.name || "").localeCompare(String(right.code || right.name || ""), "fr", { sensitivity: "base" }));

  const openEditor = (member) => {
    const assignments = collectAssignments(member);
    const memberProjectIds = Array.from(
      new Set(
        assignments
          .map((assignment) => Number(assignment.project_id || assignment.id))
          .filter((value) => Number.isFinite(value))
      )
    );

    setFeedback("");
    setEditingUserId(member.id);
    setAssignForm({
      project_ids: memberProjectIds.map((value) => String(value)),
      existing_project_ids: memberProjectIds.map((value) => String(value)),
      project_role: assignments[0]?.project_role || "chef_projet",
      assignment_mode: "immediate",
      start_date: assignments[0]?.start_date || "",
      end_date: assignments[0]?.end_date || "",
      responsibility: assignments[0]?.responsibility || "",
    });
  };

  const toggleProjectSelection = (projectId) => {
    setAssignForm((prev) => {
      const exists = prev.project_ids.includes(projectId);
      return {
        ...prev,
        project_ids: exists ? prev.project_ids.filter((value) => value !== projectId) : [...prev.project_ids, projectId],
      };
    });
  };

  const submitAssignmentUpdate = async (userId) => {
    if (!onAssignProjects) {
      return;
    }

    if (!assignForm.project_ids.length) {
      setFeedback("Selectionnez au moins un projet.");
      return;
    }

    try {
      setSavingUserId(userId);
      setFeedback("");
      await onAssignProjects({
        userId,
        projectIds: assignForm.project_ids,
        existingProjectIds: assignForm.existing_project_ids,
        projectRole: assignForm.project_role,
        assignmentMode: assignForm.assignment_mode,
        startDate: assignForm.start_date,
        endDate: assignForm.end_date,
        responsibility: assignForm.responsibility,
      });
      setEditingUserId(null);
      setFeedback("Affectations enregistrees.");
    } catch (error) {
      setFeedback(error?.message || "Impossible de mettre a jour les affectations.");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <Card id="project-staff" className="space-y-4">
      <SectionHeader
        eyebrow={t("pages.projects.teamEyebrow")}
        title={t("pages.projects.staffProjectsTitle")}
        description={t("pages.projects.staffProjectsHint")}
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{t("pages.projects.totalStaff")}: {workerStaff.length}</Badge>
            <Badge variant={unassignedCount ? "warning" : "success"}>{t("pages.projects.notAssigned")}: {unassignedCount}</Badge>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-sm"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShown(6);
          }}
          placeholder={t("common.search")}
        />
      </div>

      {feedback ? <p className="text-sm text-slate-600">{feedback}</p> : null}

      {!visibleItems.length ? (
        <p className="text-sm text-slate-600">{t("common.noData")}</p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((member) => {
            const assignments = collectAssignments(member);
            return (
              <div key={member.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{member.full_name || getCollaboratorLabel(member)}</p>
                    <p className="text-sm text-slate-600">{member.job_title || member.department || "--"}</p>
                  </div>
                  {canManageProjects && onAssignProjects ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => openEditor(member)}>
                      {editingUserId === member.id ? "Fermer" : "Modifier"}
                    </Button>
                  ) : null}
                </div>

                {!assignments.length ? (
                  <p className="mt-2 text-sm text-slate-500">{t("pages.projects.notAssigned")}</p>
                ) : (
                  <ul className="mt-3 space-y-1.5">
                    {assignments.map((assignment) => (
                      <li key={assignment.id || `${member.id}-${assignment.project_id || assignment.project_code || assignment.project_name || "project"}`} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {assignment.project_code || `#${assignment.project_id || "--"}`}
                        </span>
                        <span className="font-medium text-slate-700">{assignment.project_name || "--"}</span>
                        <span>-</span>
                        <span>{humanizeToken(assignment.project_role || "") || "--"}</span>
                        {assignment.start_date ? <span>- {formatProjectDate(assignment.start_date, undefined, true)}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}

                {editingUserId === member.id && canManageProjects && onAssignProjects ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {editableProjects.map((project) => {
                        const value = String(project.id);
                        const checked = assignForm.project_ids.includes(value);
                        return (
                          <label key={project.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white")}>
                            <input type="checkbox" checked={checked} onChange={() => toggleProjectSelection(value)} />
                            <span className="font-medium text-slate-700">{project.code || `#${project.id}`} - {project.name}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assignForm.project_role} onChange={(event) => setAssignForm((prev) => ({ ...prev, project_role: event.target.value }))}>
                        <option value="chef_projet">Chef projet</option>
                        <option value="assistant">Assistant</option>
                        <option value="conducteur_travaux">Conducteur travaux</option>
                        <option value="ouvrier">Ouvrier</option>
                      </select>
                      <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={assignForm.assignment_mode} onChange={(event) => setAssignForm((prev) => ({ ...prev, assignment_mode: event.target.value }))}>
                        <option value="immediate">Immediate</option>
                        <option value="planned">Planifiee</option>
                      </select>
                      <Input type="date" value={assignForm.start_date} onChange={(event) => setAssignForm((prev) => ({ ...prev, start_date: event.target.value }))} />
                      <Input type="date" value={assignForm.end_date} onChange={(event) => setAssignForm((prev) => ({ ...prev, end_date: event.target.value }))} />
                    </div>

                    <Textarea
                      rows={2}
                      placeholder="Responsabilite / commentaire"
                      value={assignForm.responsibility}
                      onChange={(event) => setAssignForm((prev) => ({ ...prev, responsibility: event.target.value }))}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setEditingUserId(null)}>Annuler</Button>
                      <Button type="button" onClick={() => submitAssignmentUpdate(member.id)} disabled={savingUserId === member.id}>
                        {savingUserId === member.id ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {hasMore ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShown((prev) => prev + 6)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600 transition hover:text-sky-800"
              >
                Voir plus ({remaining} de plus)
              </button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

function ProjectPerformancePanel({ t, projects }) {
  const rows = useMemo(() => (
    projects
      .map((project) => ({
        ...project,
        performance: getProjectPerformance(project),
      }))
      .sort((a, b) => b.performance.globalScore - a.performance.globalScore)
      .slice(0, 3)
  ), [projects]);

  const rankStyles = [
    {
      fill: "url(#performanceTopOne)",
      card: "border-emerald-200 bg-emerald-50/80",
      pill: "bg-emerald-600 text-white",
      text: "text-emerald-700",
    },
    {
      fill: "url(#performanceTopTwo)",
      card: "border-sky-200 bg-sky-50/80",
      pill: "bg-sky-600 text-white",
      text: "text-sky-700",
    },
    {
      fill: "url(#performanceTopThree)",
      card: "border-amber-200 bg-amber-50/80",
      pill: "bg-amber-500 text-white",
      text: "text-amber-700",
    },
  ];

  const metrics = [
    { key: "budgetScore", label: t("pages.projects.financialObjective"), bar: "bg-emerald-500", text: "text-emerald-700" },
    { key: "timeScore", label: t("pages.projects.timeObjective"), bar: "bg-sky-500", text: "text-sky-700" },
    { key: "executionScore", label: t("pages.projects.executionObjective"), bar: "bg-amber-500", text: "text-amber-700" },
  ];

  const chartRows = rows.map((project, index) => {
    const compactCode = String(project.code || "").split("-").slice(-3).join("-") || String(project.name || "--").slice(0, 18);

    return {
      id: project.id ?? `${project.code || "project"}-${index}`,
      label: `#${index + 1} ${compactCode}`,
      fullName: `${project.code || ""}${project.code ? " - " : ""}${project.name || "--"}`,
      globalScore: project.performance.globalScore,
      budgetScore: project.performance.budgetScore,
      timeScore: project.performance.timeScore,
      executionScore: project.performance.executionScore,
      fill: rankStyles[index]?.fill || "#64748b",
    };
  });

  return (
    <Card id="project-performance" className="space-y-5">
      <SectionHeader
        eyebrow={t("pages.projects.performanceEyebrow")}
        title={t("pages.projects.teamPerformanceTitle")}
        description={t("pages.projects.teamPerformanceHint")}
        meta={<Badge variant="success">{t("pages.projects.topPerformanceBadge", { count: rows.length })}</Badge>}
      />

      {rows.length ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {t("pages.projects.topPerformanceChartTitle")}
              </p>
              <span className="text-xs font-semibold text-slate-500">0% - 100%</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 44, left: 4, bottom: 8 }} barCategoryGap="30%">
                  <defs>
                    <linearGradient id="performanceTopOne" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="performanceTopTwo" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <linearGradient id="performanceTopThree" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" width={112} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    content={({ active, payload }) => {
                      const entry = payload?.[0]?.payload;

                      if (!active || !entry) {
                        return null;
                      }

                      return (
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
                          <p className="max-w-64 font-semibold text-slate-900">{entry.fullName}</p>
                          <p className="mt-1 font-semibold text-slate-700">{t("pages.projects.performanceScore")}: {entry.globalScore}%</p>
                          <div className="mt-2 space-y-1 text-slate-600">
                            {metrics.map((metric) => (
                              <div key={metric.key} className="flex justify-between gap-4">
                                <span>{metric.label}</span>
                                <span className="font-semibold text-slate-900">{entry[metric.key]}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="globalScore"
                    radius={[0, 8, 8, 0]}
                    barSize={34}
                    label={{ position: "right", formatter: (value) => `${Math.round(Number(value || 0))}%`, fill: "#334155", fontSize: 12, fontWeight: 700 }}
                  >
                    {chartRows.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-3">
            {rows.map((project, index) => {
              const style = rankStyles[index] || rankStyles[0];

              return (
                <div key={project.id ?? `${project.code}-${index}`} className={cn("rounded-2xl border p-4", style.card)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", style.pill)}>#{index + 1}</span>
                      <p className="mt-3 truncate font-semibold text-slate-950">{project.code || "--"}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{project.name || "--"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-3xl font-semibold", style.text)}>{project.performance.globalScore}%</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("pages.projects.performanceScore")}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {metrics.map((metric) => (
                      <div key={`${project.id}-${metric.key}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <span className="truncate">{metric.label}</span>
                          <span className={metric.text}>{project.performance[metric.key]}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/90">
                          <div className={cn("h-full rounded-full", metric.bar)} style={{ width: `${project.performance[metric.key]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">{t("common.noData")}</p>
      )}
    </Card>
  );
}

const ACTIVE_PAGE_STEP = 3;
const ACTIVE_MAX_SHOWN = 9;
const DOCUMENT_PAGE_STEP = 8;

function ActiveProjectsTable({ id, t, title, description, projects, onSelectProject, renderStatusBadge, emptyLabel }) {
  const [query, setQuery] = useState("");
  const [projectScope, setProjectScope] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [shown, setShown] = useState(ACTIVE_PAGE_STEP);
  const [isWide, setIsWide] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 640px)").matches : true
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mq = window.matchMedia("(min-width: 640px)");
    const handler = (e) => setIsWide(e.matches);
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }

    if (typeof mq.addListener === "function") {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }

    return undefined;
  }, []);

  const statuses = Array.from(new Set(projects.map((p) => p.status).filter(Boolean)));
  const normalizedQuery = query.trim().toLowerCase();

  const sorted = [...projects].sort((a, b) => {
    const da = a.start_date ? new Date(a.start_date).getTime() : 0;
    const db = b.start_date ? new Date(b.start_date).getTime() : 0;
    return db - da;
  });

  const filtered = sorted.filter((p) => {
    const isCompleted = terminalProjectStatuses.includes(p.status);
    const matchScope = projectScope === "all" || (projectScope === "completed" ? isCompleted : !isCompleted);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchQuery =
      !normalizedQuery ||
      `${p.code || ""} ${p.name || ""} ${p.location || ""} ${p.client_name || ""}`.toLowerCase().includes(normalizedQuery);
    return matchScope && matchStatus && matchQuery;
  });

  const visible = filtered.slice(0, shown);
  const remaining = Math.min(ACTIVE_PAGE_STEP, filtered.length - shown);
  const hasMore = shown < filtered.length && shown < ACTIVE_MAX_SHOWN;

  /* chart: on mobile show 4 bars max, on larger screens up to 8 */
  const chartDataAll = sorted.map((p) => ({
    name: (p.code || p.name || "--").replace(/(-\d{4}-\d{2})$/, "").slice(0, 12),
    fullName: p.name || "--",
    code: p.code || "--",
    progress: clampPercent(p.progress_percent),
  }));

  return (
    <Card id={id} className="space-y-5 p-4 sm:p-5 lg:p-6">
      <SectionHeader
        title={title}
        description={description}
        meta={<Badge variant="info">{filtered.length} / {projects.length}</Badge>}
      />

      {/* ── Graphe adaptatif ─────────────────────────────── */}
      {chartDataAll.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 sm:p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {t("pages.projects.portfolioEvolutionTitle")}
          </p>
          {isWide ? (
            /* desktop/tablet: vertical bars */
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={chartDataAll.slice(0, 8)}
                  margin={{ top: 20, right: 8, left: -16, bottom: 4 }}
                  barCategoryGap="28%"
                >
                  <defs>
                    <linearGradient id="activeProgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{ borderRadius: 10, borderColor: "#cbd5e1", fontSize: 12, boxShadow: "0 8px 30px rgba(15,23,42,0.1)" }}
                    formatter={(value, _n, props) => [`${value}% — ${props.payload?.fullName || ""}`, t("pages.projects.globalProgress")]}
                  />
                  <Bar dataKey="progress" fill="url(#activeProgGrad)" radius={[6, 6, 0, 0]} barSize={32}
                    label={{ position: "top", formatter: (v) => `${v}%`, fontSize: 10, fontWeight: 600, fill: "#475569" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* mobile: horizontal bars */
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={chartDataAll.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
                  barCategoryGap="24%"
                >
                  <defs>
                    <linearGradient id="activeProgGradH" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={90} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.08)" }}
                    contentStyle={{ borderRadius: 10, borderColor: "#cbd5e1", fontSize: 12, boxShadow: "0 8px 30px rgba(15,23,42,0.1)" }}
                    formatter={(value, _n, props) => [`${value}% — ${props.payload?.fullName || ""}`, t("pages.projects.globalProgress")]}
                  />
                  <Bar dataKey="progress" fill="url(#activeProgGradH)" radius={[0, 6, 6, 0]} barSize={18}
                    label={{ position: "right", formatter: (v) => `${v}%`, fontSize: 10, fontWeight: 600, fill: "#475569" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Filtres ───────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShown(ACTIVE_PAGE_STEP); }}
          placeholder={t("pages.projects.filterProjects")}
          className="flex-1 min-w-0"
        />
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 sm:w-44 shrink-0"
          value={projectScope}
          onChange={(e) => { setProjectScope(e.target.value); setShown(ACTIVE_PAGE_STEP); }}
        >
          <option value="all">{t("pages.projects.projectScopeAll")}</option>
          <option value="active">{t("pages.projects.projectScopeActive")}</option>
          <option value="completed">{t("pages.projects.projectScopeCompleted")}</option>
        </select>
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 sm:w-44 shrink-0"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setShown(ACTIVE_PAGE_STEP); }}
        >
          <option value="all">{t("pages.projects.allStatuses")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{t(`enums.projectStatus.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* ── Liste ─────────────────────────────────────────── */}
      {filtered.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 whitespace-nowrap">Code</th>
                  <th className="px-4 py-4 whitespace-nowrap">Nom du projet</th>
                  <th className="px-4 py-4 whitespace-nowrap">Statut</th>
                  <th className="px-4 py-4 whitespace-nowrap w-44">Avancement</th>
                  <th className="px-4 py-4 whitespace-nowrap">Client</th>
                  <th className="px-4 py-4 whitespace-nowrap">Début</th>
                  <th className="px-4 py-4 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visible.map((project) => (
                  <tr key={project.id} className="bg-white transition-colors hover:bg-sky-50/60">
                    <td className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">{project.code || "--"}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <span className="line-clamp-1 max-w-[220px]">{project.name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex">{renderStatusBadge(project.status)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 min-w-[68px] overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                            style={{ width: `${clampPercent(project.progress_percent)}%` }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right text-xs font-semibold text-slate-500">
                          {clampPercent(project.progress_percent)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <span className="line-clamp-1 max-w-[140px]">{project.client_name || "--"}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                      {project.start_date || "--"}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`${project.code || project.name || t("pages.projects.openWorkspace")} ${t("pages.projects.openWorkspace")}`}
                        onClick={() => onSelectProject(project.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 hover:border-sky-400 whitespace-nowrap"
                      >
                        Consulter →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setShown((prev) => Math.min(prev + ACTIVE_PAGE_STEP, ACTIVE_MAX_SHOWN))}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600 transition hover:text-sky-800"
              >
                Voir plus ({remaining} de plus)
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{emptyLabel}</p>
      )}
    </Card>
  );
}

function getRecentDocumentTypeLabel(t, item) {
  const documentType = item?.document_type || item?.source_type || "other";

  if (documentType === "change_order") {
    return t("pages.projects.validationTypes.change_order");
  }

  return getTranslationOrFallback(t, `enums.projectDocumentCategory.${documentType}`, documentType);
}

function getRecentDocumentStatusLabel(t, item) {
  if (!item?.status || item.status === "available") {
    return t("pages.projects.documentAvailable");
  }

  if (item.source_type === "change_order") {
    return getTranslationOrFallback(t, `enums.changeOrderStatus.${item.status}`, item.status);
  }

  if (item.source_type === "report") {
    return getTranslationOrFallback(t, `enums.reportType.${item.status}`, item.status);
  }

  return item.status;
}

function formatRecentDocumentDate(value, language) {
  if (!value) {
    return "--";
  }

  return formatProjectDate(String(value).slice(0, 10), language);
}

function parseRecentDocumentTime(value) {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function RecentDocumentsTable({ id, t, language, documents, onSelectProject, emptyLabel }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [shown, setShown] = useState(DOCUMENT_PAGE_STEP);
  const documentTypes = Array.from(new Set(documents.map((item) => item.document_type || item.source_type).filter(Boolean)));
  const normalizedQuery = query.trim().toLowerCase();
  const sorted = [...documents].sort((a, b) => {
    const aTime = parseRecentDocumentTime(a.added_at || a.document_date);
    const bTime = parseRecentDocumentTime(b.added_at || b.document_date);
    return bTime - aTime;
  });
  const filtered = sorted.filter((item) => {
    const documentType = item.document_type || item.source_type || "other";
    const matchesType = typeFilter === "all" || documentType === typeFilter;
    const matchesQuery =
      !normalizedQuery ||
      [
        item.reference,
        item.title,
        getRecentDocumentTypeLabel(t, item),
        item.project_code,
        item.project_name,
        item.status,
        item.uploaded_by?.full_name,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesType && matchesQuery;
  });
  const visible = filtered.slice(0, shown);
  const remaining = Math.min(DOCUMENT_PAGE_STEP, filtered.length - shown);
  const hasMore = shown < filtered.length;

  return (
    <Card id={id} className="space-y-5 p-4 sm:p-5 lg:p-6">
      <SectionHeader
        title={t("pages.projects.recentDocumentsTitle")}
        description={t("pages.projects.recentDocumentsHint")}
        meta={<Badge variant="info">{filtered.length} / {documents.length}</Badge>}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setShown(DOCUMENT_PAGE_STEP); }}
          placeholder={t("pages.projects.filterDocuments")}
          className="flex-1 min-w-0"
        />
        <select
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 sm:w-52 shrink-0"
          value={typeFilter}
          onChange={(event) => { setTypeFilter(event.target.value); setShown(DOCUMENT_PAGE_STEP); }}
        >
          <option value="all">{t("pages.projects.allDocumentTypes")}</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>{getRecentDocumentTypeLabel(t, { document_type: type })}</option>
          ))}
        </select>
      </div>

      {filtered.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.reference")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentTitle")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentType")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentProject")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentDate")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentAddedAt")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentOwner")}</th>
                  <th className="px-4 py-4 whitespace-nowrap">{t("pages.projects.documentStatus")}</th>
                  <th className="px-4 py-4 w-44"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visible.map((item) => (
                  <tr key={item.id} className="bg-white transition-colors hover:bg-sky-50/60">
                    <td className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">{item.reference || "--"}</td>
                    <td className="px-4 py-4 text-slate-700">
                      <span className="line-clamp-1 max-w-[220px]">{item.title || "--"}</span>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={item.document_type === "change_order" ? "warning" : "neutral"}>
                        {getRecentDocumentTypeLabel(t, item)}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <span className="line-clamp-1 max-w-[180px]">
                        {item.project_code || "--"} - {item.project_name || t("pages.projects.notAssigned")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                      {formatRecentDocumentDate(item.document_date, language)}
                    </td>
                    <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                      {formatRecentDocumentDate(item.added_at, language)}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <span className="line-clamp-1 max-w-[150px]">{item.uploaded_by?.full_name || t("pages.projects.notAssigned")}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                      {getRecentDocumentStatusLabel(t, item)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.file_url ? (
                          <a
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 whitespace-nowrap"
                            href={item.file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {t("pages.projects.openDocument")}
                          </a>
                        ) : null}
                        {item.project_id ? (
                          <button
                            type="button"
                            onClick={() => onSelectProject(item.project_id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 hover:border-sky-400 whitespace-nowrap"
                          >
                            {t("pages.projects.openWorkspace")}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setShown((prev) => prev + DOCUMENT_PAGE_STEP)}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600 transition hover:text-sky-800"
              >
                {t("pages.projects.showMoreDocuments", { count: remaining })}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{emptyLabel}</p>
      )}
    </Card>
  );
}

function ProjectCollectionPanel({ id, t, title, description, projects, onSelectProject, renderStatusBadge, emptyLabel }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const statuses = Array.from(new Set(projects.map((project) => project.status).filter(Boolean)));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesQuery =
      !normalizedQuery ||
      `${project.code || ""} ${project.name || ""} ${project.location || ""} ${project.client_name || ""}`.toLowerCase().includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });

  return (
    <Card id={id} className="space-y-4">
      <SectionHeader title={title} description={description} meta={<Badge variant="info">{visibleProjects.length} / {projects.length}</Badge>} />
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("pages.projects.filterProjects")}
        />
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">{t("pages.projects.allStatuses")}</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {t(`enums.projectStatus.${status}`)}
            </option>
          ))}
        </select>
      </div>
      {!!visibleProjects.length && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap">Code</th>
                <th className="px-4 py-4 whitespace-nowrap">Nom du projet</th>
                <th className="px-4 py-4 whitespace-nowrap">Statut</th>
                <th className="px-4 py-4 whitespace-nowrap w-44">Avancement</th>
                <th className="px-4 py-4 whitespace-nowrap">Client</th>
                <th className="px-4 py-4 whitespace-nowrap">Début</th>
                <th className="px-4 py-4 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {visibleProjects.map((project) => (
                <tr key={project.id} className="transition-colors hover:bg-sky-50/60">
                  <td className="px-4 py-4 font-semibold text-slate-900 whitespace-nowrap">{project.code || "--"}</td>
                  <td className="px-4 py-4 text-slate-700">
                    <span className="line-clamp-1 max-w-[220px]">{project.name || "--"}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex">{renderStatusBadge(project.status)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 min-w-[68px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                          style={{ width: `${clampPercent(project.progress_percent)}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs font-semibold text-slate-500">
                        {clampPercent(project.progress_percent)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <span className="line-clamp-1 max-w-[140px]">{project.client_name || "--"}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{project.start_date || "--"}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 hover:border-sky-400 whitespace-nowrap"
                    >
                      Consulter →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!visibleProjects.length ? <p className="text-sm text-slate-600">{emptyLabel}</p> : null}
    </Card>
  );
}

function getTranslationOrFallback(t, key, fallback) {
  const value = t(key);
  return value === key ? fallback : value;
}

function getCapacityAssignments(member) {
  const assignments = [...(member.project_assignments || [])];
  if (member.selected_project_assignment && !assignments.some((assignment) => assignment.id === member.selected_project_assignment.id)) {
    assignments.push(member.selected_project_assignment);
  }
  return assignments;
}

function getCapacityStatus(activeAssignments) {
  if (activeAssignments > 2) return "overloaded";
  if (activeAssignments === 2) return "busy";
  if (activeAssignments === 1) return "allocated";
  return "available";
}

function buildCapacityRows(staffItems) {
  return staffItems
    .map((member) => {
      const assignments = getCapacityAssignments(member);
      const activeAssignments = assignments.length;
      const recommendedCapacity = 2;

      return {
        user_id: member.id,
        full_name: member.full_name || getCollaboratorLabel(member),
        email: member.email,
        job_title: member.job_title,
        department: member.department,
        active_assignments: activeAssignments,
        recommended_capacity: recommendedCapacity,
        load_percent: Math.round((activeAssignments / recommendedCapacity) * 100),
        status: getCapacityStatus(activeAssignments),
        assignments,
      };
    })
    .sort((left, right) => {
      const rank = { overloaded: 0, available: 1, busy: 2, allocated: 3 };
      return (rank[left.status] ?? 4) - (rank[right.status] ?? 4) || right.active_assignments - left.active_assignments;
    });
}

function summarizeCapacityRows(rows) {
  return rows.reduce(
    (summary, row) => ({
      ...summary,
      [row.status]: (summary[row.status] || 0) + 1,
    }),
    { overloaded: 0, available: 0, busy: 0, allocated: 0 }
  );
}

function buildProfitabilityRows(projects) {
  return projects
    .map((project) => {
      const initialBudget = toFiniteNumber(project.budget_amount);
      const actualCost = toFiniteNumber(project.final_cost_amount || project.expenses);
      const revenueBasis = toFiniteNumber(project.revenues || project.contract_amount);
      const budgetConsumed = project.budget_consumed_percent != null
        ? toFiniteNumber(project.budget_consumed_percent)
        : initialBudget
          ? Math.round((actualCost / initialBudget) * 100)
          : 0;
      const progressPercent = clampPercent(project.progress_percent ?? project.physical_progress_percent);
      const budgetProgressGap = budgetConsumed - progressPercent;
      const budgetVariance = initialBudget - actualCost;
      const finalMargin = revenueBasis - actualCost;

      return {
        project_id: project.id,
        project_code: project.code,
        project_name: project.name,
        initial_budget: initialBudget,
        actual_cost: actualCost,
        revenue_basis: revenueBasis,
        budget_variance: budgetVariance,
        final_margin: finalMargin,
        budget_consumed_percent: budgetConsumed,
        progress_percent: progressPercent,
        budget_progress_gap: budgetProgressGap,
        health: budgetVariance < 0 || finalMargin < 0 ? "danger" : budgetProgressGap > cockpitBudgetGapThreshold ? "warning" : "success",
      };
    })
    .sort((left, right) => {
      const rank = { danger: 0, warning: 1, success: 2 };
      return (rank[left.health] ?? 3) - (rank[right.health] ?? 3) || left.budget_variance - right.budget_variance;
    });
}

function buildBudgetProgressAlerts(projects) {
  return buildProfitabilityRows(projects)
    .filter((project) => project.budget_progress_gap > cockpitBudgetGapThreshold)
    .map((project) => ({
      ...project,
      severity: project.budget_progress_gap >= cockpitBudgetGapThreshold * 2 ? "danger" : "warning",
      gap_percent: project.budget_progress_gap,
      expenses: project.actual_cost,
      budget_amount: project.initial_budget,
    }));
}

function getBadgeVariantForHealth(value) {
  if (value === "danger" || value === "overloaded") return "danger";
  if (value === "warning" || value === "busy") return "warning";
  if (value === "success" || value === "available" || value === "allocated") return "success";
  return "neutral";
}

function getBadgeVariantForSeverity(value) {
  if (value === "danger") return "danger";
  if (value === "warning") return "warning";
  if (value === "info") return "info";
  return "neutral";
}

function ProjectSuggestionsPanel({ t, language, dashboard, projects, staffItems }) {
  const cockpit = dashboard?.cockpit || {};
  const profitabilityRows = cockpit.profitability?.items?.length
    ? cockpit.profitability.items
    : buildProfitabilityRows(projects);
  const capacityRows = cockpit.capacity?.items?.length
    ? cockpit.capacity.items
    : buildCapacityRows(staffItems);
  const capacitySummary = cockpit.capacity?.summary || summarizeCapacityRows(capacityRows);
  const budgetAlertRows = cockpit.budget_progress_alerts?.items?.length
    ? cockpit.budget_progress_alerts.items
    : buildBudgetProgressAlerts(projects);
  const validationRows = cockpit.validation_queue?.items || [];
  const validationSummary = cockpit.validation_queue?.summary || {};
  const pendingValidationCount = cockpit.validation_queue?.count ?? validationRows.length;

  return (
    <div className="space-y-5">
      <Card id="project-suggestions" className="space-y-4">
        <SectionHeader
          eyebrow={t("pages.projects.suggestionsEyebrow")}
          title={t("pages.projects.suggestionsTitle")}
          description={t("pages.projects.suggestionsHint")}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FocusCard title={t("pages.projects.cockpitProfitabilityMetric")} value={profitabilityRows.length} accent="primary" />
          <FocusCard title={t("pages.projects.cockpitBudgetAlertsMetric")} value={budgetAlertRows.length} accent={budgetAlertRows.length ? "warning" : "success"} />
          <FocusCard title={t("pages.projects.cockpitCapacityMetric")} value={capacitySummary.overloaded || 0} accent={capacitySummary.overloaded ? "warning" : "success"} />
          <FocusCard title={t("pages.projects.cockpitValidationMetric")} value={pendingValidationCount} accent={pendingValidationCount ? "info" : "success"} />
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeader
          eyebrow={t("pages.projects.financeEyebrow")}
          title={t("pages.projects.cockpitProfitabilityTitle")}
          description={t("pages.projects.cockpitProfitabilityHint")}
          meta={<Badge variant="info">{profitabilityRows.length}</Badge>}
        />
        <div className="space-y-3">
          {profitabilityRows.slice(0, 8).map((row) => (
            <div key={row.project_id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{row.project_code} - {row.project_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t("pages.projects.cockpitBudgetProgress")} : {Math.round(toFiniteNumber(row.budget_consumed_percent))}% / {Math.round(toFiniteNumber(row.progress_percent))}%
                  </p>
                </div>
                <Badge variant={getBadgeVariantForHealth(row.health)}>
                  {t(`pages.projects.cockpitHealth.${row.health}`)}
                </Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MetricCard label={t("pages.projects.initialBudget")} value={formatCompactMoney(row.initial_budget, language)} />
                <MetricCard label={t("pages.projects.actualCost")} value={formatCompactMoney(row.actual_cost, language)} tone="text-rose-600" />
                <MetricCard label={t("pages.projects.finalMargin")} value={formatCompactMoney(row.final_margin, language)} tone={toFiniteNumber(row.final_margin) < 0 ? "text-rose-600" : "text-emerald-600"} />
                <MetricCard label={t("pages.projects.budgetVariance")} value={formatCompactMoney(row.budget_variance, language)} tone={toFiniteNumber(row.budget_variance) < 0 ? "text-rose-600" : "text-emerald-600"} />
              </div>
            </div>
          ))}
          {!profitabilityRows.length ? <p className="text-sm text-slate-600">{t("common.noData")}</p> : null}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.teamEyebrow")}
            title={t("pages.projects.cockpitCapacityTitle")}
            description={t("pages.projects.cockpitCapacityHint")}
            meta={<Badge variant="info">{capacityRows.length}</Badge>}
          />
          <div className="space-y-3">
            {capacityRows.slice(0, 8).map((row) => (
              <div key={row.user_id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{row.full_name || row.email}</p>
                    <p className="mt-1 text-sm text-slate-600">{[row.job_title, row.department].filter(Boolean).join(" / ") || row.email}</p>
                  </div>
                  <Badge variant={getBadgeVariantForHealth(row.status)}>
                    {t(`pages.projects.capacityStatus.${row.status}`)}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>{t("pages.projects.capacityLoad")}</span>
                  <span>{row.active_assignments} / {row.recommended_capacity}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(toFiniteNumber(row.load_percent), 100)}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(row.assignments || []).slice(0, 4).map((assignment) => (
                    <span key={`${row.user_id}-${assignment.assignment_id || assignment.id || assignment.project_id}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                      {assignment.project_code || assignment.project_name || t("pages.projects.selectProject")}
                    </span>
                  ))}
                  {!row.assignments?.length ? <span className="text-sm text-slate-500">{t("pages.projects.staffProjectsEmpty")}</span> : null}
                </div>
              </div>
            ))}
            {!capacityRows.length ? <p className="text-sm text-slate-600">{t("common.noData")}</p> : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <SectionHeader
            eyebrow={t("pages.projects.performanceEyebrow")}
            title={t("pages.projects.cockpitBudgetAlertsTitle")}
            description={t("pages.projects.cockpitBudgetAlertsHint")}
            meta={<Badge variant={budgetAlertRows.length ? "warning" : "success"}>{budgetAlertRows.length}</Badge>}
          />
          <div className="space-y-3">
            {budgetAlertRows.slice(0, 8).map((alert) => (
              <div key={alert.project_id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{alert.project_code} - {alert.project_name}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {t("pages.projects.cockpitBudgetProgress")} : {Math.round(toFiniteNumber(alert.budget_consumed_percent))}% / {Math.round(toFiniteNumber(alert.progress_percent))}%
                    </p>
                  </div>
                  <Badge variant={getBadgeVariantForSeverity(alert.severity)}>
                    +{Math.round(toFiniteNumber(alert.gap_percent))}%
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {t("pages.projects.cockpitBudgetAlertDetail", { amount: formatCompactMoney(alert.expenses, language), budget: formatCompactMoney(alert.budget_amount, language) })}
                </p>
              </div>
            ))}
            {!budgetAlertRows.length ? <p className="text-sm text-slate-600">{t("pages.projects.noBudgetProgressAlert")}</p> : null}
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <SectionHeader
          eyebrow={t("pages.projects.docsEyebrow")}
          title={t("pages.projects.cockpitValidationTitle")}
          description={t("pages.projects.cockpitValidationHint")}
          meta={cockpitWorkflowStages.map((stage) => (
            <Badge key={stage} variant="neutral">
              {t(`pages.projects.workflowStages.${stage}`)}: {validationSummary[stage] || 0}
            </Badge>
          ))}
        />
        {!validationRows.length ? <p className="text-sm text-slate-600">{t("pages.projects.noValidationItem")}</p> : null}
        {!!validationRows.length && (
          <div className="grid gap-3 lg:grid-cols-3">
            {cockpitWorkflowStages.map((stage) => {
              const stageItems = validationRows.filter((item) => item.stage === stage);

              return (
                <div key={stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">{t(`pages.projects.workflowStages.${stage}`)}</p>
                    <Badge variant="info">{stageItems.length}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {stageItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-slate-950">{item.title}</p>
                          <Badge variant={getBadgeVariantForSeverity(item.severity)}>
                            {getTranslationOrFallback(t, `pages.projects.validationStatuses.${item.status}`, item.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {getTranslationOrFallback(t, `pages.projects.validationTypes.${item.source_type}`, item.source_type)} | {item.project_code || item.project_name || t("pages.projects.selectProject")}
                        </p>
                      </div>
                    ))}
                    {!stageItems.length ? <p className="text-sm text-slate-500">{t("common.noData")}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ value, t, kind = "project" }) {
  const mapping =
    kind === "risk"
      ? { open: "danger", monitoring: "warning", mitigated: "success", closed: "neutral" }
      : { draft: "neutral", preparation: "warning", submitted: "info", awarded: "success", in_progress: "info", suspended: "warning", completed: "success", provisional_acceptance: "info", final_acceptance: "success", archived: "neutral", not_started: "neutral", blocked: "danger" };

  return <Badge variant={mapping[value] || "neutral"}>{t(`enums.${kind === "risk" ? "riskStatus" : "projectStatus"}.${value}`)}</Badge>;
}

function AlertText({ alert, t, language }) {
  if (alert.code === "overdue_tasks") return `${alert.value} ${t("pages.projects.alertOverdueTasks")}`;
  if (alert.code === "budget_overrun") return `${t("pages.projects.alertBudgetOverrun")} ${formatCompactMoney(alert.value, language || "fr")}`;
  if (alert.code === "submission_deadline") return `${t("pages.projects.alertSubmission")} ${formatProjectDate(alert.value, language || "fr")}`;
  if (alert.code === "project_end_deadline") return `${t("pages.projects.alertProjectEnd")} ${formatProjectDate(alert.value, language || "fr")}`;
  if (alert.code === "critical_risks") return `${alert.value} ${t("pages.projects.alertCriticalRisks")}`;
  return alert.code;
}

function parseScheduleDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function diffInDays(startDate, endDate) {
  return Math.round((endDate.getTime() - startDate.getTime()) / ONE_DAY_MS);
}

function formatScheduleDate(value, language) {
  const date = value instanceof Date ? value : parseScheduleDate(value);
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
  }).format(date);
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

function formatProjectDateTime(value, language) {
  if (!value) {
    return "--";
  }

  const normalized = String(value).includes("T") ? String(value) : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value) {
  return Math.min(Math.max(toFiniteNumber(value), 0), 100);
}

function getPeriodStart(period) {
  const now = new Date();

  if (period === "30d") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  }

  if (period === "quarter") {
    return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  }

  if (period === "year") {
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  return null;
}

function projectMatchesPeriod(project, period) {
  const periodStart = getPeriodStart(period);
  if (!periodStart) {
    return true;
  }

  const candidateDates = [project.start_date, project.end_date, project.submission_date, project.award_date]
    .map((value) => (value ? new Date(`${value}T00:00:00`) : null))
    .filter((value) => value && !Number.isNaN(value.getTime()));

  if (!candidateDates.length) {
    return true;
  }

  return candidateDates.some((value) => value >= periodStart);
}

function formatCompactMoney(value, language) {
  const amount = toFiniteNumber(value);
  const formatter = new Intl.NumberFormat(language, {
    maximumFractionDigits: amount >= 1000000 ? 1 : 0,
    notation: amount >= 1000000 ? "compact" : "standard",
  });

  return `${formatter.format(amount)} FCFA`;
}

function buildPortfolioFinancials(projects, dashboardFinancials, period) {
  if (period === "all") {
    const expenses = toFiniteNumber(dashboardFinancials?.expenses_total);
    const revenues = toFiniteNumber(dashboardFinancials?.revenues_total);
    const budget = toFiniteNumber(dashboardFinancials?.budget_total);

    return {
      budget,
      expenses,
      revenues,
      margin: toFiniteNumber(dashboardFinancials?.margin_total) || revenues - expenses,
      consumedPercent: budget ? Math.round((expenses / budget) * 100) : 0,
    };
  }

  const budget = projects.reduce((sum, item) => sum + toFiniteNumber(item.budget_amount), 0);
  const expenses = projects.reduce((sum, item) => sum + toFiniteNumber(item.expenses), 0);
  const revenues = projects.reduce((sum, item) => sum + toFiniteNumber(item.revenues), 0);

  return {
    budget,
    expenses,
    revenues,
    margin: revenues - expenses,
    consumedPercent: budget ? Math.round((expenses / budget) * 100) : 0,
  };
}

function getProjectPerformance(project) {
  const progress = clampPercent(project.progress_percent);
  const consumedPercent = clampPercent(project.budget_consumed_percent ?? project.financial_progress_percent);
  const budgetScore =
    toFiniteNumber(project.budget_amount) > 0
      ? Math.max(0, Math.min(100, 100 - Math.max(0, consumedPercent - Math.max(progress, 1))))
      : progress;
  const timeScore =
    project.days_remaining == null
      ? progress
      : Number(project.days_remaining) < 0
        ? Math.max(0, progress - Math.min(Math.abs(Number(project.days_remaining)), 40))
        : Math.min(100, progress + 20);
  const globalScore = Math.round((budgetScore + timeScore + progress) / 3);

  return {
    budgetScore: Math.round(budgetScore),
    timeScore: Math.round(timeScore),
    executionScore: Math.round(progress),
    globalScore,
  };
}

function getCollaboratorLabel(record) {
  if (!record) {
    return "";
  }

  const fullName = [record.first_name, record.last_name].filter(Boolean).join(" ").trim();
  const secondary = [record.job_title, record.department].filter(Boolean).join(" / ");

  if (fullName && secondary) {
    return `${fullName} - ${secondary}`;
  }

  return fullName || record.email || `#${record.id}`;
}

function normalizeTaskWindow(task) {
  const startDate = parseScheduleDate(task.start_date || task.end_date || task.due_date);
  const endDate = parseScheduleDate(task.end_date || task.due_date || task.start_date);

  if (!startDate || !endDate) {
    return null;
  }

  if (endDate < startDate) {
    return { startDate: endDate, endDate: startDate };
  }

  return { startDate, endDate };
}

function getTaskProgress(task) {
  const parsedProgress = Number(task.progress_percent);
  if (!Number.isNaN(parsedProgress)) {
    return Math.min(Math.max(parsedProgress, 0), 100);
  }

  if (task.status === "completed") {
    return 100;
  }

  if (task.status === "in_progress") {
    return 50;
  }

  return 0;
}

function compareTasks(left, right) {
  const leftDate = parseScheduleDate(left.start_date || left.end_date || left.due_date);
  const rightDate = parseScheduleDate(right.start_date || right.end_date || right.due_date);

  if (leftDate && rightDate && leftDate.getTime() !== rightDate.getTime()) {
    return leftDate - rightDate;
  }

  if (leftDate && !rightDate) {
    return -1;
  }

  if (!leftDate && rightDate) {
    return 1;
  }

  return (left.title || "").localeCompare(right.title || "");
}

function submitAndClose(handler, close) {
  return async (event) => {
    await handler(event);
    close();
  };
}

function buildTaskHierarchy(tasks) {
  const childrenByParent = new Map();

  tasks.forEach((task) => {
    const parentKey = task.parent_task_id ?? "root";
    const currentChildren = childrenByParent.get(parentKey) || [];
    currentChildren.push(task);
    currentChildren.sort(compareTasks);
    childrenByParent.set(parentKey, currentChildren);
  });

  const orderedTasks = [];
  const visitedTaskIds = new Set();

  const visitChildren = (parentKey, depth) => {
    const children = childrenByParent.get(parentKey) || [];
    children.forEach((task) => {
      if (visitedTaskIds.has(task.id)) {
        return;
      }

      visitedTaskIds.add(task.id);
      orderedTasks.push({ ...task, depth });
      visitChildren(task.id, depth + 1);
    });
  };

  visitChildren("root", 0);

  tasks.forEach((task) => {
    if (visitedTaskIds.has(task.id)) {
      return;
    }

    orderedTasks.push({ ...task, depth: 0 });
    visitChildren(task.id, 1);
  });

  return orderedTasks;
}

function GanttChart({ tasks, t, language }) {
  const scheduledTasks = buildTaskHierarchy(tasks)
    .map((task) => {
      const window = normalizeTaskWindow(task);
      if (!window) {
        return null;
      }

      return {
        ...task,
        scheduleStart: window.startDate,
        scheduleEnd: window.endDate,
        progress: getTaskProgress(task),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.scheduleStart - right.scheduleStart || left.scheduleEnd - right.scheduleEnd);

  if (!scheduledTasks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600 dark:text-slate-300">
        {t("pages.projects.ganttEmpty")}
      </div>
    );
  }

  const timelineStart = scheduledTasks.reduce(
    (currentMin, task) => (task.scheduleStart < currentMin ? task.scheduleStart : currentMin),
    scheduledTasks[0].scheduleStart
  );
  const timelineEnd = scheduledTasks.reduce(
    (currentMax, task) => (task.scheduleEnd > currentMax ? task.scheduleEnd : currentMax),
    scheduledTasks[0].scheduleEnd
  );
  const totalDays = Math.max(1, diffInDays(timelineStart, timelineEnd) + 1);
  const tickCount = Math.min(totalDays, 6);
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = tickCount === 1 ? 0 : index / (tickCount - 1);
    const tickOffset = Math.round((totalDays - 1) * ratio);
    const tickDate = new Date(timelineStart.getTime() + tickOffset * ONE_DAY_MS);

    return {
      label: formatScheduleDate(tickDate, language),
      position: ratio * 100,
    };
  });
  const unscheduledCount = tasks.length - scheduledTasks.length;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.projects.ganttOverview")}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatScheduleDate(timelineStart, language)} - {formatScheduleDate(timelineEnd, language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
            {t("pages.projects.ganttLegendPlanned")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {t("pages.projects.ganttLegendProgress")}
          </span>
          {unscheduledCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
              {t("pages.projects.ganttUnscheduled", { count: unscheduledCount })}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[minmax(220px,1.2fr)_minmax(420px,2.8fr)] gap-3">
          <div className="px-1 text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.projects.ganttTaskColumn")}</div>
          <div className="space-y-2 px-1">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">{t("pages.projects.ganttWindow")}</p>
            <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300" style={{ gridTemplateColumns: `repeat(${tickCount}, minmax(0, 1fr))` }}>
              {ticks.map((tick) => (
                <span key={`${tick.label}-${tick.position}`} className="text-center">
                  {tick.label}
                </span>
              ))}
            </div>
          </div>

          {scheduledTasks.map((task) => {
            const startOffset = diffInDays(timelineStart, task.scheduleStart);
            const taskDuration = Math.max(1, diffInDays(task.scheduleStart, task.scheduleEnd) + 1);
            const barOffset = (startOffset / totalDays) * 100;
            const barWidth = (taskDuration / totalDays) * 100;
            const progressWidth = (barWidth * task.progress) / 100;
            const typeVariant =
              task.task_type === "phase" ? "info" : task.task_type === "subtask" ? "warning" : "neutral";

            return (
              <div key={task.id} className="contents">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2" style={{ paddingLeft: `${task.depth * 16}px` }}>
                    {task.depth > 0 && <span className="h-2 w-2 rounded-full bg-slate-300" />}
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <Badge variant={typeVariant}>{t(`enums.projectTaskType.${task.task_type}`)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                    {formatScheduleDate(task.scheduleStart, language)} - {formatScheduleDate(task.scheduleEnd, language)} |{" "}
                    {t("pages.projects.ganttDurationDays", { count: taskDuration })}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span>{formatScheduleDate(task.scheduleStart, language)}</span>
                    <span>{task.progress}%</span>
                    <span>{formatScheduleDate(task.scheduleEnd, language)}</span>
                  </div>
                  <div className="relative mt-3 h-5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="absolute inset-y-0 rounded-full bg-sky-300/90"
                      style={{ left: `${barOffset}%`, width: `${barWidth}%` }}
                    />
                    <div
                      className="absolute inset-y-0 rounded-full bg-emerald-500"
                      style={{ left: `${barOffset}%`, width: `${progressWidth}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ProjectsPage({ forcedProjectId = null, workspaceTab = null }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId, user } = useAuth();
  const { isChefProjet, isOuvrier, canManageProjects } = getRoleWorkspaceFlags(user);
  const roleCodes = getUserRoleCodes(user);
  const isAssistantAdministratif = roleCodes.includes("assistant_administratif");
  const canLoadTenantData = canAccessTenantModules(user, tenantId);
  const { data: dashboard, refetch: refetchDashboard } = useApiQuery("/projects/dashboard", { enabled: canLoadTenantData });
  const { data: projects, refetch: refetchProjects } = useApiQuery("/projects", { enabled: canLoadTenantData });
  const { data: collaboratorsData, refetch: refetchCollaborators } = useApiQuery("/users", {
    enabled: canLoadTenantData && canManageProjects,
    params: { include_inactive: false, page_size: 100 },
    ignoreStatuses: [403],
  });
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const workspaceUrl = selectedProjectId ? `/projects/${selectedProjectId}/workspace` : "/projects/0/workspace";
  const { data: workspace, loading: workspaceLoading, error: workspaceError, refetch: refetchWorkspace } = useApiQuery(workspaceUrl, {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
  });
  const { data: financeExpensesData, refetch: refetchFinanceExpenses } = useApiQuery("/finance/expenses", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { project_id: selectedProjectId, page_size: 100 },
    ignoreStatuses: [403],
  });
  const { data: financeRevenuesData, refetch: refetchFinanceRevenues } = useApiQuery("/finance/revenues", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { project_id: selectedProjectId, page_size: 100 },
    ignoreStatuses: [403],
  });
  const { data: financeInvoicesData, refetch: refetchFinanceInvoices } = useApiQuery("/finance/invoices", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { page_size: 100 },
    ignoreStatuses: [403],
  });
  const { data: inventorySupportData, refetch: refetchInventorySupport } = useApiQuery("/inventory/support-data", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    ignoreStatuses: [403],
  });
  const { data: inventoryAllocationsData, refetch: refetchInventoryAllocations } = useApiQuery("/inventory/allocations", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { project_id: selectedProjectId, page_size: 300 },
    ignoreStatuses: [403],
  });
  const { data: inventoryMovementsData, refetch: refetchInventoryMovements } = useApiQuery("/inventory/movements", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { project_id: selectedProjectId, page_size: 100 },
    ignoreStatuses: [403],
  });
  const { data: supplyRequestsData, loading: loadingSupplyRequests, refetch: refetchSupplyRequests } = useApiQuery("/inventory/supply-requests", {
    enabled: canLoadTenantData && Boolean(selectedProjectId),
    params: { project_id: selectedProjectId, page_size: 100 },
    ignoreStatuses: [403],
  });
  const { mutate, loading: saving, error: mutationError } = useApiMutation();

  const [projectForm, setProjectForm] = useState({ code: "", name: "", market_reference: "", project_type: "public_market", status: "draft", client_name: "", location: "", start_date: "", end_date: "", budget_amount: "", contract_amount: "", dao_number: "", contracting_authority: "", submission_date: "", funding_source: "", description: "" });
  const [assignmentForm, setAssignmentForm] = useState({ user_id: "", project_role: "chef_projet", assignment_mode: "immediate", start_date: "", end_date: "", responsibility: "" });
  const [taskForm, setTaskForm] = useState({ parent_task_id: "", task_type: "task", title: "", assigned_to_user_id: "", responsible_user_id: "", start_date: "", end_date: "", priority: "medium", status: "not_started", progress_percent: "0", description: "" });
  const [reportForm, setReportForm] = useState({ report_date: "", report_type: "daily", summary: "", activities_summary: "", personnel_present: "", incidents: "", observations: "" });
  const [riskForm, setRiskForm] = useState({ title: "", severity: "medium", status: "open", owner_user_id: "", mitigation_plan: "", due_date: "", description: "" });
  const [changeOrderForm, setChangeOrderForm] = useState({ reference: "", title: "", amount_delta: "", delay_delta_days: "", status: "draft", effective_date: "", description: "" });
  const [documentForm, setDocumentForm] = useState({ category: "dao", title: "", file_url: "", document_date: "", notes: "", correspondence_type: "" });
  const [presenceForm, setPresenceForm] = useState({ worker_user_id: "", work_date: "", entry_type: "presence", arrival_time: "", departure_time: "", notes: "" });
  const [budgetForm, setBudgetForm] = useState({ version_label: "", status: "draft", total_budget: "", notes: "" });
  const [optimisticSupplyRequests, setOptimisticSupplyRequests] = useState([]);
  const [budgetLineForm, setBudgetLineForm] = useState({ budget_id: "", category: "", label: "", planned_amount: "", committed_amount: "", actual_amount: "" });
  const [financeForm, setFinanceForm] = useState({ entry_type: "expense", category: "", amount: "", entry_date: "", description: "" });
  const [portfolioPeriod, setPortfolioPeriod] = useState("all");
  const [portfolioView, setPortfolioView] = useState("dashboard");

  const projectItems = projects?.items || [];
  const collaboratorItems = collaboratorsData?.items || [];
  const collaboratorOptions = useMemo(
    () => collaboratorItems.filter((item) => !item.account_status || item.account_status === "active"),
    [collaboratorItems]
  );
  const budgetItems = workspace?.budgets?.items || [];
  const taskItems = workspace?.tasks?.items || [];
  const orderedTaskItems = buildTaskHierarchy(taskItems);
  const assignmentItems = workspace?.assignments?.items || [];
  const reportItems = workspace?.reports?.items || [];
  const riskItems = workspace?.risks?.items || [];
  const changeOrderItems = workspace?.change_orders?.items || [];
  const documentItems = workspace?.documents?.items || [];
  const financeExpenseItems = financeExpensesData?.items || workspace?.finance?.expense_items || [];
  const financeRevenueItems = financeRevenuesData?.items || workspace?.finance?.revenue_items || [];
  const financeInvoiceItems = (financeInvoicesData?.items || [])
    .filter((row) => Number(row.project_id) === Number(selectedProjectId));
  const inventoryItems = inventorySupportData?.items || [];
  const projectStockAllocations = inventoryAllocationsData?.items || [];
  const projectStockMovements = inventoryMovementsData?.items || [];
  const projectSupplyRequests = (() => {
    const serverRows = supplyRequestsData?.items || [];
    if (!optimisticSupplyRequests.length) return serverRows;
    const merged = [...optimisticSupplyRequests, ...serverRows];
    const seen = new Set();
    return merged
      .filter((row) => {
        const key = `req-${row.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((left, right) => {
        const leftDate = left?.updated_at || left?.created_at;
        const rightDate = right?.updated_at || right?.created_at;
        const leftValue = leftDate ? new Date(leftDate).getTime() : 0;
        const rightValue = rightDate ? new Date(rightDate).getTime() : 0;
        return rightValue - leftValue;
      });
  })();
  const selectedProject = workspace?.project;
  const portfolioCounts = {
    total: projectItems.length,
    active: projectItems.filter((item) => item.status === "in_progress" || item.status === "awarded").length,
    delayed: projectItems.filter((item) => Number(item.days_remaining) < 0).length,
    completed: projectItems.filter((item) => item.status === "completed" || item.status === "final_acceptance").length,
  };
  const dashboardProjectItems = dashboard?.items || [];
  const projectAnalyticsItems = useMemo(() => {
    const dashboardItemsById = new Map(dashboardProjectItems.map((item) => [item.id, item]));

    return projectItems.map((item) => ({
      ...item,
      ...(dashboardItemsById.get(item.id) || {}),
    }));
  }, [dashboardProjectItems, projectItems]);
  const periodProjectItems = useMemo(
    () => projectAnalyticsItems.filter((item) => projectMatchesPeriod(item, portfolioPeriod)),
    [portfolioPeriod, projectAnalyticsItems]
  );
  const portfolioFinancials = useMemo(
    () => buildPortfolioFinancials(periodProjectItems, dashboard?.financials, portfolioPeriod),
    [dashboard?.financials, periodProjectItems, portfolioPeriod]
  );
  const recentDocumentItems = dashboard?.recent_documents?.items || [];

  const isDirectorOrHR = (member) => {
    const title = (member.job_title || "").toLowerCase();
    const dept = (member.department || "").toLowerCase();
    return (
      title.startsWith("directeur") ||
      title.startsWith("president") ||
      dept === "ressources humaines" ||
      title === "responsable rh" ||
      title === "rh / recruteur"
    );
  };

  const staffProjectRows = useMemo(() => {
    const selectedAssignmentsByUserId = new Map(
      assignmentItems.map((assignment) => [
        assignment.user_id,
        {
          id: assignment.id,
          project_id: selectedProject?.id,
          project_code: selectedProject?.code,
          project_name: selectedProject?.name,
          project_status: selectedProject?.status,
          project_role: assignment.project_role,
          responsibility: assignment.responsibility,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
        },
      ])
    );

    return collaboratorOptions
      .map((item) => ({
        ...item,
        selected_project_assignment: selectedAssignmentsByUserId.get(item.id),
      }))
      .filter((item) => !isDirectorOrHR(item));
  }, [assignmentItems, collaboratorOptions, selectedProject]);
  const isWorkspaceTabMode = Boolean(workspaceTab);
  const returnTo = typeof location.state?.returnTo === "string" ? location.state.returnTo : "";
  const returnLabelKey = typeof location.state?.returnLabelKey === "string" ? location.state.returnLabelKey : "";
  const returnLabel = typeof location.state?.returnLabel === "string" ? location.state.returnLabel : "";
  const returnState = returnTo
    ? { returnTo, ...(returnLabelKey ? { returnLabelKey } : returnLabel ? { returnLabel } : {}) }
    : undefined;

  useEffect(() => {
    if (!projectItems.length) {
      setSelectedProjectId(null);
      return;
    }

    // Root projects page should remain a dashboard + portfolio list.
    // A project is selected only on explicit click by the user.
    if (!isWorkspaceTabMode) {
      if (selectedProjectId && !projectItems.some((item) => item.id === selectedProjectId)) {
        setSelectedProjectId(null);
      }
      return;
    }

    if (!selectedProjectId || !projectItems.some((item) => item.id === selectedProjectId)) {
      setSelectedProjectId(projectItems[0].id);
    }
  }, [isWorkspaceTabMode, projectItems, selectedProjectId]);

  useEffect(() => {
    if (!forcedProjectId || !projectItems.length) {
      return;
    }
    if (!projectItems.some((item) => item.id === forcedProjectId)) {
      return;
    }
    if (selectedProjectId !== forcedProjectId) {
      setSelectedProjectId(forcedProjectId);
    }
  }, [forcedProjectId, projectItems, selectedProjectId]);

  useEffect(() => {
    setOptimisticSupplyRequests([]);
  }, [selectedProjectId]);

  useEffect(() => {
    if (budgetItems.length && !budgetLineForm.budget_id) {
      setBudgetLineForm((prev) => ({ ...prev, budget_id: String(budgetItems[0].id) }));
    }
  }, [budgetItems, budgetLineForm.budget_id]);

  if (!canLoadTenantData) {
    return <TenantScopeNotice moduleLabelKey="navigation.projects" />;
  }

  if (isOuvrier && !canManageProjects) {
    return <WorkerProjectsPage />;
  }

  if (isAssistantAdministratif && !canManageProjects) {
    return <AssistantProjectsPage />;
  }

  const updateForm = (setter) => (key, value) => setter((prev) => ({ ...prev, [key]: value }));
  const updateProject = updateForm(setProjectForm);
  const updateAssignment = updateForm(setAssignmentForm);
  const updateTask = updateForm(setTaskForm);
  const updateReport = updateForm(setReportForm);
  const updateRisk = updateForm(setRiskForm);
  const updateChangeOrder = updateForm(setChangeOrderForm);
  const updateDocument = updateForm(setDocumentForm);
  const updateBudget = updateForm(setBudgetForm);
  const updateBudgetLine = updateForm(setBudgetLineForm);
  const updateFinance = updateForm(setFinanceForm);

  const refreshScope = async () => {
    await Promise.all([refetchDashboard(), refetchProjects()]);
    if (selectedProjectId) {
      await refetchWorkspace();
    }
  };

  const submitProject = async (event) => {
    event.preventDefault();
    const result = await mutate({ method: "post", url: "/projects", data: projectForm });
    setProjectForm({ code: "", name: "", market_reference: "", project_type: "public_market", status: "draft", client_name: "", location: "", start_date: "", end_date: "", budget_amount: "", contract_amount: "", dao_number: "", contracting_authority: "", submission_date: "", funding_source: "", description: "" });
    setSelectedProjectId(result.project.id);
    await Promise.all([refetchDashboard(), refetchProjects()]);
  };

  const submitSelected = (url, data, reset) => async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;
    await mutate({ method: "post", url, data });
    reset();
    await refreshScope();
  };

  const createAssignment = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: `/projects/${selectedProjectId}/assignments`,
      data: {
        ...assignmentForm,
        user_id: parseOptionalNumber(assignmentForm.user_id),
      },
    });
    setAssignmentForm({ user_id: "", project_role: "chef_projet", assignment_mode: "immediate", start_date: "", end_date: "", responsibility: "" });
    await refreshScope();
  };
  const updateProjectAssignment = async (assignmentId, patch) => {
    await mutate({ method: "patch", url: `/projects/assignments/${assignmentId}`, data: patch });
    await refreshScope();
  };
  const blockProjectAssignment = async (assignmentId) => {
    const today = new Date().toISOString().slice(0, 10);
    await mutate({ method: "patch", url: `/projects/assignments/${assignmentId}`, data: { is_active: false, end_date: today } });
    await refreshScope();
  };
  const createTask = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: `/projects/${selectedProjectId}/tasks`,
      data: {
        ...taskForm,
        parent_task_id: taskForm.parent_task_id ? Number(taskForm.parent_task_id) : null,
        assigned_to_user_id: parseOptionalNumber(taskForm.assigned_to_user_id),
        responsible_user_id: taskForm.responsible_user_id ? Number(taskForm.responsible_user_id) : null,
      },
    });
    setTaskForm({ parent_task_id: "", task_type: "task", title: "", assigned_to_user_id: "", responsible_user_id: "", start_date: "", end_date: "", priority: "medium", status: "not_started", progress_percent: "0", description: "" });
    await refreshScope();
  };
  const createReport = submitSelected(`/projects/${selectedProjectId}/reports`, reportForm, () => setReportForm({ report_date: "", report_type: "daily", summary: "", activities_summary: "", personnel_present: "", incidents: "", observations: "" }));
  const createRisk = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: `/projects/${selectedProjectId}/risks`,
      data: {
        ...riskForm,
        owner_user_id: parseOptionalNumber(riskForm.owner_user_id),
      },
    });
    setRiskForm({ title: "", severity: "medium", status: "open", owner_user_id: "", mitigation_plan: "", due_date: "", description: "" });
    await refreshScope();
  };
  const createChangeOrder = submitSelected(`/projects/${selectedProjectId}/change-orders`, changeOrderForm, () => setChangeOrderForm({ reference: "", title: "", amount_delta: "", delay_delta_days: "", status: "draft", effective_date: "", description: "" }));
  const createDocument = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;

    const correspondenceType = String(documentForm.correspondence_type || "").trim();
    const baseNotes = String(documentForm.notes || "").trim();
    const notes = correspondenceType
      ? [`Type correspondance: ${correspondenceType}`, baseNotes].filter(Boolean).join("\n")
      : (baseNotes || null);

    await mutate({
      method: "post",
      url: `/projects/${selectedProjectId}/documents`,
      data: {
        ...(tenantId ? { company_id: Number(tenantId) } : {}),
        category: documentForm.category,
        title: documentForm.title,
        file_url: documentForm.file_url,
        document_date: documentForm.document_date || null,
        notes,
      },
    });

    setDocumentForm({ category: "dao", title: "", file_url: "", document_date: "", notes: "", correspondence_type: "" });
    await refreshScope();
  };
  const updateDocumentItem = async (documentId, payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "patch",
      url: `/projects/documents/${documentId}`,
      data: {
        ...(tenantId ? { company_id: Number(tenantId) } : {}),
        ...payload,
      },
    });
    await refreshScope();
  };
  const deleteDocumentItem = async (documentId) => {
    await mutate({
      method: "delete",
      url: `/projects/documents/${documentId}`,
      params: tenantId ? { company_id: Number(tenantId) } : undefined,
    });
    await refreshScope();
  };
  const updateChangeOrderItem = async (changeOrderId, payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "patch",
      url: `/projects/change-orders/${changeOrderId}`,
      data: {
        ...(tenantId ? { company_id: Number(tenantId) } : {}),
        ...payload,
      },
    });
    await refreshScope();
  };
  const deleteChangeOrderItem = async (changeOrderId) => {
    await mutate({
      method: "delete",
      url: `/projects/change-orders/${changeOrderId}`,
      params: tenantId ? { company_id: Number(tenantId) } : undefined,
    });
    await refreshScope();
  };
  const createBudget = submitSelected(`/projects/${selectedProjectId}/budgets`, budgetForm, () => setBudgetForm({ version_label: "", status: "draft", total_budget: "", notes: "" }));

  const createPresenceEntry = async (payload, options = {}) => {
    const shouldRefresh = options.refresh !== false;
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: `/projects/${selectedProjectId}/presence`,
      data: {
        ...(tenantId ? { company_id: Number(tenantId) } : {}),
        worker_user_id: payload.worker_user_id ? Number(payload.worker_user_id) : null,
        work_date: payload.work_date || null,
        entry_type: payload.entry_type || "presence",
        arrival_time: payload.arrival_time || null,
        departure_time: payload.departure_time || null,
        notes: payload.notes || null,
      },
    });
    if (shouldRefresh) {
      await refreshScope();
    }
  };

  const createPresenceEntries = async (entries = []) => {
    if (!selectedProjectId || !Array.isArray(entries) || !entries.length) return;
    for (const entry of entries) {
      await createPresenceEntry(entry, { refresh: false });
    }
    await refreshScope();
  };

  const updatePresenceEntry = async (entryId, payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "patch",
      url: `/projects/presence/${entryId}`,
      data: { ...(tenantId ? { company_id: Number(tenantId) } : {}), ...payload },
    });
    await refreshScope();
  };

  const deletePresenceEntry = async (entryId) => {
    await mutate({
      method: "delete",
      url: `/projects/presence/${entryId}`,
      params: tenantId ? { company_id: Number(tenantId) } : undefined,
    });
    await refreshScope();
  };

  const createBudgetLine = async (event) => {
    event.preventDefault();
    if (!budgetLineForm.budget_id) return;
    await mutate({ method: "post", url: `/projects/budgets/${budgetLineForm.budget_id}/lines`, data: budgetLineForm });
    setBudgetLineForm((prev) => ({ ...prev, category: "", label: "", planned_amount: "", committed_amount: "", actual_amount: "" }));
    await refreshScope();
  };

  const createFinanceEntry = async (event) => {
    event.preventDefault();
    if (!selectedProjectId) return;
    await mutate({ method: "post", url: "/finance/entries", data: { ...financeForm, project_id: selectedProjectId } });
    setFinanceForm({ entry_type: "expense", category: "", amount: "", entry_date: "", description: "" });
    await refreshScope();
  };

  const createExpenseRecord = async (payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: "/finance/expenses",
      data: {
        project_id: selectedProjectId,
        ...payload,
      },
    });
    await Promise.all([refreshScope(), refetchFinanceExpenses()]);
  };

  const createRevenueRecord = async (payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: "/finance/revenues",
      data: {
        project_id: selectedProjectId,
        ...payload,
      },
    });
    await Promise.all([refreshScope(), refetchFinanceRevenues()]);
  };

  const createPartnerInvoice = async (payload) => {
    if (!selectedProjectId) return;
    await mutate({
      method: "post",
      url: "/finance/invoices",
      data: {
        project_id: selectedProjectId,
        ...payload,
      },
    });
    await Promise.all([refreshScope(), refetchFinanceInvoices()]);
  };

  const createInventoryItem = async (payload) => {
    const response = await mutate({
      method: "post",
      url: "/inventory/items",
      data: payload,
    });
    await Promise.all([
      refetchWorkspace(),
      refetchInventorySupport(),
      refetchInventoryAllocations(),
      refetchInventoryMovements(),
      refetchSupplyRequests(),
    ]);
    return response?.item || response;
  };

  const updateInventoryItem = async (itemId, payload) => {
    await mutate({
      method: "patch",
      url: `/inventory/items/${itemId}`,
      data: payload,
    });
    await Promise.all([
      refetchInventorySupport(),
      refetchInventoryAllocations(),
      refetchInventoryMovements(),
      refetchSupplyRequests(),
    ]);
  };

  const deleteInventoryItem = async (itemId) => {
    await mutate({
      method: "delete",
      url: `/inventory/items/${itemId}`,
    });
    await Promise.all([
      refetchInventorySupport(),
      refetchInventoryAllocations(),
      refetchInventoryMovements(),
      refetchSupplyRequests(),
    ]);
  };

  const addProjectStock = async ({ itemId, quantity, note }) => {
    if (!selectedProjectId) return;
    const firstLocationId = inventorySupportData?.locations?.[0]?.id;
    if (!firstLocationId) {
      throw new Error("Aucun emplacement de stock disponible pour enregistrer l'entrée.");
    }

    const refToken = `UI-PROJECT-STOCK-${Date.now()}`;
    await mutate({
      method: "post",
      url: "/inventory/movements",
      data: {
        item_id: Number(itemId),
        movement_type: "in",
        to_location_id: Number(firstLocationId),
        quantity: Number(quantity),
        reference: refToken,
        notes: note || "Entrée stock projet depuis ajout rapide",
      },
    });

    await mutate({
      method: "post",
      url: "/inventory/allocations",
      data: {
        item_id: Number(itemId),
        project_id: Number(selectedProjectId),
        from_location_id: Number(firstLocationId),
        quantity_allocated: Number(quantity),
        reference: `${refToken}-ALLOC`,
        notes: note || "Allocation projet depuis ajout rapide",
      },
    });

    await Promise.all([
      refetchWorkspace(),
      refetchInventorySupport(),
      refetchInventoryAllocations(),
      refetchInventoryMovements(),
      refetchSupplyRequests(),
    ]);
  };

  const submitSupplyRequest = async (payload) => {
    const normalizedProjectId = Number(selectedProjectId);
    if (!Number.isFinite(normalizedProjectId) || normalizedProjectId <= 0) {
      throw new Error("Aucun projet actif n'est sélectionné pour cette demande.");
    }

    const response = await mutate({ method: "post", url: "/inventory/supply-requests", data: { ...payload, project_id: normalizedProjectId } });
    const created = response?.supply_request || response?.request || response;
    const fallbackUserName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Utilisateur";
    const nowIso = new Date().toISOString();
    const optimisticRow = created?.id ? {
      ...created,
      project_id: created.project_id ?? normalizedProjectId,
      item_id: created.item_id ?? payload.item_id,
      item: created.item || inventoryItems.find((it) => Number(it.id) === Number(payload.item_id)) || null,
      requested_quantity: created.requested_quantity ?? payload.requested_quantity,
      urgency: created.urgency || payload.urgency || "normal",
      status: created.status || "pending",
      requester: created.requester || { full_name: fallbackUserName },
      assignee: created.assignee || null,
      reason: created.reason ?? payload.reason ?? "",
      created_at: created.created_at || nowIso,
      updated_at: created.updated_at || nowIso,
    } : {
      id: `tmp-${Date.now()}`,
      project_id: normalizedProjectId,
      item_id: payload.item_id,
      item: inventoryItems.find((it) => Number(it.id) === Number(payload.item_id)) || null,
      requested_quantity: payload.requested_quantity,
      urgency: payload.urgency || "normal",
      status: "pending",
      requester: { full_name: fallbackUserName },
      assignee: null,
      reason: payload.reason || "",
      created_at: nowIso,
      updated_at: nowIso,
    };
    setOptimisticSupplyRequests((prev) => [optimisticRow, ...prev]);
    await Promise.all([refetchSupplyRequests(), refetchInventoryMovements(), refetchInventorySupport()]);
  };

  const updateSupplyRequestStatus = async (requestId, payload) => {
    const response = await mutate({ method: "patch", url: `/inventory/supply-requests/${requestId}`, data: payload });
    const updated = response?.supply_request || null;
    setOptimisticSupplyRequests((prev) =>
      prev.map((row) => {
        if (String(row.id) !== String(requestId)) return row;
        return updated ? { ...row, ...updated } : { ...row, status: payload?.status || row.status, updated_at: new Date().toISOString() };
      })
    );
    await Promise.all([refetchSupplyRequests(), refetchInventoryMovements(), refetchInventorySupport()]);
  };

  const recordExpensePaymentOperation = async (expenseId, payload) => {
    await mutate({ method: "post", url: `/finance/expenses/${expenseId}/payments`, data: payload });
    await Promise.all([refreshScope(), refetchFinanceExpenses()]);
  };

  const recordInvoicePaymentOperation = async (invoiceId, payload) => {
    await mutate({ method: "post", url: `/finance/invoices/${invoiceId}/payments`, data: payload });
    await Promise.all([refreshScope(), refetchFinanceInvoices()]);
  };

  const changeTaskStatus = async (taskId, status) => {
    await mutate({ method: "patch", url: `/projects/tasks/${taskId}`, data: { status, progress_percent: status === "completed" ? 100 : status === "in_progress" ? 50 : 0 } });
    await refetchWorkspace();
    await refetchDashboard();
  };

  const assignProjectsToUser = async ({ userId, projectIds, existingProjectIds = [], projectRole, assignmentMode, startDate, endDate, responsibility }) => {
    const normalizedExisting = new Set((existingProjectIds || []).map((value) => Number(value)).filter((value) => Number.isFinite(value)));
    const normalizedTargets = Array.from(new Set((projectIds || []).map((value) => Number(value)).filter((value) => Number.isFinite(value))));
    const toCreate = normalizedTargets.filter((projectId) => !normalizedExisting.has(projectId));

    if (!toCreate.length) {
      return;
    }

    for (const projectId of toCreate) {
      await mutate({
        method: "post",
        url: `/projects/${projectId}/assignments`,
        data: {
          user_id: Number(userId),
          project_role: projectRole || "chef_projet",
          assignment_mode: assignmentMode || "immediate",
          start_date: startDate || null,
          end_date: endDate || null,
          responsibility: responsibility || "",
        },
      });
    }

    await Promise.all([refetchDashboard(), refetchProjects(), refetchCollaborators()]);
    if (selectedProjectId) {
      await refetchWorkspace();
    }
  };

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    const targetPath = `/app/projects/${projectId}/overview`;
    if (location.pathname !== targetPath) {
      if (returnState) {
        navigate(targetPath, { state: returnState });
        return;
      }

      navigate(targetPath);
    }
  };

  const openCreateProjectDialog = () => {
    document.getElementById("project-create-dialog-trigger")?.click();
  };

  if (isWorkspaceTabMode) {
    return (
      <section className="space-y-5">
        {!selectedProjectId && <Card><p className="text-sm text-slate-600 dark:text-slate-300">{t("pages.projects.selectProject")}</p></Card>}
        {selectedProjectId && (
          <>
            {workspaceTab === "overview" && (
              <ProjectWorkspaceDashboard
                t={t}
                language={i18n.language}
                project={selectedProject}
                workspace={workspace}
                assignmentItems={assignmentItems}
                taskItems={taskItems}
                reportItems={reportItems}
                riskItems={riskItems}
                changeOrderItems={changeOrderItems}
                documentItems={documentItems}
                budgetItems={budgetItems}
                onOpenDocuments={() => {
                  const targetPath = `/app/projects/${selectedProjectId}/documents`;
                  if (location.pathname !== targetPath) {
                    if (returnState) {
                      navigate(targetPath, { state: returnState });
                      return;
                    }
                    navigate(targetPath);
                  }
                }}
                onOpenStock={() => {
                  const targetPath = `/app/projects/${selectedProjectId}/stock`;
                  if (location.pathname !== targetPath) {
                    if (returnState) {
                      navigate(targetPath, { state: returnState });
                      return;
                    }
                    navigate(targetPath);
                  }
                }}
              />
            )}

            {workspaceTab === "stock" && (
              <ProjectWorkspaceStockPanel
                t={t}
                workspace={workspace}
                projectAllocations={projectStockAllocations}
                projectMovements={projectStockMovements}
                projectSupplyRequests={projectSupplyRequests}
                loadingSupplyRequests={loadingSupplyRequests}
                inventoryItems={inventoryItems}
                projectTeam={assignmentItems}
                collaborators={collaboratorOptions}
                onCreateInventoryItem={createInventoryItem}
                onUpdateInventoryItem={updateInventoryItem}
                onDeleteInventoryItem={deleteInventoryItem}
                onAddProjectStock={addProjectStock}
                onSubmitSupplyRequest={submitSupplyRequest}
                onUpdateSupplyRequest={updateSupplyRequestStatus}
                savingInventoryItem={saving}
                canCreateStockItem={canManageProjects}
              />
            )}

            {(workspaceTab === "team" || workspaceTab === "planning") && canManageProjects && (
              <div className="grid gap-5">
                <ProjectsTeamPlanningPanel
                  t={t}
                  assignmentItems={assignmentItems}
                  taskItems={taskItems}
                  orderedTaskItems={orderedTaskItems}
                  collaboratorOptions={collaboratorOptions}
                  assignmentForm={assignmentForm}
                  taskForm={taskForm}
                  saving={saving}
                  createAssignment={createAssignment}
                  createTask={createTask}
                  updateAssignment={updateAssignment}
                  updateTask={updateTask}
                  changeTaskStatus={changeTaskStatus}
                  updateProjectAssignment={updateProjectAssignment}
                  blockProjectAssignment={blockProjectAssignment}
                  renderSectionHeader={(props) => <SectionHeader {...props} />}
                  getCollaboratorLabel={getCollaboratorLabel}
                  taskTypes={taskTypes}
                  taskStatuses={taskStatuses}
                  priorities={priorities}
                  ganttNode={<GanttChart tasks={taskItems} t={t} language={i18n.language} />}
                  sectionMode={workspaceTab}
                />
              </div>
            )}

            {workspaceTab === "risks" && canManageProjects && (
              <div className="grid gap-5">
                <ProjectsSiteRisksPanel
                  t={t}
                  reportItems={reportItems}
                  riskItems={riskItems}
                  collaboratorOptions={collaboratorOptions}
                  reportForm={reportForm}
                  riskForm={riskForm}
                  saving={saving}
                  createReport={createReport}
                  createRisk={createRisk}
                  updateReport={updateReport}
                  updateRisk={updateRisk}
                  getCollaboratorLabel={getCollaboratorLabel}
                  reportTypes={reportTypes}
                  riskSeverities={riskSeverities}
                  riskStatuses={riskStatuses}
                  renderSectionHeader={(props) => <SectionHeader {...props} />}
                  renderRiskStatusBadge={(status) => <StatusBadge value={status} t={t} kind="risk" />}
                  sectionMode={workspaceTab}
                />
              </div>
            )}

            {workspaceTab === "presence" && (
              <ProjectsPresencePanel
                t={t}
                presenceItems={workspace?.presence_entries || []}
                presenceForm={presenceForm}
                setPresenceForm={setPresenceForm}
                saving={saving}
                createPresenceEntry={createPresenceEntry}
                createPresenceEntries={createPresenceEntries}
                onUpdatePresenceEntry={updatePresenceEntry}
                onDeletePresenceEntry={deletePresenceEntry}
                assignmentItems={assignmentItems}
                renderSectionHeader={(props) => <SectionHeader {...props} />}
              />
            )}

            {(workspaceTab === "finance" || workspaceTab === "documents") && canManageProjects && (
              <ProjectsFinanceDocumentsPanel
                t={t}
                workspace={workspace}
                budgetItems={budgetItems}
                documentItems={documentItems}
                changeOrderItems={changeOrderItems}
                budgetForm={budgetForm}
                budgetLineForm={budgetLineForm}
                financeForm={financeForm}
                documentForm={documentForm}
                changeOrderForm={changeOrderForm}
                saving={saving}
                createBudget={createBudget}
                createBudgetLine={createBudgetLine}
                createFinanceEntry={createFinanceEntry}
                createDocument={createDocument}
                createChangeOrder={createChangeOrder}
                updateBudget={updateBudget}
                updateBudgetLine={updateBudgetLine}
                updateFinance={updateFinance}
                updateDocument={updateDocument}
                updateChangeOrder={updateChangeOrder}
                renderSectionHeader={(props) => <SectionHeader {...props} />}
                renderMetricCard={(props) => <MetricCard {...props} />}
                documentCategories={documentCategories}
                changeOrderStatuses={changeOrderStatuses}
                financeExpenseItems={financeExpenseItems}
                financeRevenueItems={financeRevenueItems}
                financeInvoiceItems={financeInvoiceItems}
                createExpenseRecord={createExpenseRecord}
                createRevenueRecord={createRevenueRecord}
                createPartnerInvoice={createPartnerInvoice}
                recordExpensePaymentOperation={recordExpensePaymentOperation}
                recordInvoicePaymentOperation={recordInvoicePaymentOperation}
                onUpdateDocumentItem={updateDocumentItem}
                onDeleteDocumentItem={deleteDocumentItem}
                onUpdateChangeOrderItem={updateChangeOrderItem}
                onDeleteChangeOrderItem={deleteChangeOrderItem}
                sectionMode={workspaceTab}
              />
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <ProjectCommandCenter
        t={t}
        counts={portfolioCounts}
        financials={{
          ...portfolioFinancials,
          marginLabel: formatCompactMoney(portfolioFinancials.margin, i18n.language),
        }}
        activeView={portfolioView}
        onViewChange={setPortfolioView}
        onCreateProject={canManageProjects ? openCreateProjectDialog : undefined}
      />

      {(isChefProjet || isOuvrier) && (
        <Card className="border-slate-300 bg-slate-950 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {isChefProjet ? t("pages.projects.workspaceTitleChef") : t("pages.projects.workspaceTitleWorker")}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                {isChefProjet ? t("pages.projects.workspaceSubtitleChef") : t("pages.projects.workspaceSubtitleWorker")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isChefProjet && (
                <>
                  <Badge variant="success">{t("pages.projects.focusAssignments")}</Badge>
                  <Badge variant="success">{t("pages.projects.focusPlanning")}</Badge>
                  <Badge variant="success">{t("pages.projects.focusSite")}</Badge>
                </>
              )}
              {isOuvrier && (
                <>
                  <Badge variant="success">{t("pages.projects.myTasksTitle")}</Badge>
                  <Badge variant="success">{t("pages.projects.focusSite")}</Badge>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {!canManageProjects && <Card><p className="text-sm text-amber-700">{t("pages.projects.readOnlyHint")}</p></Card>}

      {canManageProjects && (
        <ProjectActionDialog
          triggerId="project-create-dialog-trigger"
          triggerLabel={t("pages.projects.openProjectForm")}
          triggerClassName="hidden"
          title={t("pages.projects.createProject")}
          description={t("pages.projects.projectIntakeSubtitle")}
          closeLabel={t("common.close")}
        >
          {({ close }) => (
            <form className="grid gap-3" onSubmit={submitAndClose(submitProject, close)}>
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder={t("pages.projects.code")} value={projectForm.code} onChange={(e) => updateProject("code", e.target.value)} />
                <Input placeholder={t("pages.projects.name")} value={projectForm.name} onChange={(e) => updateProject("name", e.target.value)} />
                <Input placeholder={t("pages.projects.marketReference")} value={projectForm.market_reference} onChange={(e) => updateProject("market_reference", e.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={projectForm.project_type} onChange={(e) => updateProject("project_type", e.target.value)}>
                  {projectTypes.map((value) => <option key={value} value={value}>{t(`enums.projectType.${value}`)}</option>)}
                </select>
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={projectForm.status} onChange={(e) => updateProject("status", e.target.value)}>
                  {projectStatuses.map((value) => <option key={value} value={value}>{t(`enums.projectStatus.${value}`)}</option>)}
                </select>
                <Input placeholder={t("pages.projects.client")} value={projectForm.client_name} onChange={(e) => updateProject("client_name", e.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input placeholder={t("pages.projects.location")} value={projectForm.location} onChange={(e) => updateProject("location", e.target.value)} />
                <Input type="date" aria-label={t("pages.projects.startDate")} value={projectForm.start_date} onChange={(e) => updateProject("start_date", e.target.value)} />
                <Input type="date" aria-label={t("pages.projects.endDate")} value={projectForm.end_date} onChange={(e) => updateProject("end_date", e.target.value)} />
                <Input type="date" aria-label={t("pages.projects.submissionDate")} value={projectForm.submission_date} onChange={(e) => updateProject("submission_date", e.target.value)} />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input type="number" placeholder={t("pages.projects.budget")} value={projectForm.budget_amount} onChange={(e) => updateProject("budget_amount", e.target.value)} />
                <Input type="number" placeholder={t("pages.projects.contractAmount")} value={projectForm.contract_amount} onChange={(e) => updateProject("contract_amount", e.target.value)} />
                <Input placeholder={t("pages.projects.daoNumber")} value={projectForm.dao_number} onChange={(e) => updateProject("dao_number", e.target.value)} />
                <Input placeholder={t("pages.projects.fundingSource")} value={projectForm.funding_source} onChange={(e) => updateProject("funding_source", e.target.value)} />
              </div>
              <Input placeholder={t("pages.projects.contractingAuthority")} value={projectForm.contracting_authority} onChange={(e) => updateProject("contracting_authority", e.target.value)} />
              <Textarea rows={3} placeholder={t("pages.projects.description")} value={projectForm.description} onChange={(e) => updateProject("description", e.target.value)} />
              {mutationError && <p className="text-sm text-rose-600">{mutationError}</p>}
              <Button type="submit" disabled={saving}>{t("common.create")}</Button>
            </form>
          )}
        </ProjectActionDialog>
      )}

      {portfolioView === "dashboard" && (
        <ProjectDashboardPanel
          t={t}
          language={i18n.language}
          counts={portfolioCounts}
          dashboard={dashboard}
          staffCount={staffProjectRows.length}
          financials={portfolioFinancials}
          period={portfolioPeriod}
          onPeriodChange={setPortfolioPeriod}
          projects={periodProjectItems}
        />
      )}

      {portfolioView === "finance" && (
        <ProjectFinancialDashboard
          t={t}
          language={i18n.language}
          period={portfolioPeriod}
          onPeriodChange={setPortfolioPeriod}
          financials={portfolioFinancials}
          projects={periodProjectItems}
        />
      )}

      {portfolioView === "active" && (
        <ActiveProjectsTable
          id="project-active"
          t={t}
          title={t("pages.projects.activeProjectsTitle")}
          description={t("pages.projects.activeProjectsHint")}
          projects={periodProjectItems}
          onSelectProject={handleSelectProject}
          renderStatusBadge={(status) => <StatusBadge value={status} t={t} />}
          emptyLabel={t("pages.projects.activeProjectsEmpty")}
        />
      )}

      {portfolioView === "staff" && (
        <StaffProjectsPanel
          t={t}
          staffItems={staffProjectRows}
          selectedProject={selectedProject}
          projectOptions={projectItems}
          canManageProjects={canManageProjects}
          onAssignProjects={assignProjectsToUser}
        />
      )}

      {portfolioView === "performance" && (
        <ProjectPerformancePanel t={t} projects={periodProjectItems} />
      )}

      {portfolioView === "documents" && (
        <RecentDocumentsTable
          id="project-documents"
          t={t}
          language={i18n.language}
          documents={recentDocumentItems}
          onSelectProject={handleSelectProject}
          emptyLabel={t("pages.projects.recentDocumentsEmpty")}
        />
      )}

      {portfolioView === "suggestions" && (
        <ProjectSuggestionsPanel
          t={t}
          language={i18n.language}
          dashboard={dashboard}
          projects={periodProjectItems}
          staffItems={staffProjectRows}
        />
      )}

    </section>
  );
}
