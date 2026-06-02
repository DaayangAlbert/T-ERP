"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  Plus,
  Trash2,
  X,
  Download,
  Edit3,
  FileText,
  ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

type Horizon = "MONTHLY" | "WEEKLY";
type Status = "DRAFT" | "PUBLISHED";

interface PlanListItem {
  id: string;
  horizon: Horizon;
  periodStart: string;
  periodEnd: string;
  title: string | null;
  objective: string | null;
  status: Status;
  tasksCount: number;
  author: string;
  authorRole: string;
}

interface Task {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  progressPercent: number;
  assignedTeamId: string | null;
  notes: string | null;
}

interface PlanDetail {
  id: string;
  horizon: Horizon;
  periodStart: string;
  periodEnd: string;
  title: string | null;
  objective: string | null;
  status: Status;
  tasks: Task[];
  canEdit: boolean;
}

type Tab = "MONTHLY" | "WEEKLY" | "DAILY";

const TAB_LABEL: Record<Tab, string> = {
  MONTHLY: "Mensuel",
  WEEKLY: "Hebdomadaire",
  DAILY: "Journalier",
};

interface Props {
  /** Lien vers la page DailyPlan existante (varie selon l'espace CDT vs DTrav). */
  dailyPlanHref?: string;
}

export function PlanningOperationnel({ dailyPlanHref = "/conducteur-travaux/plan" }: Props) {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("MONTHLY");
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const horizonForList: Horizon | null = tab === "DAILY" ? null : tab;

  const list = useQuery({
    queryKey: ["op-plans", activeChantierId, horizonForList],
    enabled: !!activeChantierId && horizonForList !== null,
    queryFn: async () => {
      const res = await fetch(
        `/api/operational-plans?siteId=${activeChantierId}&horizon=${horizonForList}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as { items: PlanListItem[] };
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/operational-plans/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-plans"] }),
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Planning opérationnel
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {activeChantier?.code ?? "—"} — déclinaison du planning général en horizons mensuel, hebdomadaire et journalier. Rédigé conjointement par le Directeur des Travaux et le Conducteur de Travaux.
          </p>
        </div>
      </header>

      {!activeChantierId && (
        <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
          Sélectionne un chantier dans la barre supérieure.
        </div>
      )}

      {activeChantierId && (
        <>
          {/* Onglets */}
          <div className="flex gap-1 border-b border-line">
            {(["MONTHLY", "WEEKLY", "DAILY"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={clsx(
                  "relative whitespace-nowrap px-4 py-2 text-[13px] font-medium transition",
                  tab === t ? "text-primary-700" : "text-ink-3 hover:text-ink",
                )}
              >
                {TAB_LABEL[t]}
                {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
              </button>
            ))}
          </div>

          {tab === "DAILY" ? (
            <DailyTabRedirect dailyPlanHref={dailyPlanHref} />
          ) : (
            <section className="rounded-xl border border-line bg-white shadow-card">
              <header className="flex items-center justify-between border-b border-line px-3 py-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                  Plannings {TAB_LABEL[tab].toLowerCase()}s ({list.data?.items.length ?? 0})
                </h2>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[13px] font-semibold text-white hover:bg-primary-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Nouveau planning {tab === "MONTHLY" ? "mensuel" : "hebdomadaire"}
                </button>
              </header>
              {list.isLoading ? (
                <div className="space-y-2 p-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />
                  ))}
                </div>
              ) : list.data?.items.length === 0 ? (
                <p className="p-8 text-center text-[12.5px] text-ink-3">
                  Aucun planning {TAB_LABEL[tab].toLowerCase()} créé. Clique sur « Nouveau planning » pour commencer.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {list.data?.items.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-surface-alt cursor-pointer"
                      onClick={() => setOpenPlan(p.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-ink">
                            {p.title ?? defaultTitle(p.horizon, p.periodStart)}
                          </span>
                          <StatusChip status={p.status} />
                          <span className="text-[10.5px] text-ink-3">
                            · {p.tasksCount} tâche{p.tasksCount > 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-ink-3">
                          {fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)} · par {p.author}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 gap-1">
                        <a
                          href={`/api/operational-plans/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener"
                          title="Télécharger PDF"
                          onClick={(e) => e.stopPropagation()}
                          className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-primary-700 hover:border-primary-300"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Supprimer ce planning ?`)) deletePlan.mutate(p.id);
                          }}
                          title="Supprimer"
                          className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-3 hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {creating && tab !== "DAILY" && (
        <CreateModal
          siteId={activeChantierId!}
          horizon={tab as Horizon}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            qc.invalidateQueries({ queryKey: ["op-plans"] });
            setCreating(false);
            setOpenPlan(id);
          }}
        />
      )}
      {openPlan && (
        <PlanEditor planId={openPlan} onClose={() => setOpenPlan(null)} onChange={() => qc.invalidateQueries({ queryKey: ["op-plans"] })} />
      )}
    </div>
  );
}

// ───────── Onglet journalier ─────────
function DailyTabRedirect({ dailyPlanHref }: { dailyPlanHref: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-6 shadow-card">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary-600" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">Planning journalier</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Le journalier (affectation des équipes du jour) est saisi dans la page dédiée du Conducteur de Travaux.
          </p>
        </div>
        <Link
          href={dailyPlanHref}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <ExternalLink className="h-4 w-4" /> Ouvrir le plan du jour
        </Link>
      </div>
    </div>
  );
}

// ───────── Modale création ─────────
function CreateModal({
  siteId,
  horizon,
  onClose,
  onCreated,
}: {
  siteId: string;
  horizon: Horizon;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const today = new Date();
  const defaultEnd = new Date(today);
  if (horizon === "MONTHLY") defaultEnd.setMonth(today.getMonth() + 1);
  else defaultEnd.setDate(today.getDate() + 6);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState(today.toISOString().slice(0, 10));
  const [end, setEnd] = useState(defaultEnd.toISOString().slice(0, 10));
  const [objective, setObjective] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!start || !end) return setError("Dates requises.");
    if (new Date(end) <= new Date(start)) return setError("Date de fin invalide.");
    setSaving(true);
    const res = await fetch(`/api/operational-plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        siteId,
        horizon,
        periodStart: new Date(start).toISOString(),
        periodEnd: new Date(end).toISOString(),
        title: title.trim() || undefined,
        objective: objective.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? `Erreur (HTTP ${res.status})`);
      return;
    }
    const json = (await res.json()) as { id: string };
    onCreated(json.id);
  }

  return (
    <Modal title={`Nouveau planning ${horizon === "MONTHLY" ? "mensuel" : "hebdomadaire"}`} onClose={onClose}>
      <Field label="Titre (optionnel)">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={horizon === "MONTHLY" ? "Ex: Mai 2026" : "Ex: Semaine 21"}
          className={INPUT}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Début" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Fin" required>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <Field label="Objectif de la période">
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={3}
          placeholder="Ex: Finaliser les fondations et démarrer l'élévation R+1"
          className={`${INPUT} h-auto py-2`}
        />
      </Field>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

// ───────── Modale édition (plan + tâches) ─────────
function PlanEditor({ planId, onClose, onChange }: { planId: string; onClose: () => void; onChange: () => void }) {
  const qc = useQueryClient();
  const [editingTask, setEditingTask] = useState<Task | "new" | null>(null);

  const plan = useQuery({
    queryKey: ["op-plan", planId],
    queryFn: async () => {
      const res = await fetch(`/api/operational-plans/${planId}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PlanDetail;
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/operational-plans/tasks/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-plan", planId] });
      onChange();
    },
  });

  return (
    <Modal
      title={
        plan.data
          ? plan.data.title ?? defaultTitle(plan.data.horizon, plan.data.periodStart)
          : "Chargement…"
      }
      onClose={onClose}
      wide
    >
      {plan.isLoading || !plan.data ? (
        <div className="space-y-2 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border border-line bg-surface-alt p-3 text-[12.5px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-2">
                <strong>Période :</strong> {fmtDate(plan.data.periodStart)} → {fmtDate(plan.data.periodEnd)}
              </span>
              <StatusChip status={plan.data.status} />
            </div>
            {plan.data.objective && (
              <p className="mt-2 text-[12px] text-ink-3">
                <strong>Objectif : </strong>
                {plan.data.objective}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              Tâches ({plan.data.tasks.length})
            </h3>
            <div className="flex gap-2">
              <a
                href={`/api/operational-plans/${planId}/pdf`}
                target="_blank"
                rel="noopener"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
              {plan.data.canEdit && (
                <button
                  type="button"
                  onClick={() => setEditingTask("new")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Tâche
                </button>
              )}
            </div>
          </div>

          {plan.data.tasks.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-line bg-white p-6 text-center text-[12.5px] text-ink-3">
              Aucune tâche. Clique sur « + Tâche » pour en ajouter.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {plan.data.tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{t.name}</div>
                    <div className="text-[11px] text-ink-3">
                      {fmtDate(t.plannedStart)} → {fmtDate(t.plannedEnd)} · {Math.round(t.progressPercent)}%
                      {t.assignedTeamId && ` · équipe ${t.assignedTeamId}`}
                    </div>
                    {t.notes && <div className="mt-0.5 text-[11px] text-ink-3 italic">{t.notes}</div>}
                  </div>
                  {plan.data?.canEdit && (
                    <div className="flex flex-shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingTask(t)}
                        className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-2 hover:border-primary-300"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer la tâche "${t.name}" ?`)) deleteTask.mutate(t.id);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-3 hover:border-rose-300 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {editingTask && (
        <TaskModal
          planId={planId}
          task={editingTask === "new" ? null : editingTask}
          onClose={() => setEditingTask(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["op-plan", planId] });
            onChange();
            setEditingTask(null);
          }}
        />
      )}
    </Modal>
  );
}

// ───────── Modale tâche ─────────
function TaskModal({
  planId,
  task,
  onClose,
  onDone,
}: {
  planId: string;
  task: Task | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!task;
  const [name, setName] = useState(task?.name ?? "");
  const [start, setStart] = useState(task?.plannedStart.slice(0, 10) ?? "");
  const [end, setEnd] = useState(task?.plannedEnd.slice(0, 10) ?? "");
  const [progress, setProgress] = useState(task?.progressPercent ?? 0);
  const [team, setTeam] = useState(task?.assignedTeamId ?? "");
  const [notes, setNotes] = useState(task?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Le nom est requis.");
    if (!start || !end) return setError("Dates requises.");
    if (new Date(end) <= new Date(start)) return setError("Date de fin invalide.");
    setSaving(true);
    const body = {
      name: name.trim(),
      plannedStart: new Date(start).toISOString(),
      plannedEnd: new Date(end).toISOString(),
      progressPercent: progress,
      assignedTeamId: team.trim() || null,
      notes: notes.trim() || null,
    };
    const url = editing
      ? `/api/operational-plans/tasks/${task.id}`
      : `/api/operational-plans/${planId}/tasks`;
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? `Erreur (HTTP ${res.status})`);
      return;
    }
    onDone();
  }

  return (
    <Modal title={editing ? `Modifier · ${task.name}` : "Nouvelle tâche"} onClose={onClose}>
      <Field label="Nom de la tâche" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Coffrage poteaux R+1 zone Nord"
          className={INPUT}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Début" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Fin" required>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Équipe affectée">
          <input
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="Ex: Équipe Coffrage A"
            className={INPUT}
          />
        </Field>
        <Field label={`Avancement (${progress}%)`}>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </Field>
      </div>
      <Field label="Notes / consignes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Précisions techniques, ressources spécifiques…"
          className={`${INPUT} h-auto py-2`}
        />
      </Field>
      {error && <ErrorBox>{error}</ErrorBox>}
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

// ───────── Helpers ─────────

const INPUT =
  "mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-ink-4 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={clsx(
          "w-full max-h-[90vh] space-y-3 overflow-auto rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded text-ink-3 hover:bg-surface-alt">
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <footer className="mt-2 flex justify-end gap-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 items-center rounded-md border border-line-2 bg-white px-4 text-sm text-ink-2"
      >
        Annuler
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </footer>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 ring-1 ring-rose-200">{children}</p>;
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={clsx(
        "rounded px-2 py-0.5 text-[10.5px] font-medium",
        status === "PUBLISHED" ? "bg-success/10 text-success" : "bg-ink-3/10 text-ink-3",
      )}
    >
      {status === "PUBLISHED" ? "Publié" : "Brouillon"}
    </span>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function defaultTitle(horizon: Horizon, start: string): string {
  const d = new Date(start);
  if (horizon === "MONTHLY") {
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());
  }
  // Calcule numéro de semaine ISO
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `Semaine ${weekNum} (${d.toLocaleDateString("fr-FR", { year: "numeric" })})`;
}
