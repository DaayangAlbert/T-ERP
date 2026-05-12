"use client";

import { useState } from "react";
import { X, Cog, Trash2, FileWarning, Eye } from "lucide-react";
import { clsx } from "clsx";
import {
  useArchivalAutoProcess,
  useDestructionPv,
  type DestructionPvResponse,
} from "@/hooks/useGedSearch";

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  onClose: () => void;
}

export function ArchivalPolicyDialog({ onClose }: Props) {
  const autoProcess = useArchivalAutoProcess();
  const pv = useDestructionPv();
  const [pvPreview, setPvPreview] = useState<DestructionPvResponse | null>(null);
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
            <Cog className="h-4 w-4 text-violet-600" /> Politique d'archivage
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {feedback && (
            <div
              className={clsx(
                "rounded-md border px-3 py-2 text-[11.5px]",
                feedback.kind === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800",
              )}
            >
              {feedback.msg}
            </div>
          )}

          {/* Job mensuel */}
          <section className="rounded-lg border border-line p-3">
            <h3 className="text-[12.5px] font-semibold text-ink">Job mensuel d'archivage automatique</h3>
            <p className="mt-1 text-[11.5px] text-ink-3">
              Bascule les documents :
            </p>
            <ul className="mt-1 list-disc pl-5 text-[11.5px] text-ink-3">
              <li>
                <strong>Actifs &gt; 2 ans</strong> → semi-actifs (consultation rare)
              </li>
              <li>
                <strong>Semi-actifs en fin de DUA</strong> sans gel légal → en attente de destruction
              </li>
            </ul>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={autoProcess.isPending}
                onClick={() => {
                  setFeedback(null);
                  autoProcess.mutate(undefined, {
                    onSuccess: (r) =>
                      setFeedback({
                        kind: "ok",
                        msg: `Job exécuté : ${r.summary.movedToSemiActive} → semi-actif, ${r.summary.movedToPendingDestruction} → à détruire.`,
                      }),
                    onError: (e) => setFeedback({ kind: "err", msg: e.message }),
                  });
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Cog className="h-3.5 w-3.5" />
                {autoProcess.isPending ? "Exécution…" : "Lancer le job mensuel"}
              </button>
            </div>
          </section>

          {/* PV destruction */}
          <section className="rounded-lg border border-rose-200 bg-rose-50/30 p-3">
            <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-rose-800">
              <FileWarning className="h-4 w-4" /> Procès-verbal de destruction
            </h3>
            <p className="mt-1 text-[11.5px] text-rose-700">
              Génère un PV mensuel listant tous les documents en attente de destruction (sans gel légal). Le PV
              nécessite la double signature ARCHIVIST + DG avant exécution.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pv.isPending}
                onClick={() => {
                  setFeedback(null);
                  pv.mutate(
                    { applyDestruction: false },
                    {
                      onSuccess: (r) => {
                        setPvPreview(r);
                        setFeedback({
                          kind: "ok",
                          msg: `Aperçu PV ${r.pv.reference} généré : ${r.pv.totalDocuments} documents.`,
                        });
                      },
                      onError: (e) => setFeedback({ kind: "err", msg: e.message }),
                    },
                  );
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-50"
              >
                <Eye className="h-3.5 w-3.5" /> {pv.isPending && !confirmExecute ? "Génération…" : "Générer aperçu PV"}
              </button>
              {pvPreview && pvPreview.pv.totalDocuments > 0 && (
                <button
                  type="button"
                  disabled={pv.isPending}
                  onClick={() => {
                    if (!confirmExecute) {
                      setConfirmExecute(true);
                      setFeedback({
                        kind: "err",
                        msg: "Re-cliquez pour confirmer la destruction définitive (irréversible).",
                      });
                      return;
                    }
                    setFeedback(null);
                    pv.mutate(
                      { applyDestruction: true },
                      {
                        onSuccess: (r) => {
                          setPvPreview(r);
                          setConfirmExecute(false);
                          setFeedback({
                            kind: "ok",
                            msg: `PV ${r.pv.reference} exécuté : ${r.pv.totalDocuments} documents détruits.`,
                          });
                        },
                        onError: (e) => {
                          setConfirmExecute(false);
                          setFeedback({ kind: "err", msg: e.message });
                        },
                      },
                    );
                  }}
                  className={clsx(
                    "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white disabled:opacity-50",
                    confirmExecute ? "bg-rose-700 hover:bg-rose-800" : "bg-rose-600 hover:bg-rose-700",
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {confirmExecute ? "Confirmer la destruction" : "Exécuter la destruction"}
                </button>
              )}
            </div>

            {pvPreview && (
              <div className="mt-3 rounded-md border border-line bg-white p-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-mono text-[12px] font-bold text-violet-700">{pvPreview.pv.reference}</h4>
                  <span className="text-[10.5px] text-ink-3">
                    Généré le {fmtDate(pvPreview.pv.generatedAt)}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider text-ink-3">Documents</div>
                    <div className="font-bold text-ink">{pvPreview.pv.totalDocuments}</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider text-ink-3">Volume libéré</div>
                    <div className="font-semibold text-ink">{formatVolume(pvPreview.pv.totalSizeBytes)}</div>
                  </div>
                </div>
                {pvPreview.pv.documents.length > 0 && (
                  <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-line rounded border border-line">
                    {pvPreview.pv.documents.slice(0, 8).map((d) => (
                      <li key={d.id} className="px-2 py-1 text-[10.5px]">
                        <span className="font-mono font-bold text-violet-700">{d.classificationPrefix ?? "—"}</span>{" "}
                        <span className="text-ink">{d.name}</span>
                        <div className="text-[10px] text-ink-3">
                          DUA fin {fmtDate(d.duaEndDate)} · {formatVolume(d.sizeBytes)}
                        </div>
                      </li>
                    ))}
                    {pvPreview.pv.documents.length > 8 && (
                      <li className="px-2 py-1 text-center text-[10.5px] text-ink-3">
                        … et {pvPreview.pv.documents.length - 8} autres
                      </li>
                    )}
                  </ul>
                )}
                {pvPreview.executed && (
                  <div className="mt-2 rounded bg-emerald-50 px-2 py-1 text-[10.5px] font-semibold text-emerald-700">
                    ✓ Exécution enregistrée — documents marqués DESTROYED
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
