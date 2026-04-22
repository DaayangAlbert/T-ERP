import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LIST_SELECT_CLASS } from "@/components/ui/controlStyles";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiMutation } from "@/shared/hooks/useApiMutation";
import { useApiQuery } from "@/shared/hooks/useApiQuery";
import { canAccessTenantModules } from "@/shared/utils/tenantScope";


const SELECT_CLASS = LIST_SELECT_CLASS;

const COPY = {
  fr: {
    eyebrow: "Planning transverse",
    title: "Planning et agenda",
    subtitle:
      "Retrouvez vos taches de projet, votre agenda personnel et les echeances prioritaires dans un seul espace simple a piloter.",
    boundaryTitle: "Frontiere planning / paie",
    boundaryHint:
      "Le planning sert a organiser l'agenda, les rappels et les taches projet. Les demandes officielles de conge, d'absence et de retard restent traitees dans la paie.",
    boundaryPlanningTitle: "Dans planning",
    boundaryPlanningBody: "Agenda personnel, rappels, echeances, taches assignees et planification projet.",
    boundaryPayrollTitle: "Dans paie",
    boundaryPayrollBody: "Bulletins, synthese mensuelle, justificatifs d'absence ou de retard et demandes de conge.",
    boundaryPayrollAction: "Ouvrir la paie",
    boundaryAttendanceAction: "Ouvrir les presences",
    metricsAgenda: "Agenda cette periode",
    metricsToday: "Rendez-vous aujourd'hui",
    metricsUpcoming: "A venir",
    metricsDelayed: "Taches en retard",
    periodTitle: "Periode visible",
    periodHint: "Filtrez l'agenda sur une plage de dates pour garder une vue claire de la semaine ou du mois.",
    from: "Du",
    to: "Au",
    agendaTitle: "Agenda personnel",
    agendaHint: "Vos rendez-vous, rappels et actions de suivi restent modifiables ligne par ligne.",
    agendaEmpty: "Aucune entree sur cette plage pour le moment.",
    newEntry: "Nouvelle entree",
    saveEntry: "Enregistrer l'entree",
    savingEntry: "Enregistrement...",
    deleteEntry: "Supprimer",
    deletingEntry: "Suppression...",
    agendaSaved: "Agenda mis a jour.",
    agendaDeleted: "Entree supprimee.",
    agendaTitleField: "Objet",
    agendaCategoryField: "Categorie",
    agendaProjectField: "Projet lie",
    agendaLocationField: "Lieu",
    agendaStartField: "Debut",
    agendaEndField: "Fin",
    agendaDescriptionField: "Details utiles",
    agendaCompletedField: "Marquer comme traite",
    agendaAllDayField: "Toute la journee",
    tasksTitle: "Mes taches assignees",
    tasksHint: "Cochez une tache pour la marquer terminee, ou gardez-la en cours jusqu'a cloture.",
    tasksEmpty: "Aucune tache assignee sur cette periode.",
    taskCompleted: "Tache terminee",
    taskReopened: "Tache remise en cours.",
    taskUpdating: "Mise a jour...",
    planningTitle: "Planification d'equipe",
    planningHint:
      "Les responsables qui pilotent les projets peuvent preparer les prochaines actions et repartir les taches directement depuis ici.",
    planningReadOnly: "La vue projet n'est pas disponible pour ce profil. L'agenda personnel reste actif.",
    planningNeedsTenant: "Choisissez une entreprise active pour afficher la planification projet.",
    projectsTitle: "Vue projets",
    projectsEmpty: "Aucun projet actif n'est remonte dans ce planning.",
    projectsOpen: "Ouvrir l'espace projets",
    projectCode: "Code",
    projectName: "Projet",
    projectStatus: "Statut",
    projectProgress: "Avancement",
    projectNextDeadline: "Prochaine echeance",
    projectTeam: "Equipe",
    projectOpenTasks: "Taches ouvertes",
    composerTitle: "Ajouter une tache projet",
    composerHint: "Une saisie courte suffit pour preparer la semaine et donner un responsable.",
    composerProject: "Projet",
    composerAssignee: "Responsable / executant",
    composerTaskTitle: "Tache a lancer",
    composerPriority: "Priorite",
    composerStart: "Debut prevu",
    composerDue: "Echeance",
    composerDescription: "Instruction utile",
    composerSave: "Ajouter la tache",
    composerSaving: "Ajout...",
    composerSaved: "Tache projet ajoutee.",
    noAssignee: "Sans affectation",
    noProjectLink: "Aucun projet",
    projectLoading: "Chargement du planning...",
    agendaLoading: "Chargement de l'agenda...",
    categories: {
      meeting: "Reunion",
      task: "Tache",
      deadline: "Echeance",
      leave: "Indisponibilite",
      personal: "Personnel",
      follow_up: "Relance",
      other: "Autre",
    },
    priorities: {
      low: "Faible",
      medium: "Normale",
      high: "Haute",
      urgent: "Urgente",
    },
    statuses: {
      not_started: "Non demarree",
      in_progress: "En cours",
      blocked: "Bloquee",
      completed: "Terminee",
      done: "Terminee",
      todo: "A faire",
    },
  },
  en: {
    eyebrow: "Shared planning",
    title: "Planning and agenda",
    subtitle:
      "Track your assigned project tasks, personal agenda, and priority deadlines from one workspace that stays easy to scan.",
    boundaryTitle: "Planning / payroll boundary",
    boundaryHint:
      "Planning is for agenda organization, reminders, and project tasks. Official leave, absence, and lateness requests stay in payroll.",
    boundaryPlanningTitle: "In planning",
    boundaryPlanningBody: "Personal agenda, reminders, deadlines, assigned tasks, and project scheduling.",
    boundaryPayrollTitle: "In payroll",
    boundaryPayrollBody: "Payslips, monthly summary, absence or lateness proofs, and leave requests.",
    boundaryPayrollAction: "Open payroll",
    boundaryAttendanceAction: "Open attendance",
    metricsAgenda: "Agenda in range",
    metricsToday: "Today",
    metricsUpcoming: "Upcoming",
    metricsDelayed: "Delayed tasks",
    periodTitle: "Visible range",
    periodHint: "Filter the agenda by date so the week or month stays easy to read.",
    from: "From",
    to: "To",
    agendaTitle: "Personal agenda",
    agendaHint: "Your meetings, reminders, and follow-ups stay editable line by line.",
    agendaEmpty: "No agenda entry in this range yet.",
    newEntry: "New entry",
    saveEntry: "Save entry",
    savingEntry: "Saving...",
    deleteEntry: "Delete",
    deletingEntry: "Deleting...",
    agendaSaved: "Agenda updated.",
    agendaDeleted: "Entry deleted.",
    agendaTitleField: "Subject",
    agendaCategoryField: "Category",
    agendaProjectField: "Linked project",
    agendaLocationField: "Location",
    agendaStartField: "Start",
    agendaEndField: "End",
    agendaDescriptionField: "Useful details",
    agendaCompletedField: "Mark as done",
    agendaAllDayField: "All day",
    tasksTitle: "My assigned tasks",
    tasksHint: "Tick a task when it is done, or keep it in progress until the work is closed.",
    tasksEmpty: "No assigned task on this range.",
    taskCompleted: "Task marked complete.",
    taskReopened: "Task moved back in progress.",
    taskUpdating: "Updating...",
    planningTitle: "Team planning",
    planningHint:
      "Project leads can prepare the next actions and assign delivery work directly from this screen.",
    planningReadOnly: "Project planning is not available for this profile. Personal agenda remains active.",
    planningNeedsTenant: "Select an active company to display project planning.",
    projectsTitle: "Project view",
    projectsEmpty: "No active project is currently visible in this planning workspace.",
    projectsOpen: "Open projects workspace",
    projectCode: "Code",
    projectName: "Project",
    projectStatus: "Status",
    projectProgress: "Progress",
    projectNextDeadline: "Next deadline",
    projectTeam: "Team",
    projectOpenTasks: "Open tasks",
    composerTitle: "Add a project task",
    composerHint: "A short form is enough to prepare the week and assign a clear owner.",
    composerProject: "Project",
    composerAssignee: "Owner / assignee",
    composerTaskTitle: "Task to launch",
    composerPriority: "Priority",
    composerStart: "Planned start",
    composerDue: "Due date",
    composerDescription: "Useful instruction",
    composerSave: "Add task",
    composerSaving: "Adding...",
    composerSaved: "Project task added.",
    noAssignee: "Unassigned",
    noProjectLink: "No project",
    projectLoading: "Loading project planning...",
    agendaLoading: "Loading agenda...",
    categories: {
      meeting: "Meeting",
      task: "Task",
      deadline: "Deadline",
      leave: "Personal unavailability",
      personal: "Personal",
      follow_up: "Follow-up",
      other: "Other",
    },
    priorities: {
      low: "Low",
      medium: "Medium",
      high: "High",
      urgent: "Urgent",
    },
    statuses: {
      not_started: "Not started",
      in_progress: "In progress",
      blocked: "Blocked",
      completed: "Completed",
      done: "Completed",
      todo: "To do",
    },
  },
};

const CATEGORY_VALUES = ["meeting", "task", "deadline", "leave", "personal", "follow_up", "other"];
const PRIORITY_VALUES = ["low", "medium", "high", "urgent"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toLocalDatetimeValue(isoValue) {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDatetime(localValue) {
  if (!localValue) {
    return null;
  }

  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateTime(value, language) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value, language) {
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

function getStatusVariant(task) {
  if (task?.is_completed) {
    return "success";
  }
  if (task?.is_overdue || task?.status === "blocked") {
    return "danger";
  }
  if (task?.status === "in_progress") {
    return "info";
  }
  return "neutral";
}

function getPriorityVariant(priority) {
  if (priority === "urgent") {
    return "danger";
  }
  if (priority === "high") {
    return "warning";
  }
  if (priority === "medium") {
    return "info";
  }
  return "neutral";
}

function buildEmptyAgendaForm() {
  return {
    title: "",
    category: "meeting",
    project_id: "",
    location: "",
    start_at: "",
    end_at: "",
    description: "",
    is_completed: false,
    all_day: false,
  };
}

function buildEmptyTaskForm() {
  return {
    project_id: "",
    assigned_to_user_id: "",
    title: "",
    priority: "medium",
    start_date: "",
    due_date: "",
    description: "",
  };
}

function MetricCard({ label, value, tone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function PlanningPage() {
  const { i18n } = useTranslation();
  const { user, tenantId } = useAuth();
  const language = i18n.resolvedLanguage?.startsWith("fr") ? "fr" : "en";
  const copy = COPY[language];
  const today = useMemo(() => new Date(), []);
  const [rangeStart, setRangeStart] = useState(() => toDateInputValue(today));
  const [rangeEnd, setRangeEnd] = useState(() => toDateInputValue(addDays(today, 30)));
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [agendaForm, setAgendaForm] = useState(buildEmptyAgendaForm);
  const [taskForm, setTaskForm] = useState(buildEmptyTaskForm);
  const [feedback, setFeedback] = useState("");

  const canShowCompanyPlanning = canAccessTenantModules(user, tenantId);
  const canReadPayroll = Boolean(user?.user_type === "super_admin" || user?.permissions?.includes("payroll.read"));
  const canReadAttendance = Boolean(user?.user_type === "super_admin" || user?.permissions?.includes("attendance.read"));
  const overviewQuery = useApiQuery("/planning/overview", { enabled: Boolean(user) });
  const agendaQuery = useApiQuery("/planning/agenda", {
    enabled: Boolean(user),
    params: {
      date_from: `${rangeStart}T00:00:00.000Z`,
      date_to: `${rangeEnd}T23:59:59.000Z`,
      include_completed: true,
    },
  });

  const canReadProjects = Boolean(overviewQuery.data?.permissions?.can_read_projects);
  const canManageProjects = Boolean(overviewQuery.data?.permissions?.can_manage_projects);
  const projectsQuery = useApiQuery("/projects", {
    enabled: canReadProjects,
    params: { page_size: 100 },
  });
  const assignmentsUrl = taskForm.project_id ? `/projects/${taskForm.project_id}/assignments` : null;
  const assignmentsQuery = useApiQuery(assignmentsUrl, {
    enabled: canManageProjects && Boolean(taskForm.project_id),
  });

  const agendaMutation = useApiMutation();
  const taskMutation = useApiMutation();
  const taskComposerMutation = useApiMutation();

  const agendaItems = agendaQuery.data?.items || [];
  const projectItems = projectsQuery.data?.items || [];
  const projectAssignments = assignmentsQuery.data?.items || [];
  const overview = overviewQuery.data;
  const delayedTaskCount = (overview?.my_tasks || []).filter((item) => item.is_overdue).length;

  useEffect(() => {
    if (!selectedEntryId) {
      setAgendaForm(buildEmptyAgendaForm());
      return;
    }

    const current = agendaItems.find((item) => item.id === selectedEntryId);
    if (!current) {
      setSelectedEntryId(null);
      setAgendaForm(buildEmptyAgendaForm());
      return;
    }

    setAgendaForm({
      title: current.title || "",
      category: current.category || "meeting",
      project_id: current.project_id ? String(current.project_id) : "",
      location: current.location || "",
      start_at: toLocalDatetimeValue(current.start_at),
      end_at: toLocalDatetimeValue(current.end_at),
      description: current.description || "",
      is_completed: Boolean(current.is_completed),
      all_day: Boolean(current.all_day),
    });
  }, [agendaItems, selectedEntryId]);

  useEffect(() => {
    if (!taskForm.project_id) {
      return;
    }

    const hasSelectedAssignee = projectAssignments.some((assignment) => String(assignment.user_id) === taskForm.assigned_to_user_id);
    if (!hasSelectedAssignee && taskForm.assigned_to_user_id) {
      setTaskForm((current) => ({ ...current, assigned_to_user_id: "" }));
    }
  }, [projectAssignments, taskForm.assigned_to_user_id, taskForm.project_id]);

  const resetAgendaForm = () => {
    setSelectedEntryId(null);
    setAgendaForm(buildEmptyAgendaForm());
  };

  const saveAgendaEntry = async (event) => {
    event.preventDefault();
    setFeedback("");

    const payload = {
      title: agendaForm.title.trim(),
      category: agendaForm.category,
      project_id: agendaForm.project_id ? Number(agendaForm.project_id) : null,
      location: agendaForm.location.trim() || null,
      description: agendaForm.description.trim() || null,
      start_at: toIsoDatetime(agendaForm.start_at),
      end_at: toIsoDatetime(agendaForm.end_at),
      is_completed: agendaForm.is_completed,
      all_day: agendaForm.all_day,
    };

    const request = selectedEntryId
      ? agendaMutation.mutate({ method: "patch", url: `/planning/agenda/${selectedEntryId}`, data: payload })
      : agendaMutation.mutate({ method: "post", url: "/planning/agenda", data: payload });

    await request;
    await Promise.all([agendaQuery.refetch(), overviewQuery.refetch()]);
    setFeedback(copy.agendaSaved);
    resetAgendaForm();
  };

  const deleteAgendaEntry = async () => {
    if (!selectedEntryId) {
      return;
    }

    setFeedback("");
    await agendaMutation.mutate({ method: "delete", url: `/planning/agenda/${selectedEntryId}` });
    await Promise.all([agendaQuery.refetch(), overviewQuery.refetch()]);
    setFeedback(copy.agendaDeleted);
    resetAgendaForm();
  };

  const toggleTaskCompletion = async (task) => {
    setFeedback("");
    await taskMutation.mutate({
      method: "patch",
      url: `/planning/tasks/${task.id}/status`,
      data: { status: task.is_completed ? "in_progress" : "completed" },
    });
    await overviewQuery.refetch();
    setFeedback(task.is_completed ? copy.taskReopened : copy.taskCompleted);
  };

  const createProjectTask = async (event) => {
    event.preventDefault();
    setFeedback("");

    await taskComposerMutation.mutate({
      method: "post",
      url: `/projects/${taskForm.project_id}/tasks`,
      data: {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        assigned_to_user_id: taskForm.assigned_to_user_id ? Number(taskForm.assigned_to_user_id) : null,
        responsible_user_id: taskForm.assigned_to_user_id ? Number(taskForm.assigned_to_user_id) : null,
        priority: taskForm.priority,
        start_date: taskForm.start_date || null,
        due_date: taskForm.due_date || null,
        status: "not_started",
      },
    });

    await Promise.all([overviewQuery.refetch(), projectsQuery.refetch(), assignmentsQuery.refetch()]);
    setTaskForm(buildEmptyTaskForm());
    setFeedback(copy.composerSaved);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))] text-white dark:border-slate-700">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">{copy.eyebrow}</p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
            <p className="max-w-3xl text-sm text-white/78">{copy.subtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label={copy.metricsAgenda} value={agendaItems.length} tone="text-cyan-300" />
            <MetricCard label={copy.metricsToday} value={overview?.agenda_summary?.today_count || 0} tone="text-emerald-300" />
            <MetricCard label={copy.metricsUpcoming} value={overview?.agenda_summary?.upcoming_count || 0} tone="text-amber-300" />
            <MetricCard label={copy.metricsDelayed} value={delayedTaskCount} tone="text-rose-300" />
          </div>
        </div>
      </Card>

      {feedback ? (
        <Card className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-700/50 dark:bg-emerald-950/40">
          <p className="text-sm text-emerald-700 dark:text-emerald-200">{feedback}</p>
        </Card>
      ) : null}

      <Card className="space-y-4 border-sky-200 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.boundaryTitle}</h2>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">{copy.boundaryHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canReadAttendance ? (
              <Button asChild variant="ghost">
                <Link to="/app/attendance">{copy.boundaryAttendanceAction}</Link>
              </Button>
            ) : null}
            {canReadPayroll ? (
              <Button asChild variant="outline">
                <Link to="/app/payroll?focus=leave">{copy.boundaryPayrollAction}</Link>
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{copy.boundaryPlanningTitle}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{copy.boundaryPlanningBody}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{copy.boundaryPayrollTitle}</p>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{copy.boundaryPayrollBody}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.periodTitle}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{copy.periodHint}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.from}</span>
            <Input type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.to}</span>
            <Input type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
          </label>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.agendaTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{copy.agendaHint}</p>
          </div>

          {agendaQuery.loading ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.agendaLoading}</p> : null}
          {!agendaQuery.loading && !agendaItems.length ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.agendaEmpty}</p> : null}

          {!!agendaItems.length && (
            <div className="space-y-2">
              {agendaItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedEntryId(item.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedEntryId === item.id
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <Badge variant={item.is_completed ? "success" : "info"}>{copy.categories[item.category] || item.category}</Badge>
                    {item.project ? <Badge variant="neutral">{item.project.code}</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {formatDateTime(item.start_at, language)}
                    {item.end_at ? ` - ${formatDateTime(item.end_at, language)}` : ""}
                    {item.location ? ` - ${item.location}` : ""}
                  </p>
                </button>
              ))}
            </div>
          )}

          <form className="space-y-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-950/50" onSubmit={saveAgendaEntry}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedEntryId ? copy.saveEntry : copy.newEntry}</p>
              <Button type="button" variant="ghost" onClick={resetAgendaForm}>
                {copy.newEntry}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaTitleField}</span>
                <Input value={agendaForm.title} onChange={(event) => setAgendaForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaCategoryField}</span>
                <select
                  className={SELECT_CLASS}
                  value={agendaForm.category}
                  onChange={(event) => setAgendaForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {CATEGORY_VALUES.map((category) => (
                    <option key={category} value={category}>
                      {copy.categories[category] || category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaProjectField}</span>
                <select
                  className={SELECT_CLASS}
                  value={agendaForm.project_id}
                  onChange={(event) => setAgendaForm((current) => ({ ...current, project_id: event.target.value }))}
                >
                  <option value="">{copy.noProjectLink}</option>
                  {projectItems.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} - {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaLocationField}</span>
                <Input value={agendaForm.location} onChange={(event) => setAgendaForm((current) => ({ ...current, location: event.target.value }))} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaStartField}</span>
                <Input type="datetime-local" value={agendaForm.start_at} onChange={(event) => setAgendaForm((current) => ({ ...current, start_at: event.target.value }))} required />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaEndField}</span>
                <Input type="datetime-local" value={agendaForm.end_at} onChange={(event) => setAgendaForm((current) => ({ ...current, end_at: event.target.value }))} />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.agendaDescriptionField}</span>
              <Textarea rows={3} value={agendaForm.description} onChange={(event) => setAgendaForm((current) => ({ ...current, description: event.target.value }))} />
            </label>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-200">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={agendaForm.is_completed}
                  onChange={(event) => setAgendaForm((current) => ({ ...current, is_completed: event.target.checked }))}
                />
                <span>{copy.agendaCompletedField}</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={agendaForm.all_day} onChange={(event) => setAgendaForm((current) => ({ ...current, all_day: event.target.checked }))} />
                <span>{copy.agendaAllDayField}</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={agendaMutation.loading}>
                {agendaMutation.loading ? copy.savingEntry : copy.saveEntry}
              </Button>
              {selectedEntryId ? (
                <Button type="button" variant="outline" onClick={deleteAgendaEntry} disabled={agendaMutation.loading}>
                  {agendaMutation.loading ? copy.deletingEntry : copy.deleteEntry}
                </Button>
              ) : null}
            </div>
            {agendaMutation.error ? <p className="text-sm text-rose-600 dark:text-rose-300">{agendaMutation.error}</p> : null}
          </form>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.tasksTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">{copy.tasksHint}</p>
          </div>

          {overviewQuery.loading ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.projectLoading}</p> : null}
          {!overviewQuery.loading && !(overview?.my_tasks || []).length ? <p className="text-sm text-slate-500 dark:text-slate-300">{copy.tasksEmpty}</p> : null}

          <div className="space-y-3">
            {(overview?.my_tasks || []).map((task) => (
              <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-950/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{task.title}</p>
                      <Badge variant={getStatusVariant(task)}>{copy.statuses[task.status] || task.status}</Badge>
                      <Badge variant={getPriorityVariant(task.priority)}>{copy.priorities[task.priority] || task.priority}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {task.project ? `${task.project.code} - ${task.project.name}` : copy.noProjectLink}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(task.due_date || task.end_date || task.start_date, language)}
                      {task.assigned_user?.full_name ? ` - ${task.assigned_user.full_name}` : ""}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={task.is_completed}
                      disabled={!task.can_update || taskMutation.loading}
                      onChange={() => toggleTaskCompletion(task)}
                    />
                    <span>{taskMutation.loading ? copy.taskUpdating : copy.agendaCompletedField}</span>
                  </label>
                </div>
                {task.description ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{task.description}</p> : null}
              </div>
            ))}
          </div>
          {taskMutation.error ? <p className="text-sm text-rose-600 dark:text-rose-300">{taskMutation.error}</p> : null}
        </Card>
      </div>

      <Card className="space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{copy.planningTitle}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">{copy.planningHint}</p>
        </div>

        {!canShowCompanyPlanning ? <p className="text-sm text-amber-700 dark:text-amber-300">{copy.planningNeedsTenant}</p> : null}
        {canShowCompanyPlanning && !canReadProjects ? <p className="text-sm text-slate-600 dark:text-slate-300">{copy.planningReadOnly}</p> : null}

        {canReadProjects ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{copy.projectsTitle}</h3>
              <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" to="/app/projects">
                {copy.projectsOpen}
              </Link>
            </div>
            {!overview?.projects?.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">{copy.projectsEmpty}</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="bg-slate-100/90 dark:bg-slate-900/80">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectCode}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectName}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectStatus}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectProgress}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectNextDeadline}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectTeam}</th>
                      <th className="px-4 py-4 whitespace-nowrap">{copy.projectOpenTasks}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950/60">
                    {overview.projects.map((project) => (
                      <tr key={project.id} className="align-top transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-900/90">
                        <td className="px-4 py-4 text-slate-900 dark:text-white">{project.code}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{project.name}</td>
                        <td className="px-4 py-4">
                          <Badge variant={project.delayed_task_count ? "warning" : "info"}>{copy.statuses[project.status] || project.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{Math.round(project.progress_percent || 0)}%</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{formatDate(project.next_deadline, language)}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{project.assigned_people_count}</td>
                        <td className="px-4 py-4 text-slate-700 dark:text-slate-200">{project.open_task_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canManageProjects ? (
              <form className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-950/50" onSubmit={createProjectTask}>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{copy.composerTitle}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{copy.composerHint}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerProject}</span>
                    <select
                      className={SELECT_CLASS}
                      value={taskForm.project_id}
                      onChange={(event) => setTaskForm((current) => ({ ...current, project_id: event.target.value }))}
                      required
                    >
                      <option value="">{copy.composerProject}</option>
                      {projectItems.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.code} - {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerAssignee}</span>
                    <select
                      className={SELECT_CLASS}
                      value={taskForm.assigned_to_user_id}
                      onChange={(event) => setTaskForm((current) => ({ ...current, assigned_to_user_id: event.target.value }))}
                    >
                      <option value="">{copy.noAssignee}</option>
                      {projectAssignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.user_id}>
                          {assignment.user?.full_name || assignment.project_role}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerTaskTitle}</span>
                    <Input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerPriority}</span>
                    <select
                      className={SELECT_CLASS}
                      value={taskForm.priority}
                      onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value }))}
                    >
                      {PRIORITY_VALUES.map((priority) => (
                        <option key={priority} value={priority}>
                          {copy.priorities[priority] || priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerStart}</span>
                    <Input type="date" value={taskForm.start_date} onChange={(event) => setTaskForm((current) => ({ ...current, start_date: event.target.value }))} />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerDue}</span>
                    <Input type="date" value={taskForm.due_date} onChange={(event) => setTaskForm((current) => ({ ...current, due_date: event.target.value }))} />
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{copy.composerDescription}</span>
                  <Textarea rows={3} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} />
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={taskComposerMutation.loading}>
                    {taskComposerMutation.loading ? copy.composerSaving : copy.composerSave}
                  </Button>
                </div>
                {taskComposerMutation.error ? <p className="text-sm text-rose-600 dark:text-rose-300">{taskComposerMutation.error}</p> : null}
              </form>
            ) : null}
          </>
        ) : null}
      </Card>
    </div>
  );
}
