"use client";

import { useState } from "react";
import { X, AlertOctagon, Search, Check, FileText, MapPin } from "lucide-react";
import { clsx } from "clsx";
import { useAnomalyDetail, useUpdateAnomaly } from "@/hooks/useGedAudit";

function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  anomalyId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

export function AnomalyDetailDrawer({ anomalyId, readOnly, onClose }: Props) {
  const { data, isLoading, isError } = useAnomalyDetail(anomalyId);
  const update = useUpdateAnomaly(anomalyId ?? "");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (!anomalyId) return null;

  const meta = (data?.metadata ?? {}) as { kind?: string; detail?: string };
  const isResolved = Boolean(data?.resolvedAt);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[520px]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-rose-600" />
              <h2 className="truncate text-[15px] font-bold text-ink">Anomalie détectée</h2>
              {isResolved ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                  Résolue
                </span>
              ) : (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-semibold text-rose-700">
                  Active
                </span>
              )}
            </div>
            {data && (
              <div className="mt-0.5 text-[11px] text-ink-3">
                {data.action} · {fmtDateTime(data.createdAt)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-16 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              Impossible de charger l'anomalie.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Détail rapide */}
              {meta.detail && (
                <p className="rounded-lg border border-rose-200 bg-rose-50/50 px-3 py-2 text-[12px] text-rose-800">
                  {meta.detail}
                </p>
              )}

              {/* Cible */}
              <section className="space-y-2">
                {data.document && (
                  <div className="rounded-lg border border-line p-2.5">
                    <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Document concerné</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12.5px]">
                      <FileText className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-semibold text-ink">{data.document.name}</span>
                    </div>
                    {data.document.internalReference && (
                      <div className="font-mono text-[10.5px] text-ink-3">
                        {data.document.internalReference}
                      </div>
                    )}
                  </div>
                )}
                {data.space && (
                  <div className="rounded-lg border border-line p-2.5">
                    <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Espace</div>
                    <div className="mt-0.5 text-[12.5px] text-ink">
                      {data.space.icon} {data.space.name}
                    </div>
                  </div>
                )}
              </section>

              {/* Acteur */}
              {data.actor && (
                <section className="rounded-lg border border-line p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Acteur déclencheur</div>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-ink">{data.actor.name}</div>
                  <div className="text-[11px] text-ink-3">{data.actor.role}</div>
                  {data.ipAddress && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-ink-3">
                      <MapPin className="h-3 w-3" /> IP <span className="font-mono">{data.ipAddress}</span>
                    </div>
                  )}
                </section>
              )}

              {/* État résolution */}
              {isResolved ? (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-800">
                    <Check className="h-4 w-4" /> Résolue
                  </div>
                  <div className="mt-1 text-[11.5px] text-emerald-700">
                    Le {fmtDateTime(data.resolvedAt)} par {data.resolverName ?? "—"}
                  </div>
                  {data.resolutionNotes && (
                    <p className="mt-2 rounded border border-emerald-200 bg-white px-2 py-1.5 text-[11.5px] text-ink">
                      {data.resolutionNotes}
                    </p>
                  )}
                </section>
              ) : (
                <>
                  {data.resolutionNotes && (
                    <section className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                      <div className="text-[10.5px] uppercase tracking-wider text-amber-800">
                        Notes d'investigation en cours
                      </div>
                      <p className="mt-1 text-[11.5px] text-ink">{data.resolutionNotes}</p>
                    </section>
                  )}

                  {!readOnly && (
                    <section className="rounded-lg border border-line p-3">
                      <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Investigation</h3>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Notes d'investigation ou raison de résolution (≥3 caractères pour résoudre)"
                        className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                      />
                      {feedback && (
                        <div
                          className={clsx(
                            "mt-2 rounded-md border px-2 py-1.5 text-[11.5px]",
                            feedback.kind === "ok"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-rose-200 bg-rose-50 text-rose-800",
                          )}
                        >
                          {feedback.msg}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={update.isPending}
                          onClick={() => {
                            setFeedback(null);
                            update.mutate(
                              { action: "INVESTIGATE", notes: notes || undefined },
                              {
                                onSuccess: () =>
                                  setFeedback({ kind: "ok", msg: "Investigation enregistrée." }),
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                        >
                          <Search className="h-3.5 w-3.5" />
                          {update.isPending ? "Enregistrement…" : "Marquer en cours"}
                        </button>
                        <button
                          type="button"
                          disabled={update.isPending || notes.trim().length < 3}
                          onClick={() => {
                            setFeedback(null);
                            update.mutate(
                              { action: "RESOLVE", notes },
                              {
                                onSuccess: () => {
                                  setNotes("");
                                  setFeedback({ kind: "ok", msg: "Anomalie résolue." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {update.isPending ? "Résolution…" : "Résoudre"}
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
