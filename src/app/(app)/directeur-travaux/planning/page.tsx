"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, CheckCircle2, Edit3, X } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";

interface Phase {
  id: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  progressPercent: number;
  status: string;
  tasks: Array<{ id: string; name: string; plannedStart: string; plannedEnd: string; progressPercent: number }>;
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

export default function PlanningPage() {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();
  const [editPhase, setEditPhase] = useState<Phase | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "planning", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/planning`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        planning: { totalDurationDays: number } | null;
        phases: Phase[];
        milestones: Milestone[];
        kpis: {
          overallProgress: number;
          delayDays: number;
          nextMilestone: { code: string; daysToGo: number } | null;
          finalDelivery: { code: string; daysToGo: number } | null;
        } | null;
      }>;
    },
  });

  const updatePhase = useMutation({
    mutationFn: async ({ id, progressPercent }: { id: string; progressPercent: number }) => {
      const res = await fetch(`/api/dtrav/planning/phases/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressPercent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav", "planning"] });
      setEditPhase(null);
    },
  });

  const reachMilestone = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dtrav/planning/milestones/${id}/reach`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dtrav", "planning"] }),
  });

  return (
    <div id="screen-dtrav-planning" className="space-y-3">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Planning chantier</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeChantier?.code} — phases, tâches, jalons MOA.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Avancement" value={`${data?.kpis?.overallProgress ?? 0}%`} accent="success" />
        <Kpi label="Retard cumulé" value={`${data?.kpis?.delayDays ?? 0} j`} accent={data?.kpis?.delayDays ? "danger" : undefined} />
        <Kpi
          label="Jalon prochain"
          value={data?.kpis?.nextMilestone ? `${data.kpis.nextMilestone.code} · J+${data.kpis.nextMilestone.daysToGo}` : "—"}
        />
        <Kpi
          label="Livraison"
          value={data?.kpis?.finalDelivery ? `J+${data.kpis.finalDelivery.daysToGo}` : "—"}
        />
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Phases
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data?.phases.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucune phase planifiée.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.phases.map((ph) => (
              <li key={ph.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{ph.name}</span>
                      <span
                        className={clsx(
                          "rounded px-2 py-0.5 text-[10.5px] font-medium",
                          ph.status === "COMPLETED" && "bg-success/10 text-success",
                          ph.status === "IN_PROGRESS" && "bg-primary-50 text-primary-700",
                          ph.status === "DELAYED" && "bg-danger/10 text-danger",
                          ph.status === "PLANNED" && "bg-ink-3/10 text-ink-3"
                        )}
                      >
                        {ph.status}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-3">
                      {new Date(ph.plannedStart).toLocaleDateString("fr-FR")} →{" "}
                      {new Date(ph.plannedEnd).toLocaleDateString("fr-FR")} · {ph.tasks.length} tâches
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditPhase(ph)}
                    style={{ minHeight: 36 }}
                    className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] font-medium text-ink-2"
                  >
                    <Edit3 className="h-3 w-3" /> Avancement
                  </button>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className={clsx(
                      "h-full",
                      ph.progressPercent >= 100 ? "bg-success" : "bg-primary-500"
                    )}
                    style={{ width: `${ph.progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-[11px] font-medium text-ink-2">
                  {ph.progressPercent}%
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Jalons contractuels MOA
        </h2>
        {data?.milestones.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun jalon défini.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data?.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div>
                  <div className="font-medium text-ink">
                    {m.code} — {m.description}
                  </div>
                  <div className="text-[11.5px] text-ink-3">
                    Échéance contractuelle {new Date(m.contractDueDate).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "rounded px-2 py-0.5 text-[11px] font-medium",
                      m.status === "REACHED" && "bg-success/10 text-success",
                      m.status === "LATE" && "bg-danger/10 text-danger",
                      m.status === "UPCOMING" && "bg-primary-50 text-primary-700",
                      m.status === "MOA_VALIDATED" && "bg-success/20 text-success",
                      m.status === "MISSED" && "bg-danger/15 text-danger"
                    )}
                  >
                    {m.status}
                  </span>
                  {m.status === "UPCOMING" && (
                    <button
                      type="button"
                      onClick={() => reachMilestone.mutate(m.id)}
                      style={{ minHeight: 36 }}
                      className="inline-flex items-center gap-1 rounded-md bg-success px-3 text-[11.5px] font-medium text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marquer atteint
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editPhase && (
        <ProgressModal
          phase={editPhase}
          onClose={() => setEditPhase(null)}
          onSave={(p) => updatePhase.mutate({ id: editPhase.id, progressPercent: p })}
          pending={updatePhase.isPending}
        />
      )}
    </div>
  );
}

function ProgressModal({
  phase,
  onClose,
  onSave,
  pending,
}: {
  phase: Phase;
  onClose: () => void;
  onSave: (p: number) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(phase.progressPercent);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-xl bg-white p-4 shadow-xl sm:rounded-xl">
        <header className="flex items-center justify-between border-b border-line pb-2">
          <h2 className="text-[14px] font-semibold text-ink">Avancement · {phase.name}</h2>
          <button type="button" onClick={onClose} className="text-ink-3">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="mt-4 space-y-2">
          <label className="text-[12px] font-medium text-ink-2">
            Avancement (%)
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <div className="mt-1 text-center text-2xl font-bold text-ink">{value}%</div>
          </label>
        </div>
        <footer className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} style={{ minHeight: 40 }} className="rounded-md border border-line-2 bg-white px-3 text-[12.5px]">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => onSave(value)}
            disabled={pending}
            style={{ minHeight: 40 }}
            className="rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
        </footer>
      </div>
    </div>
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
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}
