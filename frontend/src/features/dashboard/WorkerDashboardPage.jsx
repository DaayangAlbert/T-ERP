import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatAmount(value, language) {
  return new Intl.NumberFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value, language) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function SimpleMetric({ label, value, hint, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function MiniBars({ items, language, formatter, emptyText }) {
  const safeItems = items.filter((item) => Number(item.value) > 0);
  const maxValue = Math.max(...safeItems.map((item) => Number(item.value || 0)), 1);

  if (!safeItems.length) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="grid grid-cols-6 gap-3">
      {safeItems.map((item) => {
        const height = Math.max(18, Math.round((Number(item.value || 0) / maxValue) * 120));
        return (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center rounded-2xl bg-slate-100 px-2 py-3 dark:bg-slate-900">
              <div className="w-full rounded-xl bg-slate-900 dark:bg-slate-100" style={{ height }} />
            </div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{item.label}</p>
            <p className="text-[11px] text-slate-500">{formatter ? formatter(item.value, language) : item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

const COPY = {
  fr: {
    emptyChart: "Pas encore assez d'historique pour afficher un graphe.",
    dashboardEyebrow: "Tableau de bord terrain",
    activityTitle: "Activite du jour",
    activityDescription:
      "Retrouvez le planning en cours, le taux d'objectifs atteints, les notifications prioritaires, le dernier bulletin de paie et l'agenda de la journee dans une seule vue. Le planning couvre l'agenda et les taches; la paie couvre absences, retards, conges et bulletins.",
    goalsReached: "Objectifs atteints",
    goalsHint: "Base sur vos taches assignees",
    todayAgenda: "Agenda aujourd'hui",
    todayAgendaHint: "Reunions et rappels du jour",
    notifications: "Notifications",
    notificationsHint: "Messages et bulletins non consultes",
    latestPayslip: "Dernier bulletin",
    noPayslip: "Aucun bulletin",
    currentPlanningTitle: "Planning des activites en cours",
    currentPlanningHint: "Vos taches ouvertes, votre chantier actif et les prochaines echeances. Les demandes de conge et justificatifs restent dans la paie.",
    viewProject: "Voir mon projet",
    viewAgenda: "Voir mon agenda",
    viewPayroll: "Ouvrir ma paie",
    myTasks: "Mes taches",
    upcoming: "A venir",
    overdue: "En retard",
    openTasks: "Taches ouvertes",
    delayedTasks: "Taches en retard",
    nextDeadline: "Prochaine echeance",
    noProject: "Aucun projet n'est encore remonte dans votre planning.",
    done: "terminee",
    followUp: "a relancer",
    inProgress: "en cours",
    noProjectFallback: "Sans projet",
    noTasks: "Aucune tache en cours n'est remontee pour le moment.",
    chartsTitle: "Graphes de suivi",
    chartsHint: "Indicateurs issus de la paie personnelle: salaire net, retards, absences et conges valides sur la periode visible.",
    salaryTrend: "Evolution du salaire",
    timeTracking: "Indicateurs paie et absences",
    notificationsAgendaTitle: "Notifications et agenda du jour",
    notificationsAgendaHint: "Messages recents, bulletins a consulter et prochain emploi du temps.",
    payslipBadge: "bulletin",
    messageBadge: "message",
    noNotifications: "Aucune notification prioritaire pour le moment.",
    noLocation: "Sans lieu",
    noAppointments: "Aucun rendez-vous planifie sur les prochains jours.",
  },
  en: {
    emptyChart: "Not enough history yet to display a chart.",
    dashboardEyebrow: "Field dashboard",
    activityTitle: "Today's activity",
    activityDescription:
      "See the active planning, goal completion rate, priority notifications, latest payslip, and today's agenda in one place. Planning covers agenda and tasks; payroll covers absences, lateness, leave, and payslips.",
    goalsReached: "Goals reached",
    goalsHint: "Based on your assigned tasks",
    todayAgenda: "Today's agenda",
    todayAgendaHint: "Meetings and reminders for today",
    notifications: "Notifications",
    notificationsHint: "Unread messages and payslips",
    latestPayslip: "Latest payslip",
    noPayslip: "No payslip",
    currentPlanningTitle: "Current activity planning",
    currentPlanningHint: "Your open tasks, active site, and upcoming deadlines. Leave requests and proofs stay in payroll.",
    viewProject: "View my project",
    viewAgenda: "View my agenda",
    viewPayroll: "Open my payroll",
    myTasks: "My tasks",
    upcoming: "Upcoming",
    overdue: "Overdue",
    openTasks: "Open tasks",
    delayedTasks: "Delayed tasks",
    nextDeadline: "Next deadline",
    noProject: "No project is currently visible in your planning workspace.",
    done: "done",
    followUp: "follow up",
    inProgress: "in progress",
    noProjectFallback: "No project",
    noTasks: "No current task is available right now.",
    chartsTitle: "Tracking charts",
    chartsHint: "Personal payroll indicators: net salary, lateness, absences, and approved leave over the visible period.",
    salaryTrend: "Salary trend",
    timeTracking: "Payroll and attendance indicators",
    notificationsAgendaTitle: "Notifications and today's agenda",
    notificationsAgendaHint: "Recent messages, payslips to review, and the next scheduled events.",
    payslipBadge: "payslip",
    messageBadge: "message",
    noNotifications: "No priority notification at the moment.",
    noLocation: "No location",
    noAppointments: "No event is scheduled over the next few days.",
  },
};

export function WorkerDashboardPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const today = new Date();
  const weekAhead = new Date(today);
  weekAhead.setDate(today.getDate() + 7);

  const planningQuery = useApiQuery("/planning/overview");
  const agendaQuery = useApiQuery("/planning/agenda", {
    params: {
      date_from: today.toISOString(),
      date_to: weekAhead.toISOString(),
      include_completed: false,
    },
  });
  const profileQuery = useApiQuery("/users/me/profile", { ignoreStatuses: [404] });
  const payrollSummaryQuery = useApiQuery("/payroll/me/summary", { ignoreStatuses: [404] });
  const payslipsQuery = useApiQuery("/payroll/me/payslips", {
    ignoreStatuses: [404],
    params: { limit: 6 },
  });

  const planning = planningQuery.data || {};
  const agendaItems = agendaQuery.data?.items || [];
  const profile = profileQuery.data || {};
  const notifications = profile.notifications || {};
  const payrollSummary = payrollSummaryQuery.data || {};
  const payslips = payslipsQuery.data?.items || [];

  const latestProject = planning.projects?.[0] || null;
  const latestPayslip = payslips[0] || null;
  const objectiveRate = useMemo(() => {
    const taskItems = planning.my_tasks || [];
    if (!taskItems.length) {
      return 0;
    }
    const completed = taskItems.filter((item) => item.is_completed).length;
    return Math.round((completed / taskItems.length) * 100);
  }, [planning.my_tasks]);

  const salaryBars = useMemo(
    () =>
      [...payslips]
        .reverse()
        .map((item) => ({
          label: String(item.period_key || "").slice(5) || item.period_key || "-",
          value: Number(item.net_a_payer || 0),
        })),
    [payslips]
  );

  const workloadBars = [
    { label: locale === "en" ? "Late hours" : "Heures retard", value: Number(payrollSummary?.attendance?.late_hours || 0) },
    { label: locale === "en" ? "Absences" : "Absences", value: Number(payrollSummary?.attendance?.absence_days || 0) },
    { label: locale === "en" ? "Approved leave" : "Conges appr.", value: Number(payrollSummary?.leave_summary?.approved_days_total || 0) },
    { label: locale === "en" ? "Pending leave" : "Conges attente", value: Number(payrollSummary?.leave_summary?.pending_days_total || 0) },
  ];

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] text-white">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/65">{text.dashboardEyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{text.activityTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">{text.activityDescription}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SimpleMetric label={text.goalsReached} value={`${objectiveRate}%`} hint={text.goalsHint} tone="text-emerald-700 dark:text-emerald-300" />
            <SimpleMetric label={text.todayAgenda} value={planning?.agenda_summary?.today_count ?? 0} hint={text.todayAgendaHint} tone="text-sky-700 dark:text-sky-300" />
            <SimpleMetric label={text.notifications} value={notifications.total_unread ?? 0} hint={text.notificationsHint} tone="text-amber-700 dark:text-amber-300" />
            <SimpleMetric
              label={text.latestPayslip}
              value={latestPayslip ? formatAmount(latestPayslip.net_a_payer, i18n.language) : "--"}
              hint={latestPayslip?.period_key || text.noPayslip}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.currentPlanningTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text.currentPlanningHint}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/app/projects">{text.viewProject}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/planning">{text.viewAgenda}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/payroll?focus=leave">{text.viewPayroll}</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <SimpleMetric label={text.myTasks} value={(planning.my_tasks || []).length} />
            <SimpleMetric label={text.upcoming} value={planning?.agenda_summary?.upcoming_count ?? 0} />
            <SimpleMetric label={text.overdue} value={(planning.my_tasks || []).filter((item) => item.is_overdue).length} tone="text-rose-700 dark:text-rose-300" />
          </div>

          {latestProject ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-5 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{latestProject.code}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{latestProject.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">{Math.round(Number(latestProject.progress_percent || 0))}%</Badge>
                  <Badge variant="neutral">{String(latestProject.status || "").replaceAll("_", " ")}</Badge>
                </div>
              </div>
              <div className="mt-4 h-3 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-slate-900 dark:bg-slate-100"
                  style={{ width: `${Math.max(6, Math.round(Number(latestProject.progress_percent || 0)))}%` }}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">{text.openTasks}: {latestProject.open_task_count ?? 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text.delayedTasks}: {latestProject.delayed_task_count ?? 0}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text.nextDeadline}: {formatDateTime(latestProject.next_deadline, i18n.language)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{text.noProject}</p>
          )}

          <div className="space-y-3">
            {(planning.my_tasks || []).slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                  <Badge variant={item.is_overdue ? "danger" : item.is_completed ? "success" : "info"}>
                    {item.is_completed ? text.done : item.is_overdue ? text.followUp : text.inProgress}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {item.project?.name || text.noProjectFallback} - {formatDateTime(item.due_date || item.end_date, i18n.language)}
                </p>
              </div>
            ))}
            {!(planning.my_tasks || []).length && <p className="text-sm text-slate-500">{text.noTasks}</p>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.chartsTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text.chartsHint}</p>
            </div>
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{text.salaryTrend}</p>
                <MiniBars items={salaryBars} language={i18n.language} formatter={(value, language) => formatAmount(value, language)} emptyText={text.emptyChart} />
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">{text.timeTracking}</p>
                <MiniBars items={workloadBars} emptyText={text.emptyChart} />
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.notificationsAgendaTitle}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text.notificationsAgendaHint}</p>
            </div>

            <div className="space-y-3">
              {(notifications.items || []).slice(0, 5).map((item) => (
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
              {agendaItems.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <Badge variant="neutral">{String(item.category || "other").replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {formatDateTime(item.start_at, i18n.language)} - {item.location || text.noLocation}
                  </p>
                </div>
              ))}
              {!agendaItems.length && <p className="text-sm text-slate-500">{text.noAppointments}</p>}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
