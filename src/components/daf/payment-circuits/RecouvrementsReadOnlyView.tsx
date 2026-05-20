"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";

type StepStatus = "PENDING" | "IN_PROGRESS" | "VALIDATED" | "BLOCKED";

interface StepDoc {
  id: string;
  label: string;
  provided: boolean;
  providedAt: string | null;
}

interface Step {
  id: string;
  order: number;
  label: string;
  status: StepStatus;
  validatedAt: string | null;
  validatedBy: { firstName: string; lastName: string } | null;
  blockedReason: string | null;
  blockedSince: string | null;
  blockedBy: { firstName: string; lastName: string } | null;
  documents: StepDoc[];
}

interface PaymentTrack {
  id: string;
  templateName: string;
  assignedTo: { id: string; firstName: string; lastName: string; role: string } | null;
  startedAt: string;
  completedAt: string | null;
  steps: Step[];
}

interface Receivable {
  id: string;
  invoiceRef: string;
  clientName: string;
  amount: string;
  paidAmount: string;
  remaining: string;
  issueDate: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
  lastReminder: { level: string; channel: string; sentAt: string } | null;
  paymentTrack: PaymentTrack | null;
}

interface ApiResponse {
  summary: {
    total: number;
    totalAmount: string;
    overdueCount: number;
    tracksCount: number;
    blockedCount: number;
  };
  items: Receivable[];
}

const STATUS_BADGE = {
  PENDING: { label: "En attente", cls: "bg-line/40 text-ink-3", icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { label: "En cours", cls: "bg-info/10 text-info", icon: <Loader2 className="h-3 w-3" /> },
  VALIDATED: { label: "Validée", cls: "bg-success/10 text-success", icon: <CheckCircle2 className="h-3 w-3" /> },
  BLOCKED: { label: "Bloquée", cls: "bg-danger/10 text-danger", icon: <AlertOctagon className="h-3 w-3" /> },
} as const;

function fmtFCFA(amount: string): string {
  const n = Number(BigInt(amount));
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "hier";
  return `il y a ${d} j`;
}

/**
 * Vue consolidée lecture seule des recouvrements en cours, pour les profils
 * de supervision (DG, DT). Affiche tous les détails des dossiers + leur
 * circuit de paiement + étapes + blocages, sans aucun bouton d'action.
 */
export function RecouvrementsReadOnlyView({ readerLabel }: { readerLabel: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["recouvrements", "active"],
    queryFn: async (): Promise<ApiResponse> => {
      const res = await fetch("/api/recouvrements/active", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterBlocked, setFilterBlocked] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!filterBlocked) return data.items;
    return data.items.filter((r) =>
      r.paymentTrack?.steps.some((s) => s.status === "BLOCKED"),
    );
  }, [data, filterBlocked]);

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-info/30 bg-info/5 p-3 text-[12px] text-info">
        <strong>Vue lecture seule</strong> · {readerLabel}. Cette vue agrège tous les dossiers de
        recouvrement en cours du groupe pour permettre une supervision en transparence. Aucune
        action d&apos;édition n&apos;est disponible — contactez la DAF pour intervenir.
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Dossiers actifs" value={String(data.summary.total)} tone="default" />
        <Kpi
          label="Montant à recouvrer"
          value={fmtFCFA(data.summary.totalAmount)}
          tone="default"
        />
        <Kpi label="En retard" value={String(data.summary.overdueCount)} tone="warning" />
        <Kpi label="Bloqués" value={String(data.summary.blockedCount)} tone="danger" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Dossiers ({filtered.length}
          {data.summary.tracksCount > 0 && ` · ${data.summary.tracksCount} avec circuit`})
        </h2>
        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <input
            type="checkbox"
            checked={filterBlocked}
            onChange={(e) => setFilterBlocked(e.target.checked)}
            className="rounded"
          />
          Seulement les bloqués
        </label>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-[13px] text-ink-3">
          Aucun dossier ne correspond à ce filtre.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <li key={r.id} className="rounded-xl border border-line bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(expanded);
                    if (isOpen) next.delete(r.id);
                    else next.add(r.id);
                    setExpanded(next);
                  }}
                  className="flex w-full flex-wrap items-start gap-2 p-3 text-left transition hover:bg-surface-alt/30 sm:p-4"
                >
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-ink-3" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-semibold text-ink">{r.clientName}</span>
                      <span className="font-mono text-[10.5px] text-ink-3">{r.invoiceRef}</span>
                      {r.daysOverdue > 0 && (
                        <span className="rounded bg-danger/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-danger">
                          {r.daysOverdue}j retard
                        </span>
                      )}
                      {r.status === "LITIGATION" && (
                        <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                          Contentieux
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-3">
                      <span className="font-mono font-semibold text-ink-2">
                        {fmtFCFA(r.remaining)}
                      </span>
                      <span>Échéance {fmtDate(r.dueDate)}</span>
                      {r.paymentTrack && (
                        <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary-700">
                          {r.paymentTrack.templateName}
                        </span>
                      )}
                      {r.paymentTrack?.assignedTo && (
                        <span>
                          Suivi : {r.paymentTrack.assignedTo.firstName}{" "}
                          {r.paymentTrack.assignedTo.lastName} ({r.paymentTrack.assignedTo.role})
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-line p-3 sm:p-4">
                    {/* Méta */}
                    <dl className="grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
                      <Meta label="Montant total" value={fmtFCFA(r.amount)} />
                      <Meta label="Réglé" value={fmtFCFA(r.paidAmount)} />
                      <Meta label="Reste à payer" value={fmtFCFA(r.remaining)} accent />
                      <Meta label="Émise le" value={fmtDate(r.issueDate)} />
                    </dl>
                    {r.lastReminder && (
                      <div className="rounded border border-line bg-surface-alt/40 p-2 text-[11.5px]">
                        <strong>Dernière relance :</strong> {r.lastReminder.level} via{" "}
                        {r.lastReminder.channel} ({fmtRelative(r.lastReminder.sentAt)})
                      </div>
                    )}

                    {/* Circuit de paiement */}
                    {r.paymentTrack ? (
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                          Circuit administratif — {r.paymentTrack.templateName}
                        </h4>
                        <ol className="mt-2 space-y-1.5">
                          {r.paymentTrack.steps.map((s) => {
                            const badge = STATUS_BADGE[s.status];
                            return (
                              <li
                                key={s.id}
                                className="rounded border border-line bg-surface-alt/30 p-2 text-[11.5px]"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[10.5px] text-ink-3">
                                    #{s.order}
                                  </span>
                                  <span className="flex-1 font-medium text-ink">{s.label}</span>
                                  <span
                                    className={clsx(
                                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                      badge.cls,
                                    )}
                                  >
                                    {badge.icon} {badge.label}
                                  </span>
                                </div>
                                {s.validatedAt && s.validatedBy && (
                                  <div className="mt-1 text-[10.5px] text-ink-3">
                                    Validée {fmtRelative(s.validatedAt)} par{" "}
                                    {s.validatedBy.firstName} {s.validatedBy.lastName}
                                  </div>
                                )}
                                {s.status === "BLOCKED" && s.blockedReason && (
                                  <div className="mt-1 space-y-1 rounded border border-danger/30 bg-danger/5 p-1.5 text-[10.5px] text-danger">
                                    <div>
                                      <strong>Bloqué</strong>
                                      {s.blockedSince && ` ${fmtRelative(s.blockedSince)}`}
                                      {s.blockedBy &&
                                        ` par ${s.blockedBy.firstName} ${s.blockedBy.lastName}`}
                                      {" : "}
                                      {s.blockedReason}
                                    </div>
                                    {s.documents.length > 0 && (
                                      <ul className="space-y-0.5">
                                        {s.documents.map((d) => (
                                          <li
                                            key={d.id}
                                            className="flex items-center gap-1.5"
                                          >
                                            <span
                                              className={clsx(
                                                "h-3 w-3 rounded border flex items-center justify-center text-[8px]",
                                                d.provided
                                                  ? "bg-success border-success text-white"
                                                  : "bg-white border-danger/40",
                                              )}
                                            >
                                              {d.provided && "✓"}
                                            </span>
                                            <FileText className="h-2.5 w-2.5 flex-shrink-0 text-ink-3" />
                                            <span
                                              className={clsx(
                                                d.provided && "line-through text-ink-3",
                                              )}
                                            >
                                              {d.label}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    ) : (
                      <div className="rounded border border-dashed border-line p-3 text-center text-[11.5px] text-ink-3">
                        <Eye className="mx-auto h-4 w-4 opacity-50" />
                        Aucun circuit de paiement défini pour ce dossier.
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "default" | "warning" | "danger" }) {
  const cls = {
    default: "border-line bg-white",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-danger/30 bg-danger/5",
  }[tone];
  return (
    <div className={clsx("rounded-xl border p-3", cls)}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[17px] font-bold text-ink">{value}</div>
    </div>
  );
}

function Meta({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wider text-ink-3">{label}</dt>
      <dd
        className={clsx(
          "mt-0.5 font-mono text-[12.5px] font-semibold",
          accent ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
