"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  AlertOctagon,
  CheckCircle2,
  Play,
  Pause,
  X,
  Trash2,
  Pencil,
  Flag,
  Users as UsersIcon,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useCcTeams,
  useCcTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useSiteWorkforce,
  type TaskItem,
} from "@/hooks/useCcPlanning";
import { useCcSite } from "@/contexts/CcSiteContext";
import { TASK_STATUS_LABEL, TASK_PRIORITY_LABEL } from "@/schemas/cc-planning";

const STATUS_TONES: Record<TaskItem["status"], string> = {
  PLANNED: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-sky-100 text-sky-800 border-sky-300",
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  BLOCKED: "bg-rose-100 text-rose-800 border-rose-300",
  CANCELLED: "bg-stone-100 text-stone-600 border-stone-200",
};

const PRIORITY_BADGE: Record<TaskItem["priority"], string> = {
  LOW: "bg-slate-50 text-slate-600",
  NORMAL: "bg-violet-50 text-violet-700",
  HIGH: "bg-rose-50 text-rose-700",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function PlanningTab() {
  const { site } = useCcSite();
  const [date, setDate] = useState(todayISO());
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const { data: tasksData, isLoading } = useCcTasks({
    date,
    teamId: teamFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: teamsData } = useCcTeams({ includeInactive: false });

  const teams = teamsData?.items ?? [];
  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData?.items]);
  const summary = tasksData?.summary;

  const grouped = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    const noTeamKey = "__no_team__";
    for (const t of tasks) {
      const key = t.teamId ?? noTeamKey;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  return (
    <div className="space-y-3">
      {/* Date picker + filtres */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 shadow-card">
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, -1))}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        />
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, 1))}
          className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white hover:bg-surface-alt"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setDate(todayISO())}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt"
        >
          <CalendarIcon className="h-4 w-4" /> Aujourd&apos;hui
        </button>

        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Toutes équipes</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
        >
          <option value="">Tous statuts</option>
          {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={!site}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[13px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </button>
      </div>

      {/* Headline date */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold capitalize text-ink">{fmtDateFr(date)}</h2>
        {summary && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
            <StatusChip label="Plan." n={summary.planned} tone="slate" />
            <StatusChip label="En cours" n={summary.inProgress} tone="sky" />
            <StatusChip label="Faits" n={summary.done} tone="emerald" />
            <StatusChip label="Bloqués" n={summary.blocked} tone="rose" />
          </div>
        )}
      </div>

      {/* Tasks list */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : tasks.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <CalendarIcon className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucune tâche planifiée</p>
          <p className="mt-1 text-[12px] text-ink-3">Cliquez sur « Nouvelle tâche » pour démarrer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([teamId, list]) => {
            const team = teams.find((t) => t.id === teamId);
            return (
              <section key={teamId} className="rounded-xl border border-line bg-white p-3 shadow-card">
                <header className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: team?.color ?? "#94a3b8" }}
                  />
                  <h3 className="text-[13.5px] font-bold text-ink">
                    {team ? team.name : "Sans équipe"}
                  </h3>
                  <span className="text-[11px] text-ink-3">— {list.length} tâche{list.length > 1 ? "s" : ""}</span>
                </header>
                <ul className="space-y-2">
                  {list.map((task) => (
                    <li key={task.id}>
                      <TaskCard task={task} onEdit={() => setEditingTask(task)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {createOpen && site && (
        <TaskFormModal
          mode="create"
          siteId={site.id}
          defaultDate={date}
          teams={teams}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {editingTask && site && (
        <TaskFormModal
          mode="edit"
          siteId={site.id}
          defaultDate={date}
          teams={teams}
          task={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function StatusChip({ label, n, tone }: { label: string; n: number; tone: "slate" | "sky" | "emerald" | "rose" }) {
  const cls = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-800",
    emerald: "bg-emerald-100 text-emerald-800",
    rose: "bg-rose-100 text-rose-800",
  }[tone];
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold", cls)}>
      {label} · {n}
    </span>
  );
}

function TaskCard({ task, onEdit }: { task: TaskItem; onEdit: () => void }) {
  const update = useUpdateTask();
  const del = useDeleteTask();

  const quickSetStatus = (status: TaskItem["status"]) => {
    update.mutate({ id: task.id, data: { status } });
  };

  return (
    <article
      className={clsx(
        "rounded-lg border p-3 transition",
        STATUS_TONES[task.status],
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold", PRIORITY_BADGE[task.priority])}>
              <Flag className="h-2.5 w-2.5" /> {TASK_PRIORITY_LABEL[task.priority]}
            </span>
            <h4 className="truncate text-[13px] font-bold text-ink">{task.title}</h4>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            {(task.plannedStartTime || task.plannedEndTime) && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                {task.plannedStartTime ?? "?"} – {task.plannedEndTime ?? "?"}
              </span>
            )}
            {task.location && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {task.location}
              </span>
            )}
            {task.assignees.length > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <UsersIcon className="h-3 w-3" />
                {task.assignees.slice(0, 2).map((a) => `${a.firstName.charAt(0)}. ${a.lastName}`).join(", ")}
                {task.assignees.length > 2 && ` +${task.assignees.length - 2}`}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-white"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </header>

      {task.description && (
        <p className="mt-1.5 line-clamp-2 text-[11.5px] text-ink-2">{task.description}</p>
      )}

      {task.status === "BLOCKED" && task.blockedReason && (
        <p className="mt-1.5 inline-flex items-start gap-1 rounded bg-rose-50 px-1.5 py-1 text-[11px] text-rose-800">
          <AlertOctagon className="mt-0.5 h-3 w-3 flex-shrink-0" />
          {task.blockedReason}
        </p>
      )}

      {/* Progress bar */}
      {task.status !== "CANCELLED" && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10.5px] text-ink-3">
            <span>Avancement</span>
            <span className="font-semibold">{task.progressPercent}%</span>
          </div>
          <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                task.status === "DONE" ? "bg-emerald-500" : task.status === "BLOCKED" ? "bg-rose-500" : "bg-violet-500",
              )}
              style={{ width: `${task.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      <footer className="mt-2 flex items-center gap-1.5">
        {task.status === "PLANNED" && (
          <QuickBtn icon={<Play className="h-3 w-3" />} onClick={() => quickSetStatus("IN_PROGRESS")}>
            Démarrer
          </QuickBtn>
        )}
        {task.status === "IN_PROGRESS" && (
          <>
            <QuickBtn icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => quickSetStatus("DONE")}>
              Terminer
            </QuickBtn>
            <QuickBtn icon={<Pause className="h-3 w-3" />} onClick={() => quickSetStatus("BLOCKED")}>
              Bloquer
            </QuickBtn>
          </>
        )}
        {task.status === "BLOCKED" && (
          <QuickBtn icon={<Play className="h-3 w-3" />} onClick={() => quickSetStatus("IN_PROGRESS")}>
            Reprendre
          </QuickBtn>
        )}
        {(task.status === "PLANNED" || task.status === "CANCELLED") && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Supprimer cette tâche ?")) del.mutate(task.id);
            }}
            className="ml-auto grid h-6 w-6 place-items-center rounded text-rose-600 hover:bg-white"
            title="Supprimer"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </footer>
    </article>
  );
}

function QuickBtn({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center gap-1 rounded bg-white px-1.5 text-[10.5px] font-semibold text-ink-2 hover:bg-violet-50 hover:text-violet-700"
    >
      {icon} {children}
    </button>
  );
}

// ---------------- Modal create / edit task ----------------
function TaskFormModal({
  mode,
  siteId,
  defaultDate,
  teams,
  task,
  onClose,
}: {
  mode: "create" | "edit";
  siteId: string;
  defaultDate: string;
  teams: Array<{ id: string; name: string }>;
  task?: TaskItem;
  onClose: () => void;
}) {
  const workforce = useSiteWorkforce();
  const create = useCreateTask();
  const update = useUpdateTask();
  const del = useDeleteTask();

  const [form, setForm] = useState({
    teamId: task?.teamId ?? "",
    title: task?.title ?? "",
    description: task?.description ?? "",
    location: task?.location ?? "",
    scheduledDate: task ? task.scheduledDate.slice(0, 10) : defaultDate,
    plannedStartTime: task?.plannedStartTime ?? "",
    plannedEndTime: task?.plannedEndTime ?? "",
    priority: (task?.priority ?? "NORMAL") as TaskItem["priority"],
    status: (task?.status ?? "PLANNED") as TaskItem["status"],
    progressPercent: task?.progressPercent ?? 0,
    assigneeUserIds: task?.assigneeUserIds ?? [],
    blockedReason: task?.blockedReason ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      create.mutate(
        {
          siteId,
          teamId: form.teamId || null,
          title: form.title,
          description: form.description || null,
          location: form.location || null,
          scheduledDate: new Date(form.scheduledDate).toISOString(),
          plannedStartTime: form.plannedStartTime || null,
          plannedEndTime: form.plannedEndTime || null,
          priority: form.priority,
          assigneeUserIds: form.assigneeUserIds,
        },
        { onSuccess: () => onClose() },
      );
    } else if (task) {
      update.mutate(
        {
          id: task.id,
          data: {
            teamId: form.teamId || null,
            title: form.title,
            description: form.description || null,
            location: form.location || null,
            scheduledDate: new Date(form.scheduledDate).toISOString(),
            plannedStartTime: form.plannedStartTime || null,
            plannedEndTime: form.plannedEndTime || null,
            priority: form.priority,
            status: form.status,
            progressPercent: Number(form.progressPercent),
            assigneeUserIds: form.assigneeUserIds,
            blockedReason: form.status === "BLOCKED" ? form.blockedReason || null : null,
          },
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-[15px] font-bold text-ink">
            {mode === "create" ? "Nouvelle tâche" : "Modifier la tâche"}
          </h2>
          <button onClick={onClose} type="button" className="grid h-7 w-7 place-items-center rounded hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-3 overflow-y-auto p-4">
          <Field label="Titre">
            <input
              required
              minLength={2}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Description (optionnel)">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Date">
              <input
                type="date"
                required
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Équipe (optionnel)">
              <select
                value={form.teamId}
                onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                className={inputCls}
              >
                <option value="">— Aucune —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Début">
              <input
                type="time"
                value={form.plannedStartTime}
                onChange={(e) => setForm({ ...form, plannedStartTime: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Fin">
              <input
                type="time"
                value={form.plannedEndTime}
                onChange={(e) => setForm({ ...form, plannedEndTime: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Priorité">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskItem["priority"] })}
                className={inputCls}
              >
                <option value="LOW">Basse</option>
                <option value="NORMAL">Normale</option>
                <option value="HIGH">Haute</option>
              </select>
            </Field>
          </div>

          <Field label="Zone du chantier (optionnel)">
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="R+1, fondations, bâtiment B..."
              className={inputCls}
            />
          </Field>

          <Field label="Personnes assignées" hint="En plus des membres de l'équipe">
            <div className="max-h-40 overflow-y-auto rounded-md border border-line bg-white">
              {(workforce.data?.members ?? []).length === 0 ? (
                <p className="p-2 text-[12px] text-ink-3">Aucun collaborateur disponible.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {(workforce.data?.members ?? []).map((p) => {
                    const checked = form.assigneeUserIds.includes(p.id);
                    return (
                      <li key={p.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-surface-alt">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const set = new Set(form.assigneeUserIds);
                              if (set.has(p.id)) set.delete(p.id);
                              else set.add(p.id);
                              setForm({ ...form, assigneeUserIds: Array.from(set) });
                            }}
                          />
                          <span className="text-[12.5px]">{p.lastName} {p.firstName}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Field>

          {mode === "edit" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Statut">
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TaskItem["status"] })}
                    className={inputCls}
                  >
                    {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Avancement (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progressPercent}
                    onChange={(e) => setForm({ ...form, progressPercent: Number(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
              </div>
              {form.status === "BLOCKED" && (
                <Field label="Motif du blocage">
                  <textarea
                    rows={2}
                    value={form.blockedReason}
                    onChange={(e) => setForm({ ...form, blockedReason: e.target.value })}
                    className="w-full rounded-md border border-line bg-white p-2 text-[12.5px]"
                  />
                </Field>
              )}
            </>
          )}

          {(create.error || update.error) && (
            <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">
              {((create.error ?? update.error) as Error).message}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            {mode === "edit" && task && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Supprimer définitivement cette tâche ?")) {
                    del.mutate(task.id, { onSuccess: () => onClose() });
                  }
                }}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 text-[12.5px] text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={onClose} className="h-9 rounded-md border border-line bg-white px-3 text-[12.5px] hover:bg-surface-alt">
                Annuler
              </button>
              <button
                type="submit"
                disabled={create.isPending || update.isPending}
                className="h-9 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {mode === "create" ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- shared ----------
const inputCls =
  "h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[10.5px] text-ink-3">{hint}</span>}
    </label>
  );
}
