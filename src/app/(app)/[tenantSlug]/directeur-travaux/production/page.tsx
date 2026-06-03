"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Image as ImageIcon, ClipboardList } from "lucide-react";
import { clsx } from "clsx";
import { useChantier } from "@/contexts/ChantierContext";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravProductionTutorial } from "@/components/help/tutorials/DtravProductionTutorial";

interface DailyReport {
  id: string;
  reportDate: string;
  status: string;
  workforcePresent: number;
  workforcePlanned: number;
  normalHours: number;
  overtimeHours: number;
  justifiedAbsences: number;
  productionValue: number;
  consumedMaterials: Array<{ code?: string; label?: string; quantity: number; unit: string }>;
  tasksCompleted: Array<{ task: string; quantity: number; unit: string; value: number }>;
  incidents: string | null;
  photos: string[];
  submittedBy: { firstName: string; lastName: string } | null;
  validatedBy: { firstName: string; lastName: string } | null;
  rejectReason: string | null;
}

export default function ProductionPage() {
  const { activeChantierId, activeChantier } = useChantier();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const [photosOpen, setPhotosOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dtrav", "daily-reports", activeChantierId],
    enabled: !!activeChantierId,
    queryFn: async () => {
      const res = await fetch(`/api/dtrav/sites/${activeChantierId}/daily-reports`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: DailyReport[];
        kpis: { todayProduction: number; monthProduction: number; toValidate: number; planningRate: number };
      }>;
    },
  });

  const action = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "validate" | "reject"; reason?: string }) => {
      const res = await fetch(`/api/dtrav/daily-reports/${id}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dtrav", "daily-reports"] });
      setSelected(null);
    },
  });

  const toValidate = data?.items.find((r) => r.status === "SUBMITTED") ?? null;
  const history = data?.items.filter((r) => r.id !== toValidate?.id) ?? [];

  return (
    <div id="screen-dtrav-production" className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Production journalière</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {activeChantier?.code} — validation des rapports terrain du chef de chantier.
          </p>
        </div>
        <PageHelp title="Aide — Production"><DtravProductionTutorial /></PageHelp>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Production jour" value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.todayProduction ?? 0)))}`} hint="FCFA" />
        <Kpi label="Cumul mois" value={`${new Intl.NumberFormat("fr-FR").format(Math.round((data?.kpis.monthProduction ?? 0)))}`} hint="FCFA" />
        <Kpi label="À valider" value={(data?.kpis.toValidate ?? 0).toString()} accent="warning" />
        <Kpi label="Taux prod./planifié" value={`${data?.kpis.planningRate ?? 0}%`} accent="success" />
      </section>

      {toValidate && (
        <section className="rounded-xl border border-warning/40 bg-warning/5 p-3 shadow-card sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-ink">
                Rapport du {new Date(toValidate.reportDate).toLocaleDateString("fr-FR")} · à valider
              </h2>
              <p className="text-[11.5px] text-ink-3">
                Soumis par {toValidate.submittedBy?.firstName} {toValidate.submittedBy?.lastName}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <section className="rounded-md border border-line bg-white p-2">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Pointage équipe</h3>
              <dl className="grid grid-cols-2 gap-2 text-[12px]">
                <dt className="text-ink-3">Présents</dt>
                <dd className="text-right font-medium">
                  {toValidate.workforcePresent} / {toValidate.workforcePlanned}
                </dd>
                <dt className="text-ink-3">Heures normales</dt>
                <dd className="text-right">{toValidate.normalHours.toFixed(1)} h</dd>
                <dt className="text-ink-3">Heures sup.</dt>
                <dd className="text-right">{toValidate.overtimeHours.toFixed(1)} h</dd>
                <dt className="text-ink-3">Absences justifiées</dt>
                <dd className="text-right">{toValidate.justifiedAbsences}</dd>
              </dl>
            </section>

            <section className="rounded-md border border-line bg-white p-2">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Production · {new Intl.NumberFormat("fr-FR").format(Math.round(toValidate.productionValue))} FCFA
              </h3>
              {toValidate.tasksCompleted.length === 0 ? (
                <p className="text-[12px] text-ink-3">Aucune tâche déclarée.</p>
              ) : (
                <ul className="space-y-1 text-[12px]">
                  {toValidate.tasksCompleted.slice(0, 4).map((t, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-ink-2">{t.task}</span>
                      <span className="tabular-nums text-ink-3">
                        {t.quantity} {t.unit} · {new Intl.NumberFormat("fr-FR").format(Math.round(t.value))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-md border border-line bg-white p-2 sm:col-span-2">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Consommations</h3>
              {toValidate.consumedMaterials.length === 0 ? (
                <p className="text-[12px] text-ink-3">Aucune consommation.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {toValidate.consumedMaterials.map((m, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-line bg-surface-alt px-2 py-0.5 text-[11.5px] text-ink-2"
                    >
                      {m.label ?? m.code} : {m.quantity} {m.unit}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {toValidate.incidents && (
              <section className="rounded-md border border-danger/30 bg-danger/5 p-2 sm:col-span-2">
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-danger">Incidents</h3>
                <p className="text-[12.5px] text-ink">{toValidate.incidents}</p>
              </section>
            )}
          </div>

          <div className="sticky bottom-2 mt-3 flex flex-wrap justify-end gap-2 sm:static">
            {toValidate.photos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelected(toValidate);
                  setPhotosOpen(true);
                }}
                style={{ minHeight: 44 }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-medium text-ink-2 sm:flex-none"
              >
                <ImageIcon className="h-4 w-4" /> Photos ({toValidate.photos.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const reason = window.prompt("Motif du refus (consommation, incohérence...)");
                if (reason) action.mutate({ id: toValidate.id, action: "reject", reason });
              }}
              style={{ minHeight: 44 }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-danger/40 bg-white px-3 text-[13px] font-medium text-danger hover:bg-danger/5 sm:flex-none"
            >
              <XCircle className="h-4 w-4" /> Refuser
            </button>
            <button
              type="button"
              onClick={() => action.mutate({ id: toValidate.id, action: "validate" })}
              disabled={action.isPending}
              style={{ minHeight: 44 }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-success px-3 text-[13px] font-medium text-white hover:bg-success/90 disabled:opacity-50 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" /> Valider le rapport
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Historique 30 jours
        </h2>
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="p-6 text-center text-[12.5px] text-ink-3">Aucun rapport.</p>
        ) : (
          <ul className="divide-y divide-line">
            {history.map((r) => (
              <li key={r.id} className="flex items-center justify-between p-3 text-[12.5px]">
                <div>
                  <div className="font-medium text-ink">
                    {new Date(r.reportDate).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="text-[11.5px] text-ink-3">
                    {r.workforcePresent}/{r.workforcePlanned} présents · {new Intl.NumberFormat("fr-FR").format(Math.round(r.productionValue))} FCFA
                  </div>
                </div>
                <span
                  className={clsx(
                    "rounded px-2 py-0.5 text-[11px] font-medium",
                    r.status === "VALIDATED" && "bg-success/10 text-success",
                    r.status === "REJECTED" && "bg-danger/10 text-danger",
                    r.status === "SUBMITTED" && "bg-warning/10 text-warning",
                    r.status === "DRAFT" && "bg-ink-3/10 text-ink-3"
                  )}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {photosOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPhotosOpen(false)}>
          <div className="grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-3" onClick={(e) => e.stopPropagation()}>
            {selected.photos.map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-48 w-full rounded-md object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <ClipboardList className="h-4 w-4 text-primary-600" />
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "warning" && "text-warning",
          accent === "success" && "text-success",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}
