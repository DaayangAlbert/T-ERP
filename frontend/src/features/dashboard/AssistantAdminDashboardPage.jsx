import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getComplianceTypeLabel,
  getDocumentValidityStatus,
  normalizeCompanyWorkspacePayload,
} from "@/features/companies/companyWorkspaceData";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatAmount(value, language) {
  return new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value, language) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function MetricBox({ label, value, hint, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InlineBars({ items, emptyText }) {
  const safeItems = items.filter((item) => Number(item.value) > 0);
  const maxValue = Math.max(...safeItems.map((item) => Number(item.value || 0)), 1);

  if (!safeItems.length) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {safeItems.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
            <span className="text-slate-500">{item.displayValue ?? item.value}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-slate-900 dark:bg-slate-100" style={{ width: `${Math.max(8, Math.round((Number(item.value || 0) / maxValue) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const COPY = {
  fr: {
    chartEmpty: "Pas encore assez d'elements pour tracer un graphe.",
    flowIncoming: "Arrivee",
    flowOutgoing: "Sortie",
    eyebrow: "Assistant administratif",
    title: "Vue administrative quotidienne",
    description:
      "Le tableau de bord met en avant le planning en cours, le taux d'objectifs atteints, les notifications, le dernier bulletin de paie, l'agenda du jour, les correspondances recentes et les pieces administratives a renouveler bientot.",
    goalsReached: "Objectifs atteints",
    goalsHint: "Base sur vos taches visibles",
    notifications: "Notifications",
    notificationsHint: "Messages et bulletins non consultes",
    watchItems: "Pieces a surveiller",
    watchItemsHint: "Documents expires ou bientot a echeance",
    recentCorrespondence: "Correspondances recentes",
    recentCorrespondenceHint: "Arrivees et sorties enregistrables",
    planningTitle: "Planning, agenda et portefeuille",
    planningHint: "Acces rapide au planning projet, a l'agenda personnel et a la vue restreinte des projets. Les absences, retards et conges restent traces dans la paie.",
    planning: "Planning",
    projects: "Projets",
    correspondences: "Correspondances",
    todayAgenda: "Agenda aujourd'hui",
    upcoming: "A venir",
    activeProjects: "Projets actifs",
    delayedProjects: "Projets en retard",
    noLocation: "Sans lieu",
    noAgenda: "Aucune entree d'agenda visible pour le moment.",
    chartsTitle: "Graphes RH et paie",
    chartsHint: "Indicateurs issus de la paie personnelle: salaire net, retards, absences et impact des conges valides.",
    salaryTrend: "Evolution du salaire",
    timeTracking: "Indicateurs paie et absences",
    payroll: "Paie",
    actionPanelTitle: "Notifications, correspondances et conformite",
    actionPanelHint: "Ce qui demande un traitement rapide aujourd'hui.",
    payslipBadge: "bulletin",
    messageBadge: "message",
    noNotifications: "Aucune notification prioritaire n'est remontee.",
    noNumber: "Correspondance sans numero",
    noSubject: "Sans objet",
    noProject: "Sans projet",
    noCorrespondence: "Aucune correspondance n'est encore renseignee.",
    expired: "expire",
    renew: "a renouveler",
    validityEnd: "Fin de validite",
    noExpiringDocs: "Aucune piece administrative n'arrive a echeance prochainement.",
    lateHours: "Heures retard",
    absences: "Absences",
    approvedLeave: "Conges approuves",
    pendingLeave: "Conges en attente",
  },
  en: {
    chartEmpty: "Not enough data yet to draw a chart.",
    flowIncoming: "Incoming",
    flowOutgoing: "Outgoing",
    eyebrow: "Administrative assistant",
    title: "Daily administrative view",
    description:
      "This dashboard highlights the current planning, goal completion rate, notifications, latest payslip, today's agenda, recent correspondence, and administrative documents that will soon need renewal.",
    goalsReached: "Goals reached",
    goalsHint: "Based on your visible tasks",
    notifications: "Notifications",
    notificationsHint: "Unread messages and payslips",
    watchItems: "Items to watch",
    watchItemsHint: "Expired documents or items nearing expiry",
    recentCorrespondence: "Recent correspondence",
    recentCorrespondenceHint: "Incoming and outgoing records",
    planningTitle: "Planning, agenda, and portfolio",
    planningHint: "Quick access to project planning, personal agenda, and the restricted project overview. Absences, lateness, and leave stay tracked in payroll.",
    planning: "Planning",
    projects: "Projects",
    correspondences: "Correspondence",
    todayAgenda: "Today's agenda",
    upcoming: "Upcoming",
    activeProjects: "Active projects",
    delayedProjects: "Delayed projects",
    noLocation: "No location",
    noAgenda: "No agenda entry is visible right now.",
    chartsTitle: "HR and payroll charts",
    chartsHint: "Indicators coming from personal payroll: net salary, lateness, absences, and approved leave impact.",
    salaryTrend: "Salary trend",
    timeTracking: "Payroll and attendance indicators",
    payroll: "Payroll",
    actionPanelTitle: "Notifications, correspondence, and compliance",
    actionPanelHint: "What needs quick action today.",
    payslipBadge: "payslip",
    messageBadge: "message",
    noNotifications: "No priority notification is currently available.",
    noNumber: "Correspondence without number",
    noSubject: "No subject",
    noProject: "No project",
    noCorrespondence: "No correspondence has been recorded yet.",
    expired: "expired",
    renew: "renew",
    validityEnd: "Validity end",
    noExpiringDocs: "No administrative document is nearing expiry right now.",
    lateHours: "Late hours",
    absences: "Absences",
    approvedLeave: "Approved leave",
    pendingLeave: "Pending leave",
  },
};

export function AssistantAdminDashboardPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const planningQuery = useApiQuery("/planning/overview");
  const agendaQuery = useApiQuery("/planning/agenda", {
    params: { include_completed: false },
  });
  const profileQuery = useApiQuery("/users/me/profile", { ignoreStatuses: [404] });
  const payrollSummaryQuery = useApiQuery("/payroll/me/summary", { ignoreStatuses: [404] });
  const payslipsQuery = useApiQuery("/payroll/me/payslips", {
    ignoreStatuses: [404],
    params: { limit: 6 },
  });
  const companyQuery = useApiQuery("/companies/me", { ignoreStatuses: [404] });
  const projectsDashboardQuery = useApiQuery("/projects/dashboard", { ignoreStatuses: [404] });

  const planning = planningQuery.data || {};
  const agendaItems = agendaQuery.data?.items || [];
  const profile = profileQuery.data || {};
  const notifications = profile.notifications || {};
  const payrollSummary = payrollSummaryQuery.data || {};
  const payslips = payslipsQuery.data?.items || [];
  const company = companyQuery.data || {};
  const companyWorkspace = normalizeCompanyWorkspacePayload(company.administrative_documents);
  const correspondences = [
    ...(companyWorkspace?.correspondences?.incoming || []).map((item) => ({ ...item, flow: text.flowIncoming })),
    ...(companyWorkspace?.correspondences?.outgoing || []).map((item) => ({ ...item, flow: text.flowOutgoing })),
  ].sort((left, right) => String(right.received_on || right.discharge_on || "").localeCompare(String(left.received_on || left.discharge_on || "")));
  const expiringDocuments = (companyWorkspace?.compliance_documents || [])
    .filter((item) => {
      const status = getDocumentValidityStatus(item);
      return status === "expiring" || status === "expired";
    })
    .sort((left, right) => String(left.valid_until || "").localeCompare(String(right.valid_until || "")));
  const objectiveRate = useMemo(() => {
    const taskItems = planning.my_tasks || [];
    if (!taskItems.length) {
      return 0;
    }
    const completed = taskItems.filter((item) => item.is_completed).length;
    return Math.round((completed / taskItems.length) * 100);
  }, [planning.my_tasks]);

  const salaryBars = [...payslips]
    .reverse()
    .map((item) => ({
      label: String(item.period_key || "").slice(5) || item.period_key || "-",
      value: Number(item.net_a_payer || 0),
      displayValue: formatAmount(item.net_a_payer, i18n.language),
    }));

  const hrBars = [
    { label: text.lateHours, value: Number(payrollSummary?.attendance?.late_hours || 0) },
    { label: text.absences, value: Number(payrollSummary?.attendance?.absence_days || 0) },
    { label: text.approvedLeave, value: Number(payrollSummary?.leave_summary?.approved_days_total || 0) },
    { label: text.pendingLeave, value: Number(payrollSummary?.leave_summary?.pending_days_total || 0) },
  ];

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(226,232,240,0.94))] text-slate-950 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:text-white">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-white/60">{text.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{text.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{text.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricBox label={text.goalsReached} value={`${objectiveRate}%`} hint={text.goalsHint} tone="text-emerald-700 dark:text-emerald-300" />
            <MetricBox label={text.notifications} value={notifications.total_unread ?? 0} hint={text.notificationsHint} tone="text-amber-700 dark:text-amber-300" />
            <MetricBox label={text.watchItems} value={expiringDocuments.length} hint={text.watchItemsHint} tone="text-rose-700 dark:text-rose-300" />
            <MetricBox label={text.recentCorrespondence} value={correspondences.length} hint={text.recentCorrespondenceHint} tone="text-sky-700 dark:text-sky-300" />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.planningTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text.planningHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/app/planning">{text.planning}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/projects">{text.projects}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/correspondences">{text.correspondences}</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricBox label={text.todayAgenda} value={planning?.agenda_summary?.today_count ?? 0} />
            <MetricBox label={text.upcoming} value={planning?.agenda_summary?.upcoming_count ?? 0} />
            <MetricBox label={text.activeProjects} value={projectsDashboardQuery.data?.counts?.active_projects ?? 0} />
            <MetricBox label={text.delayedProjects} value={projectsDashboardQuery.data?.counts?.delayed_projects ?? 0} tone="text-amber-700 dark:text-amber-300" />
          </div>

          <div className="space-y-3">
            {agendaItems.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <Badge variant="neutral">{String(item.category || "other").replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(item.start_at, i18n.language)} - {item.location || text.noLocation}</p>
              </div>
            ))}
            {!agendaItems.length && <p className="text-sm text-slate-500">{text.noAgenda}</p>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.chartsTitle}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text.chartsHint}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/app/payroll?focus=leave">{text.payroll}</Link>
              </Button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{text.salaryTrend}</p>
                <InlineBars items={salaryBars} emptyText={text.chartEmpty} />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{text.timeTracking}</p>
                <InlineBars items={hrBars} emptyText={text.chartEmpty} />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.actionPanelTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text.actionPanelHint}</p>
            </div>

            <div className="space-y-3">
              {(notifications.items || []).slice(0, 4).map((item) => (
                <div key={`${item.kind}-${item.created_at}`} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <Badge variant={item.kind === "payslip" ? "success" : "info"}>{item.kind === "payslip" ? text.payslipBadge : text.messageBadge}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                </div>
              ))}
              {!(notifications.items || []).length && <p className="text-sm text-slate-500">{text.noNotifications}</p>}
            </div>

            <div className="space-y-3 pt-2">
              {correspondences.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{item.reference_number || text.noNumber}</p>
                    <Badge variant={item.flow === text.flowIncoming ? "warning" : "info"}>{item.flow}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.subject || text.noSubject}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.project_name || text.noProject} - {formatDate(item.received_on || item.discharge_on, i18n.language)}</p>
                </div>
              ))}
              {!correspondences.length && <p className="text-sm text-slate-500">{text.noCorrespondence}</p>}
            </div>

            <div className="space-y-3 pt-2">
              {expiringDocuments.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{getComplianceTypeLabel(item.type, i18n.language, item.bank_label)}</p>
                    <Badge variant={getDocumentValidityStatus(item) === "expired" ? "danger" : "warning"}>
                      {getDocumentValidityStatus(item) === "expired" ? text.expired : text.renew}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{text.validityEnd}: {formatDate(item.valid_until, i18n.language)}</p>
                </div>
              ))}
              {!expiringDocuments.length && <p className="text-sm text-slate-500">{text.noExpiringDocs}</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
