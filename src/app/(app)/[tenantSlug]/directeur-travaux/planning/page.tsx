"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarRange,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  X,
  Download,
  ChevronDown,
  ChevronRight,
  Flag,
  Layers,
  Sparkles,
  ArrowRight,
  ClipboardList,
  Save,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravPlanningTutorial } from "@/components/help/tutorials/DtravPlanningTutorial";

interface Task {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  progressPercent: number;
}
interface Phase {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  progressPercent: number;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED" | "CANCELLED";
  tasks: Task[];
}
interface Milestone {
  id: string;
  code: string;
  description: string;
  contractDueDate: string;
  forecastDate: string | null;
  actualDate: string | null;
  status: string;
  moaValidation: boolean;
}
interface PlanningResp {
  planning: { id: string; totalDurationDays: number; observations: string | null } | null;
  phases: Phase[];
  milestones: Milestone[];
  kpis: {
    overallProgress: number;
    delayDays: number;
    nextMilestone: { code: string; daysToGo: number } | null;
    finalDelivery: { code: string; daysToGo: number } | null;
  } | null;
}

const PHASE_STATUS_LABEL: Record<Phase["status"], string> = {
  PLANNED: "Planifiée",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  DELAYED: "En retard",
  CANCELLED: "Annulée",
};

export default function PlanningPage() {
  const { activeChantierId, activeChantier } = useChantier();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const qc = useQueryClient();
  const [openModal, setOpenModal] = useState<
    | { kind: "phase"; phase?: Phase }
    | { kind: "task"; phaseId: string; phaseName: string; task?: Task }
    | { kind: "milestone"; milestone?: Milestone }
    | null
  >(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "planning", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/planning`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PlanningResp;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["dtrav", "planning"] });

  const bootstrap = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/planning`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: invalidate,
  });

  const reachMilestone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/planning/milestones/${id}/reach`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: invalidate,
  });

  const deletePhase = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/planning/phases/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: invalidate,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/planning/tasks/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: invalidate,
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/planning/milestones/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: invalidate,
  });

  const toggleExpand = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pdfHref = `/api/dtrav/sites/${activeChantierId}/planning/pdf`;
  const hasPlanning = !!data?.planning;

  return (
    <div id="screen-dtrav-planning" className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Planning général (contractuel)
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {activeChantier?.code ?? "—"} — phases, tâches, jalons MOA. Document contractuel signé avec le maître d&apos;ouvrage.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${tenantSlug}/directeur-travaux/planning-operationnel`}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line-2 bg-white px-3 text-sm font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
          >
            Planning opérationnel <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {activeChantierId && hasPlanning && (
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white shadow-card hover:bg-primary-700"
            >
              <Download className="h-4 w-4" /> Télécharger le PDF
            </a>
          )}
          <PageHelp title="Aide — Planning g&eacute;n&eacute;ral"><DtravPlanningTutorial /></PageHelp>
        </div>
      </header>

      {!activeChantierId && (
        <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-[13px] text-ink-3">
          Sélectionne un chantier dans la barre supérieure pour gérer son planning.
        </div>
      )}

      {activeChantierId && !isLoading && !hasPlanning && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary-600" />
          <h2 className="mt-2 text-sm font-semibold text-ink">Aucun planning saisi pour ce chantier</h2>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Initialise le planning pour pouvoir ajouter des phases, tâches et jalons contractuels.
          </p>
          <button
            type="button"
            onClick={() => bootstrap.mutate()}
            disabled={bootstrap.isPending}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {bootstrap.isPending ? "Initialisation…" : "Initialiser le planning"}
          </button>
        </div>
      )}

      {hasPlanning && (
        <>
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Kpi label="Avancement" value={`${data?.kpis?.overallProgress ?? 0}%`} accent="success" />
            <Kpi
              label="Retard cumulé"
              value={`${data?.kpis?.delayDays ?? 0} j`}
              accent={data?.kpis?.delayDays ? "danger" : undefined}
            />
            <Kpi
              label="Jalon prochain"
              value={
                data?.kpis?.nextMilestone
                  ? `${data.kpis.nextMilestone.code} · J${data.kpis.nextMilestone.daysToGo >= 0 ? "+" : ""}${data.kpis.nextMilestone.daysToGo}`
                  : "—"
              }
            />
            <Kpi
              label="Livraison"
              value={data?.kpis?.finalDelivery ? `J${data.kpis.finalDelivery.daysToGo >= 0 ? "+" : ""}${data.kpis.finalDelivery.daysToGo}` : "—"}
            />
          </section>

          <section className="rounded-xl border border-line bg-white shadow-card">
            <header className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                <Layers className="h-3.5 w-3.5" /> Phases &amp; tâches
              </h2>
              <button
                type="button"
                onClick={() => setOpenModal({ kind: "phase" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
              >
                <Plus className="h-3.5 w-3.5" /> Phase
              </button>
            </header>
            {data?.phases.length === 0 ? (
              <p className="p-6 text-center text-[12.5px] text-ink-3">
                Aucune phase saisie. Commence par ajouter une phase (Gros œuvre, Second œuvre, etc.).
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data?.phases.map((ph) => (
                  <li key={ph.id} className="p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(ph.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                      >
                        {expanded.has(ph.id) ? (
                          <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">{ph.name}</span>
                            <StatusBadge status={ph.status} />
                          </div>
                          <div className="text-[11.5px] text-ink-3">
                            {fmtDate(ph.plannedStart)} → {fmtDate(ph.plannedEnd)} · {ph.tasks.length} tâche
                            {ph.tasks.length > 1 ? "s" : ""}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => setOpenModal({ kind: "phase", phase: ph })}
                          title="Modifier la phase"
                          className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-2 hover:border-primary-300 hover:text-primary-700"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer la phase "${ph.name}" et ses ${ph.tasks.length} tâche(s) ?`))
                              deletePhase.mutate(ph.id);
                          }}
                          title="Supprimer"
                          className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-3 hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
                      <div
                        className={clsx(
                          "h-full",
                          ph.progressPercent >= 100 ? "bg-success" : "bg-primary-500",
                        )}
                        style={{ width: `${ph.progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 text-right text-[11px] font-medium text-ink-2">
                      {Math.round(ph.progressPercent)}%
                    </div>

                    {expanded.has(ph.id) && (
                      <div className="mt-3 rounded-md border border-line bg-surface-alt p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                            Tâches ({ph.tasks.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenModal({ kind: "task", phaseId: ph.id, phaseName: ph.name })}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-line-2 bg-white px-2 text-[11.5px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
                          >
                            <Plus className="h-3 w-3" /> Tâche
                          </button>
                        </div>
                        {ph.tasks.length === 0 ? (
                          <p className="text-[11.5px] italic text-ink-3">Aucune tâche pour cette phase.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {ph.tasks.map((t) => (
                              <li
                                key={t.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-white px-2.5 py-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-[12.5px] font-medium text-ink">{t.name}</div>
                                  <div className="text-[11px] text-ink-3">
                                    {fmtDate(t.plannedStart)} → {fmtDate(t.plannedEnd)} ·{" "}
                                    {Math.round(t.progressPercent)}%
                                  </div>
                                </div>
                                <div className="flex flex-shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenModal({ kind: "task", phaseId: ph.id, phaseName: ph.name, task: t })
                                    }
                                    title="Modifier la tâche"
                                    className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:text-primary-700"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Supprimer la tâche "${t.name}" ?`)) deleteTask.mutate(t.id);
                                    }}
                                    title="Supprimer"
                                    className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-line bg-white shadow-card">
            <header className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                <Flag className="h-3.5 w-3.5" /> Jalons contractuels MOA
              </h2>
              <button
                type="button"
                onClick={() => setOpenModal({ kind: "milestone" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
              >
                <Plus className="h-3.5 w-3.5" /> Jalon
              </button>
            </header>
            {data?.milestones.length === 0 ? (
              <p className="p-6 text-center text-[12.5px] text-ink-3">
                Aucun jalon saisi. Ajoute les échéances contractuelles (J1, J2, livraison provisoire…).
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data?.milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink">
                        <span className="font-mono">{m.code}</span> — {m.description}
                      </div>
                      <div className="text-[11.5px] text-ink-3">
                        Échéance contractuelle {fmtDate(m.contractDueDate)}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <MilestoneBadge status={m.status} />
                      {m.status === "UPCOMING" && (
                        <button
                          type="button"
                          onClick={() => reachMilestone.mutate(m.id)}
                          style={{ minHeight: 32 }}
                          className="inline-flex items-center gap-1 rounded-md bg-success px-3 text-[11.5px] font-medium text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Atteint
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenModal({ kind: "milestone", milestone: m })}
                        title="Modifier le jalon"
                        className="grid h-8 w-8 place-items-center rounded-md border border-line-2 bg-white text-ink-2 hover:border-primary-300 hover:text-primary-700"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer le jalon "${m.code}" ?`)) deleteMilestone.mutate(m.id);
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

          <ObservationsSection
            siteId={activeChantierId!}
            initial={data?.planning?.observations ?? ""}
            onSaved={invalidate}
          />
        </>
      )}

      {openModal?.kind === "phase" && (
        <PhaseModal
          siteId={activeChantierId!}
          phase={openModal.phase}
          onClose={() => setOpenModal(null)}
          onDone={() => {
            invalidate();
            setOpenModal(null);
          }}
        />
      )}
      {openModal?.kind === "task" && (
        <TaskModal
          phaseId={openModal.phaseId}
          phaseName={openModal.phaseName}
          task={openModal.task}
          onClose={() => setOpenModal(null)}
          onDone={() => {
            invalidate();
            setOpenModal(null);
          }}
        />
      )}
      {openModal?.kind === "milestone" && (
        <MilestoneModal
          siteId={activeChantierId!}
          milestone={openModal.milestone}
          onClose={() => setOpenModal(null)}
          onDone={() => {
            invalidate();
            setOpenModal(null);
          }}
        />
      )}
    </div>
  );
}

// ───────── Modals ─────────

function PhaseModal({
  siteId,
  phase,
  onClose,
  onDone,
}: {
  siteId: string;
  phase?: Phase;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!phase;
  const [name, setName] = useState(phase?.name ?? "");
  const [start, setStart] = useState(phase?.plannedStart.slice(0, 10) ?? "");
  const [end, setEnd] = useState(phase?.plannedEnd.slice(0, 10) ?? "");
  const [progress, setProgress] = useState(phase?.progressPercent ?? 0);
  const [status, setStatus] = useState<Phase["status"]>(phase?.status ?? "PLANNED");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Le nom est requis.");
    if (!start || !end) return setError("Dates requises.");
    if (new Date(end) <= new Date(start)) return setError("La date de fin doit être après le début.");
    setSaving(true);
    const url = editing
      ? `/api/dtrav/planning/phases/${phase.id}`
      : `/api/dtrav/sites/${siteId}/planning/phases`;
    const body = editing
      ? {
          name: name.trim(),
          plannedStart: new Date(start).toISOString(),
          plannedEnd: new Date(end).toISOString(),
          progressPercent: progress,
          status,
        }
      : {
          name: name.trim(),
          plannedStart: new Date(start).toISOString(),
          plannedEnd: new Date(end).toISOString(),
        };
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
    <Modal title={editing ? `Modifier · ${phase.name}` : "Nouvelle phase"} onClose={onClose}>
      <Field label="Nom de la phase" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Terrassement, Gros œuvre, Second œuvre…"
          className={INPUT}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Début planifié" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Fin planifiée" required>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>
      {editing && (
        <div className="grid gap-2 sm:grid-cols-2">
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
          <Field label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value as Phase["status"])} className={INPUT}>
              {(Object.keys(PHASE_STATUS_LABEL) as Phase["status"][]).map((s) => (
                <option key={s} value={s}>
                  {PHASE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function TaskModal({
  phaseId,
  phaseName,
  task,
  onClose,
  onDone,
}: {
  phaseId: string;
  phaseName: string;
  task?: Task;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!task;
  const [name, setName] = useState(task?.name ?? "");
  const [start, setStart] = useState(task?.plannedStart.slice(0, 10) ?? "");
  const [end, setEnd] = useState(task?.plannedEnd.slice(0, 10) ?? "");
  const [progress, setProgress] = useState(task?.progressPercent ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Le nom est requis.");
    if (!start || !end) return setError("Dates requises.");
    if (new Date(end) <= new Date(start)) return setError("La date de fin doit être après le début.");
    setSaving(true);
    const url = editing
      ? `/api/dtrav/planning/tasks/${task.id}`
      : `/api/dtrav/planning/phases/${phaseId}/tasks`;
    const body = editing
      ? {
          name: name.trim(),
          plannedStart: new Date(start).toISOString(),
          plannedEnd: new Date(end).toISOString(),
          progressPercent: progress,
        }
      : {
          name: name.trim(),
          plannedStart: new Date(start).toISOString(),
          plannedEnd: new Date(end).toISOString(),
        };
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
    <Modal title={editing ? `Modifier · ${task.name}` : `Nouvelle tâche · ${phaseName}`} onClose={onClose}>
      <Field label="Nom de la tâche" required>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Coffrage poteaux niveau 1"
          className={INPUT}
        />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Début planifié" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={INPUT} />
        </Field>
        <Field label="Fin planifiée" required>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={INPUT} />
        </Field>
      </div>
      {editing && (
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
      )}
      {error && <ErrorBox>{error}</ErrorBox>}
      <ModalFooter onClose={onClose} onSave={submit} saving={saving} />
    </Modal>
  );
}

function MilestoneModal({
  siteId,
  milestone,
  onClose,
  onDone,
}: {
  siteId: string;
  milestone?: Milestone;
  onClose: () => void;
  onDone: () => void;
}) {
  const editing = !!milestone;
  const [code, setCode] = useState(milestone?.code ?? "");
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [due, setDue] = useState(milestone?.contractDueDate.slice(0, 10) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!code.trim()) return setError("Code requis.");
    if (!description.trim()) return setError("Description requise.");
    if (!due) return setError("Échéance requise.");
    setSaving(true);
    const url = editing
      ? `/api/dtrav/planning/milestones/${milestone.id}`
      : `/api/dtrav/sites/${siteId}/planning/milestones`;
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        code: code.trim(),
        description: description.trim(),
        contractDueDate: new Date(due).toISOString(),
      }),
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
    <Modal title={editing ? `Modifier jalon · ${milestone.code}` : "Nouveau jalon contractuel"} onClose={onClose}>
      <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
        <Field label="Code" required>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="J1"
            className={`${INPUT} font-mono uppercase`}
          />
        </Field>
        <Field label="Description" required>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Livraison provisoire bâtiment A"
            className={INPUT}
          />
        </Field>
      </div>
      <Field label="Échéance contractuelle" required>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={INPUT} />
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg space-y-3 rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
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

function ModalFooter({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
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

function StatusBadge({ status }: { status: Phase["status"] }) {
  return (
    <span
      className={clsx(
        "rounded px-2 py-0.5 text-[10.5px] font-medium",
        status === "COMPLETED" && "bg-success/10 text-success",
        status === "IN_PROGRESS" && "bg-primary-50 text-primary-700",
        status === "DELAYED" && "bg-danger/10 text-danger",
        status === "PLANNED" && "bg-ink-3/10 text-ink-3",
        status === "CANCELLED" && "bg-ink-3/10 text-ink-3 line-through",
      )}
    >
      {PHASE_STATUS_LABEL[status]}
    </span>
  );
}

function MilestoneBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    UPCOMING: ["À venir", "bg-primary-50 text-primary-700"],
    REACHED: ["Atteint", "bg-success/10 text-success"],
    LATE: ["En retard", "bg-danger/10 text-danger"],
    MOA_VALIDATED: ["Validé MOA", "bg-success/20 text-success"],
    MISSED: ["Manqué", "bg-danger/15 text-danger"],
  };
  const [label, cls] = map[status] ?? [status, "bg-ink-3/10 text-ink-3"];
  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>{label}</span>;
}

function ObservationsSection({
  siteId,
  initial,
  onSaved,
}: {
  siteId: string;
  initial: string;
  onSaved: () => void;
}) {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text !== initial;

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/dtrav/sites/${siteId}/planning`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ observations: text }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? `Erreur (HTTP ${res.status})`);
      return;
    }
    setSaved(true);
    onSaved();
    window.setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          <ClipboardList className="h-3.5 w-3.5" /> Observations
        </h2>
        <span className="text-[11px] text-ink-3">Affichées dans le PDF du planning</span>
      </header>
      <div className="p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={8000}
          placeholder="Remarques, contraintes particulières, hypothèses retenues, points de vigilance pour l'équipe…"
          className="block w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        {error && (
          <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700 ring-1 ring-rose-200">{error}</p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-ink-3">{text.length} / 8000 caractères</span>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-[12px] text-success">
                <Check className="h-3.5 w-3.5" /> Enregistré
              </span>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <CalendarRange className="h-4 w-4 text-primary-600" />
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "danger" && "text-danger",
          accent === "success" && "text-success",
          !accent && "text-ink",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
