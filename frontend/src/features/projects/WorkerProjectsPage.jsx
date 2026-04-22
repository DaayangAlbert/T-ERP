import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/AuthContext";
import { useApiQuery } from "@/shared/hooks/useApiQuery";

function formatProjectDate(value, language) {
  if (!value) {
    return "--";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat(language?.startsWith("en") ? "en-US" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}

const COPY = {
  fr: {
    eyebrow: "Chantier affecte",
    title: "Mon projet",
    description: "Vous voyez uniquement le chantier auquel vous etes affecte, avec vos taches, l'avancement reel, l'equipe terrain et les documents utiles.",
    visibleProject: "Projet visible",
    myTasks: "Mes taches",
    projectList: "Liste chantier",
    projectListHint: "L'affichage reste volontairement simple, en liste, sans bloc de gestion de marches ni creation projet.",
    viewAgenda: "Voir mon agenda",
    contactTeam: "Contacter l'equipe",
    loadingProject: "Chargement du chantier...",
    noAssignedProject: "Aucun chantier actif ne vous est encore assigne.",
    noDeadline: "Sans echeance",
    status: "Statut",
    location: "Lieu",
    client: "Client",
    plannedEnd: "Fin previsionnelle",
    siteTasks: "Mes taches sur le chantier",
    siteTasksHint: "Priorites du jour, echeances et responsabilites qui vous concernent directement.",
    noPersonalTask: "Aucune tache personnelle n'est encore rattachee a ce chantier.",
    noDetail: "Sans detail complementaire.",
    start: "Debut",
    dueDate: "Echeance",
    progress: "Avancement",
    teamTitle: "Equipe projet",
    teamHint: "Liste de terrain utile pour savoir qui intervient sur le chantier.",
    teamFallback: "Equipe",
    noRoleDetail: "Sans precision de poste.",
    noAssignment: "Aucune affectation visible pour ce chantier.",
    documentsTitle: "Documents visibles",
    documentsHint: "Les pieces terrain deja chargees sur le chantier.",
    noDocument: "Aucun document chantier n'est encore visible ici.",
  },
  en: {
    eyebrow: "Assigned site",
    title: "My project",
    description: "You only see the site you are assigned to, with your tasks, live progress, field team, and useful documents.",
    visibleProject: "Visible project",
    myTasks: "My tasks",
    projectList: "Project list",
    projectListHint: "The display intentionally stays simple, list-based, with no tender management or project creation block.",
    viewAgenda: "View my agenda",
    contactTeam: "Contact the team",
    loadingProject: "Loading project...",
    noAssignedProject: "No active site has been assigned to you yet.",
    noDeadline: "No deadline",
    status: "Status",
    location: "Location",
    client: "Client",
    plannedEnd: "Planned end",
    siteTasks: "My site tasks",
    siteTasksHint: "Today's priorities, deadlines, and responsibilities that directly concern you.",
    noPersonalTask: "No personal task is linked to this site yet.",
    noDetail: "No additional detail.",
    start: "Start",
    dueDate: "Deadline",
    progress: "Progress",
    teamTitle: "Project team",
    teamHint: "Field list to quickly see who is active on the site.",
    teamFallback: "Team",
    noRoleDetail: "No role detail provided.",
    noAssignment: "No assignment is visible for this site.",
    documentsTitle: "Visible documents",
    documentsHint: "Field documents already uploaded on the site.",
    noDocument: "No site document is visible here yet.",
  },
};

export function WorkerProjectsPage() {
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("en") ? "en" : "fr";
  const text = COPY[locale];
  const { user } = useAuth();
  const { data: projectsData, loading: loadingProjects, error: projectsError } = useApiQuery("/projects");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const workspaceQuery = useApiQuery(selectedProjectId ? `/projects/${selectedProjectId}/workspace` : "/projects/0/workspace", {
    enabled: Boolean(selectedProjectId),
  });

  const projectItems = projectsData?.items || [];
  const selectedWorkspace = workspaceQuery.data;
  const selectedProject = selectedWorkspace?.project || projectItems[0] || null;
  const teamItems = selectedWorkspace?.assignments?.items || [];
  const documentItems = selectedWorkspace?.documents?.items || [];

  const myTasks = useMemo(() => {
    const taskItems = selectedWorkspace?.tasks?.items || [];
    return taskItems
      .filter((item) => Number(item.assigned_to_user_id) === Number(user?.id) || Number(item.responsible_user_id) === Number(user?.id))
      .sort((left, right) => String(left.due_date || left.end_date || "").localeCompare(String(right.due_date || right.end_date || "")));
  }, [selectedWorkspace?.tasks?.items, user?.id]);

  useEffect(() => {
    if (!projectItems.length) {
      setSelectedProjectId(null);
      return;
    }
    if (!selectedProjectId || !projectItems.some((item) => item.id === selectedProjectId)) {
      setSelectedProjectId(projectItems[0].id);
    }
  }, [projectItems, selectedProjectId]);

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-slate-300 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.95))] text-white">
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/65">{text.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold">{text.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">{text.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">{text.visibleProject}</p>
              <p className="mt-2 text-3xl font-semibold">{projectItems.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-white/65">{text.myTasks}</p>
              <p className="mt-2 text-3xl font-semibold">{myTasks.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.projectList}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">{text.projectListHint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/app/planning">{text.viewAgenda}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/app/chat">{text.contactTeam}</Link>
            </Button>
          </div>
        </div>

        {loadingProjects && <p className="text-sm text-slate-500">{text.loadingProject}</p>}
        {projectsError && <p className="text-sm text-rose-600">{projectsError}</p>}
        {!loadingProjects && !projectItems.length && <p className="text-sm text-slate-500">{text.noAssignedProject}</p>}

        {!!projectItems.length && (
          <div className="space-y-3">
            {projectItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedProjectId(item.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  item.id === selectedProjectId
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-slate-100 dark:text-slate-950"
                    : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-70">{item.code}</p>
                    <p className="mt-1 text-lg font-semibold">{item.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info">{formatPercent(item.progress_percent)}</Badge>
                    <Badge variant={Number(item.days_remaining) < 0 ? "danger" : "neutral"}>
                      {item.days_remaining == null ? text.noDeadline : `${item.days_remaining} j`}
                    </Badge>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.status}</p>
                    <p className="mt-1 text-sm">{String(item.status || "").replaceAll("_", " ") || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.location}</p>
                    <p className="mt-1 text-sm">{item.location || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.client}</p>
                    <p className="mt-1 text-sm">{item.client_name || "--"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] opacity-65">{text.plannedEnd}</p>
                    <p className="mt-1 text-sm">{formatProjectDate(item.end_date, i18n.language)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selectedProject && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.siteTasks}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text.siteTasksHint}</p>
              </div>
              <Badge variant="neutral">{myTasks.length}</Badge>
            </div>

            {!myTasks.length && <p className="text-sm text-slate-500">{text.noPersonalTask}</p>}

            {!!myTasks.length && (
              <div className="space-y-3">
                {myTasks.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.description || item.responsibility || text.noDetail}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={item.status === "completed" ? "success" : item.status === "blocked" ? "danger" : "info"}>
                          {String(item.status || "").replaceAll("_", " ")}
                        </Badge>
                        <Badge variant={item.priority === "urgent" ? "danger" : item.priority === "high" ? "warning" : "neutral"}>
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{text.start}</p>
                        <p className="mt-1 text-sm text-slate-900 dark:text-white">{formatProjectDate(item.start_date, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{text.dueDate}</p>
                        <p className="mt-1 text-sm text-slate-900 dark:text-white">{formatProjectDate(item.end_date || item.due_date, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{text.progress}</p>
                        <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{formatPercent(item.progress_percent)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.teamTitle}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{text.teamHint}</p>
                </div>
                <Badge variant="neutral">{teamItems.length}</Badge>
              </div>
              <div className="space-y-3">
                {teamItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{item.user?.full_name || `#${item.user_id}`}</p>
                      <Badge variant={item.is_active ? "success" : "neutral"}>{item.project_role || text.teamFallback}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.responsibility || text.noRoleDetail}</p>
                  </div>
                ))}
                {!teamItems.length && <p className="text-sm text-slate-500">{text.noAssignment}</p>}
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{text.documentsTitle}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{text.documentsHint}</p>
                </div>
                <Badge variant="neutral">{documentItems.length}</Badge>
              </div>
              <div className="space-y-3">
                {documentItems.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                      <Badge variant="info">{String(item.category || "other").replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{formatProjectDate(item.document_date, i18n.language)}</p>
                  </div>
                ))}
                {!documentItems.length && <p className="text-sm text-slate-500">{text.noDocument}</p>}
              </div>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
