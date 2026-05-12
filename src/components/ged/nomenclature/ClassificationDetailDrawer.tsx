"use client";

import { useEffect, useMemo, useState } from "react";
import { X, FileText, Tag, Save, Ban, GitBranch, AlertOctagon } from "lucide-react";
import { clsx } from "clsx";
import { Confidentiality, DuaTrigger } from "@prisma/client";
import {
  useClassificationDetail,
  usePatchClassification,
  useDeprecateClassification,
} from "@/hooks/useGedClassifications";

const CONF_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  INTERNAL: "Interne",
  RESTRICTED: "Restreint",
  CONFIDENTIAL: "Confidentiel",
};
const CONF_CHIP: Record<string, string> = {
  PUBLIC: "bg-emerald-100 text-emerald-800",
  INTERNAL: "bg-blue-100 text-blue-800",
  RESTRICTED: "bg-amber-100 text-amber-800",
  CONFIDENTIAL: "bg-rose-100 text-rose-800",
};
const TRIGGER_LABEL: Record<string, string> = {
  CREATION_DATE: "Date de création",
  END_OF_FISCAL_YEAR: "Fin d'exercice fiscal",
  EMPLOYEE_DEPARTURE: "Départ employé",
  PROJECT_CLOSURE: "Clôture projet",
  OTHER: "Autre",
};

function formatVolume(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(0)} Mo`;
  return `${(bytes / 1_000).toFixed(0)} Ko`;
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

interface Props {
  classificationId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

export function ClassificationDetailDrawer({ classificationId, readOnly, onClose }: Props) {
  const { data, isLoading, isError } = useClassificationDetail(classificationId);
  const patch = usePatchClassification(classificationId ?? "");
  const deprecate = useDeprecateClassification(classificationId ?? "");

  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [dua, setDua] = useState("");
  const [duaYears, setDuaYears] = useState<number | "">("");
  const [duaTrigger, setDuaTrigger] = useState<DuaTrigger>("CREATION_DATE");
  const [confidentiality, setConfidentiality] = useState<Confidentiality>("INTERNAL");
  const [showDeprecate, setShowDeprecate] = useState(false);
  const [deprecateReason, setDeprecateReason] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Sync state when data loads
  useEffect(() => {
    if (data) {
      setName(data.classification.name);
      setDua(data.classification.dua);
      setDuaYears(data.classification.duaYears ?? "");
      setDuaTrigger(data.classification.duaTrigger as DuaTrigger);
      setConfidentiality(data.classification.confidentiality);
      setEditMode(false);
      setShowDeprecate(false);
      setFeedback(null);
    }
  }, [data?.classification.id]);

  const monthlyMax = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.stats.monthlySeries.map((m) => m.count));
  }, [data]);

  if (!classificationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[520px]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[14px] font-bold text-violet-700">
                {data?.classification.prefix ?? "…"}
              </span>
              <h2 className="truncate text-[15px] font-bold text-ink">{data?.classification.name ?? "…"}</h2>
            </div>
            {data && (
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-3">
                <span className="font-mono">{data.classification.code}</span>
                <span>·</span>
                <span>{data.classification.category}</span>
                {!data.classification.active && (
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                    Obsolète
                  </span>
                )}
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
              <div className="h-48 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              Impossible de charger le détail.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats */}
              <section className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Documents</div>
                  <div className="mt-0.5 text-[18px] font-bold text-ink">
                    {data.stats.documentsTotal.toLocaleString("fr-FR")}
                  </div>
                  <div className="text-[10.5px] text-ink-3">{data.stats.documentsActive} actifs</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Volume</div>
                  <div className="mt-0.5 text-[14px] font-semibold text-ink">{formatVolume(data.stats.volumeBytes)}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface-alt/30 p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Confidentialité</div>
                  <span
                    className={clsx(
                      "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      CONF_CHIP[data.classification.confidentiality],
                    )}
                  >
                    {CONF_LABEL[data.classification.confidentiality]}
                  </span>
                </div>
              </section>

              {/* Politique DUA */}
              <section className="rounded-lg border border-line p-3">
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Politique de rétention (DUA)</h3>
                {!editMode ? (
                  <dl className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">Durée</dt>
                      <dd className="font-semibold text-ink">{data.classification.dua}</dd>
                    </div>
                    <div>
                      <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">Déclencheur</dt>
                      <dd className="text-ink">{TRIGGER_LABEL[data.classification.duaTrigger] ?? data.classification.duaTrigger}</dd>
                    </div>
                    {data.classification.workflow && (
                      <div className="col-span-2">
                        <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">Workflow associé</dt>
                        <dd className="flex items-center gap-1.5 text-ink">
                          <GitBranch className="h-3.5 w-3.5 text-violet-600" />
                          <span className="font-mono text-[11.5px] text-violet-700">
                            {data.classification.workflow.code}
                          </span>
                          <span>· {data.classification.workflow.name}</span>
                        </dd>
                      </div>
                    )}
                    {data.classification.requiredValidators.length > 0 && (
                      <div className="col-span-2">
                        <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">Validateurs requis</dt>
                        <dd className="flex flex-wrap gap-1">
                          {data.classification.requiredValidators.map((v) => (
                            <span
                              key={v}
                              className="rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-semibold text-violet-800"
                            >
                              {v}
                            </span>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Libellé</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-0.5 h-9 w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-violet-400"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10.5px] uppercase tracking-wide text-ink-3">DUA libellé</span>
                        <input
                          value={dua}
                          onChange={(e) => setDua(e.target.value)}
                          className="mt-0.5 h-9 w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-violet-400"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Années</span>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={duaYears}
                          onChange={(e) => setDuaYears(e.target.value === "" ? "" : Number(e.target.value))}
                          className="mt-0.5 h-9 w-full rounded-md border border-line px-2 font-mono text-[12.5px] outline-none focus:border-violet-400"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Déclencheur</span>
                      <select
                        value={duaTrigger}
                        onChange={(e) => setDuaTrigger(e.target.value as DuaTrigger)}
                        className="mt-0.5 h-9 w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-violet-400"
                      >
                        {(Object.keys(TRIGGER_LABEL) as DuaTrigger[]).map((t) => (
                          <option key={t} value={t}>
                            {TRIGGER_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10.5px] uppercase tracking-wide text-ink-3">Confidentialité</span>
                      <select
                        value={confidentiality}
                        onChange={(e) => setConfidentiality(e.target.value as Confidentiality)}
                        className="mt-0.5 h-9 w-full rounded-md border border-line px-2 text-[12.5px] outline-none focus:border-violet-400"
                      >
                        {(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"] as Confidentiality[]).map((c) => (
                          <option key={c} value={c}>
                            {CONF_LABEL[c]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

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

                {!readOnly && data.classification.active && (
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                    {editMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditMode(false);
                            setName(data.classification.name);
                            setDua(data.classification.dua);
                            setDuaYears(data.classification.duaYears ?? "");
                            setDuaTrigger(data.classification.duaTrigger as DuaTrigger);
                            setConfidentiality(data.classification.confidentiality);
                          }}
                          className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={patch.isPending}
                          onClick={() => {
                            setFeedback(null);
                            patch.mutate(
                              {
                                name,
                                dua,
                                duaYears: typeof duaYears === "number" ? duaYears : null,
                                duaTrigger,
                                confidentiality,
                              },
                              {
                                onSuccess: () => {
                                  setEditMode(false);
                                  setFeedback({ kind: "ok", msg: "Politique mise à jour." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[11.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" /> {patch.isPending ? "Enregistrement…" : "Enregistrer"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditMode(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        <Tag className="h-3.5 w-3.5" /> Modifier la politique
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Statistiques mensuelles */}
              {data.stats.monthlySeries.length > 0 && (
                <section className="rounded-lg border border-line p-3">
                  <h3 className="mb-2 text-[12.5px] font-semibold text-ink">Création documents — 12 derniers mois</h3>
                  <div className="flex h-24 items-end gap-1">
                    {data.stats.monthlySeries.map((m) => (
                      <div key={m.month} className="group flex flex-1 flex-col items-center gap-0.5">
                        <div
                          className="w-full min-w-[8px] rounded-t bg-violet-300 group-hover:bg-violet-500 transition"
                          style={{ height: `${(m.count / monthlyMax) * 100}%` }}
                          title={`${m.month} : ${m.count}`}
                        />
                        <span className="font-mono text-[9px] text-ink-3">{m.month.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Documents récents */}
              {data.recentDocuments.length > 0 && (
                <section>
                  <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">
                    Documents récents ({data.recentDocuments.length})
                  </h3>
                  <ul className="rounded-lg border border-line">
                    {data.recentDocuments.map((d, idx) => (
                      <li
                        key={d.id}
                        className={clsx(
                          "flex items-start gap-2 px-3 py-2",
                          idx < data.recentDocuments.length - 1 && "border-b border-line",
                        )}
                      >
                        <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-semibold text-ink">{d.name}</div>
                          <div className="text-[10.5px] text-ink-3">
                            {d.spaceIcon} {d.spaceName ?? "—"} · {formatVolume(d.sizeBytes)} · {fmtDate(d.createdAt)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Action obsolète */}
              {!readOnly && data.classification.active && (
                <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                  <div className="flex items-start gap-2">
                    <AlertOctagon className="h-4 w-4 shrink-0 text-rose-600" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[12.5px] font-semibold text-rose-800">Mettre obsolète</h3>
                      <p className="mt-0.5 text-[11px] text-rose-700">
                        Les {data.stats.documentsTotal} documents existants restent intacts mais aucun nouveau document
                        ne pourra utiliser ce préfixe.
                      </p>
                    </div>
                  </div>
                  {showDeprecate ? (
                    <div className="mt-2">
                      <textarea
                        value={deprecateReason}
                        onChange={(e) => setDeprecateReason(e.target.value)}
                        placeholder="Raison de la mise en obsolescence (≥3 caractères)"
                        rows={2}
                        className="w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-rose-400"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDeprecate(false);
                            setDeprecateReason("");
                          }}
                          className="inline-flex h-8 items-center rounded-md border border-line bg-white px-3 text-[11.5px] font-semibold text-ink hover:bg-surface-alt"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={deprecate.isPending || deprecateReason.trim().length < 3}
                          onClick={() => {
                            setFeedback(null);
                            deprecate.mutate(
                              { reason: deprecateReason },
                              {
                                onSuccess: () => {
                                  setShowDeprecate(false);
                                  setDeprecateReason("");
                                  setFeedback({ kind: "ok", msg: "Classification mise en obsolescence." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-[11.5px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          {deprecate.isPending ? "Application…" : "Confirmer"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowDeprecate(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-[11.5px] font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Ban className="h-3.5 w-3.5" /> Mettre obsolète
                      </button>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
