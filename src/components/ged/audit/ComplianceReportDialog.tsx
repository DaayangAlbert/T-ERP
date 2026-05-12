"use client";

import { useState } from "react";
import { X, FileBarChart, Download, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useComplianceReport } from "@/hooks/useGedAudit";

interface Props {
  onClose: () => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function scoreTone(score: number, target: number): string {
  if (score >= target) return "text-emerald-700";
  if (score >= target - 10) return "text-amber-700";
  return "text-rose-700";
}

export function ComplianceReportDialog({ onClose }: Props) {
  const [period, setPeriod] = useState<"YTD" | "month" | "year">("YTD");
  const { data, isLoading, refetch } = useComplianceReport(period, true);

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-conformite-${period}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-violet-600" />
            <h2 className="text-[14px] font-bold text-ink">Rapport de conformité</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-line px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {(["YTD", "month", "year"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    "inline-flex h-8 items-center rounded-md px-2.5 text-[11.5px] font-semibold transition",
                    period === p
                      ? "bg-violet-600 text-white"
                      : "border border-line bg-white text-ink hover:bg-surface-alt",
                  )}
                >
                  {p === "YTD" ? "Année en cours" : p === "month" ? "30 jours" : "12 mois glissants"}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2.5 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
              >
                <RefreshCw className="h-3 w-3" /> Actualiser
              </button>
              <button
                type="button"
                onClick={downloadJson}
                disabled={!data}
                className="inline-flex h-8 items-center gap-1 rounded-md bg-violet-600 px-2.5 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Download className="h-3 w-3" /> Télécharger JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-20 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Score global */}
              <section className="rounded-lg border border-line bg-gradient-to-br from-violet-50 to-white p-4">
                <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Score global de conformité</div>
                <div className="mt-1 flex items-baseline gap-3">
                  <div className={clsx("text-[40px] font-bold leading-none", scoreTone(data.overallScore, 90))}>
                    {data.overallScore}%
                  </div>
                  <div className="text-[11.5px] text-ink-3">
                    Cible ISO 9001 ≥ 90% · période {fmtDate(data.periodFrom)} → {fmtDate(data.periodTo)}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
                  <Component label="Indexation" value={data.scoreComponents.indexation} target={95} />
                  <Component label="SLA workflows" value={data.scoreComponents.workflowSla} target={80} />
                  <Component label="Complétion wf" value={data.scoreComponents.workflowCompletion} target={80} />
                  <Component label="Résolution anomalies" value={data.scoreComponents.anomalyResolution} target={100} />
                </div>
              </section>

              {/* Indexation par espace */}
              <section className="rounded-lg border border-line">
                <header className="border-b border-line px-3 py-2">
                  <h3 className="text-[12.5px] font-semibold text-ink">
                    Indexation par espace ({data.indexation.indexedDocs}/{data.indexation.totalDocs} · {data.indexation.rate}%)
                  </h3>
                </header>
                <ul className="max-h-40 divide-y divide-line overflow-y-auto">
                  {data.indexation.bySpace.slice(0, 12).map((s) => (
                    <li key={s.code} className="flex items-center gap-2 px-3 py-1.5 text-[11.5px]">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{s.name}</span>
                      <span className="font-mono text-ink-3">
                        {s.indexed}/{s.total}
                      </span>
                      <span
                        className={clsx(
                          "w-12 text-right font-mono font-bold",
                          s.rate >= 95 ? "text-emerald-700" : s.rate >= 85 ? "text-violet-700" : "text-amber-700",
                        )}
                      >
                        {s.rate}%
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Workflows + access + anomalies + retention */}
              <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Workflows traités" value={data.workflows.total} suffix="" />
                <MiniStat label="Demandes accès" value={data.accessRequests.total} suffix={`, ${data.accessRequests.approvalRate}% approuv.`} />
                <MiniStat label="Anomalies" value={data.anomalies.total} suffix={`, ${data.anomalies.resolutionRate}% résolues`} />
                <MiniStat
                  label="Rétention"
                  value={data.retention.pendingDestruction}
                  suffix={`à détruire`}
                  tone={data.retention.pendingDestruction > 0 ? "amber" : "ok"}
                />
              </section>

              {data.retention.overdueDuaWithoutHold > 0 && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] text-rose-800">
                  ⚠ <strong>{data.retention.overdueDuaWithoutHold}</strong> document(s) en fin de DUA non bloqués par gel
                  légal — à traiter par le job mensuel d'archivage.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Component({ label, value, target }: { label: string; value: number; target: number }) {
  const ok = value >= target;
  return (
    <div className="rounded border border-line bg-white p-2">
      <div className="text-[9.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("mt-0.5 text-[14px] font-bold", ok ? "text-emerald-700" : "text-amber-700")}>
        {value}%
      </div>
    </div>
  );
}

function MiniStat({ label, value, suffix, tone = "ok" }: { label: string; value: number; suffix: string; tone?: "ok" | "amber" }) {
  return (
    <div className={clsx("rounded border bg-white p-2", tone === "amber" ? "border-amber-200" : "border-line")}>
      <div className="text-[9.5px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx("text-[16px] font-bold", tone === "amber" ? "text-amber-700" : "text-ink")}>{value}</div>
      <div className="text-[10px] text-ink-3">{suffix}</div>
    </div>
  );
}
