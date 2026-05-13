"use client";

import { useState } from "react";
import { X, FileText, Send, Bell, Ban, Check, CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import { clsx } from "clsx";
import { useWorkflowDetail, useDecideWorkflow, useEscalateWorkflow, useCancelWorkflow } from "@/hooks/useGedWorkflows";
import { WorkflowPipelineVisual } from "./WorkflowPipelineVisual";

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "En cours",
  OVERDUE: "En retard",
  COMPLETED: "Terminé",
  REJECTED: "Rejeté",
  CANCELLED: "Annulé",
};

const STATUS_CHIP: Record<string, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
  CANCELLED: "bg-slate-100 text-slate-700",
};

const STEP_ICON = {
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  PENDING: Clock,
  SKIPPED: Circle,
} as const;

const STEP_COLOR = {
  APPROVED: "text-emerald-600",
  REJECTED: "text-rose-600",
  PENDING: "text-amber-600",
  SKIPPED: "text-slate-400",
} as const;

interface Props {
  workflowId: string | null;
  userRole: string;
  onClose: () => void;
}

function fmtDateTime(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function WorkflowDetailDrawer({ workflowId, userRole, onClose }: Props) {
  const { data, isLoading, isError } = useWorkflowDetail(workflowId);
  const decide = useDecideWorkflow(workflowId ?? "");
  const escalate = useEscalateWorkflow(workflowId ?? "");
  const cancel = useCancelWorkflow(workflowId ?? "");

  const [decideComment, setDecideComment] = useState("");
  const [escalateMessage, setEscalateMessage] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (!workflowId) return null;

  const isArchivist = userRole === "ARCHIVIST" || userRole === "TENANT_ADMIN";
  const isDgOrUp = isArchivist || userRole === "DG";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="flex h-full w-full max-w-full flex-col bg-white shadow-2xl sm:w-[560px]">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[15px] font-bold text-ink">
                {data?.reference ?? "Workflow"}
              </h2>
              {data && (
                <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_CHIP[data.status])}>
                  {STATUS_LABEL[data.status] ?? data.status}
                </span>
              )}
            </div>
            {data?.template && (
              <div className="mt-0.5 font-mono text-[11px] text-ink-3">
                {data.template.code} · {data.template.name}
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
              <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-48 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : isError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
              Impossible de charger le workflow.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Document concerné */}
              <section className="rounded-lg border border-line p-3">
                <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Document</div>
                <div className="mt-0.5 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <span className="font-semibold text-ink">{data.document.name}</span>
                </div>
                {data.document.internalReference && (
                  <div className="mt-0.5 font-mono text-[11px] text-ink-3">{data.document.internalReference}</div>
                )}
                {data.document.space && (
                  <div className="mt-1 text-[11.5px] text-ink-3">
                    {data.document.space.icon} {data.document.space.name}
                  </div>
                )}
              </section>

              {/* Pipeline visuel */}
              <section>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Pipeline ({data.template.stepsTotal} étapes)</h3>
                <div className="rounded-lg border border-line p-3">
                  <WorkflowPipelineVisual steps={data.pipeline} />
                </div>
              </section>

              {/* Échéance + initiateur */}
              <section className="grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="rounded-lg border border-line p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Échéance</div>
                  <div
                    className={clsx(
                      "mt-0.5 font-semibold",
                      data.isOverdue ? "text-rose-700" : data.daysToDue !== null && data.daysToDue <= 2 ? "text-amber-700" : "text-ink",
                    )}
                  >
                    {data.dueAt ? fmtDateTime(data.dueAt) : "—"}
                    {data.daysToDue !== null && (
                      <span className="ml-1 text-[10.5px] font-normal">
                        ({data.daysToDue >= 0 ? `J-${data.daysToDue}` : `+${Math.abs(data.daysToDue)} j retard`})
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-line p-2.5">
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-3">Initiateur</div>
                  <div className="mt-0.5 font-semibold text-ink">{data.initiator?.name ?? "—"}</div>
                  <div className="text-[10.5px] text-ink-3">{data.initiator?.role ?? ""}</div>
                </div>
              </section>

              {/* Timeline étapes */}
              <section>
                <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Étapes & commentaires</h3>
                <ol className="rounded-lg border border-line">
                  {data.steps.map((s, idx) => {
                    const Icon = STEP_ICON[s.status];
                    return (
                      <li key={s.id} className={clsx("flex gap-3 px-3 py-2", idx < data.steps.length - 1 && "border-b border-line")}>
                        <Icon className={clsx("h-4 w-4 shrink-0 mt-0.5", STEP_COLOR[s.status])} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-1">
                            <span className="text-[12.5px] font-semibold text-ink">
                              Étape {s.index + 1} · {s.name}
                            </span>
                            {s.decidedAt && (
                              <span className="font-mono text-[10.5px] text-ink-3">{fmtDateTime(s.decidedAt)}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-3">
                            {s.assignedTo?.name ?? "—"} · {s.assignedTo?.role ?? "—"}
                          </div>
                          {s.comment && (
                            <p className="mt-1 rounded-md border border-line bg-surface-alt/40 px-2 py-1 text-[11.5px] text-ink">
                              {s.comment}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>

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

              {/* Actions — uniquement si encore actif */}
              {(data.status === "IN_PROGRESS" || data.status === "OVERDUE") && (
                <>
                  {/* Décision étape courante (ARCHIVIST) */}
                  {isArchivist && (
                    <section className="rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                      <h3 className="mb-1.5 text-[12.5px] font-semibold text-violet-800">
                        Décider l'étape courante (override ARCHIVIST)
                      </h3>
                      <textarea
                        value={decideComment}
                        onChange={(e) => setDecideComment(e.target.value)}
                        placeholder="Commentaire (optionnel)…"
                        rows={2}
                        className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={decide.isPending}
                          onClick={() => {
                            setFeedback(null);
                            decide.mutate(
                              { decision: "APPROVE", comment: decideComment || undefined },
                              {
                                onSuccess: () => {
                                  setDecideComment("");
                                  setFeedback({ kind: "ok", msg: "Étape approuvée." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[12.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" /> Approuver
                        </button>
                        <button
                          type="button"
                          disabled={decide.isPending}
                          onClick={() => {
                            setFeedback(null);
                            decide.mutate(
                              { decision: "REJECT", comment: decideComment || undefined },
                              {
                                onSuccess: () => {
                                  setDecideComment("");
                                  setFeedback({ kind: "ok", msg: "Workflow rejeté." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Rejeter
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Escalade */}
                  {isArchivist && (
                    <section className="rounded-lg border border-line p-3">
                      <h3 className="mb-1.5 text-[12.5px] font-semibold text-ink">Relancer l'assigné</h3>
                      <textarea
                        value={escalateMessage}
                        onChange={(e) => setEscalateMessage(e.target.value)}
                        placeholder="Message de relance (optionnel — défaut générique)"
                        rows={2}
                        className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-violet-400"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={escalate.isPending}
                          onClick={() => {
                            setFeedback(null);
                            escalate.mutate(
                              { message: escalateMessage || undefined },
                              {
                                onSuccess: (r) => {
                                  setEscalateMessage("");
                                  setFeedback({
                                    kind: "ok",
                                    msg: r.notifiedUserName
                                      ? `Relance envoyée à ${r.notifiedUserName}.`
                                      : "Relance enregistrée (aucun assigné identifié).",
                                  });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                        >
                          <Bell className="h-3.5 w-3.5" /> Envoyer la relance
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Annulation */}
                  {isDgOrUp && (
                    <section className="rounded-lg border border-rose-200 bg-rose-50/40 p-3">
                      <h3 className="mb-1.5 text-[12.5px] font-semibold text-rose-800">Annuler le workflow</h3>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Raison de l'annulation (obligatoire)"
                        rows={2}
                        className="w-full rounded-md border border-line bg-white px-2 py-1.5 text-[12px] outline-none focus:border-rose-400"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          disabled={cancel.isPending || cancelReason.trim().length < 3}
                          onClick={() => {
                            setFeedback(null);
                            cancel.mutate(
                              { reason: cancelReason },
                              {
                                onSuccess: () => {
                                  setCancelReason("");
                                  setFeedback({ kind: "ok", msg: "Workflow annulé." });
                                },
                                onError: (e: Error) => setFeedback({ kind: "err", msg: e.message }),
                              },
                            );
                          }}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-[12.5px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Ban className="h-3.5 w-3.5" /> Annuler le workflow
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Lien document */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (data.document.space) {
                      window.location.href = `/gestion-documentaire/espaces`;
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
                >
                  <Send className="h-3.5 w-3.5" /> Voir l'espace
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
