"use client";

import {
  X,
  FileText,
  ExternalLink,
  Send,
  Archive,
  CheckCircle2,
  Building2,
  Calendar,
  UserCheck,
  Lock,
  ShieldAlert,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { clsx } from "clsx";
import {
  useArchiveCorrespondence,
  useCorrespondenceDetail,
  useSendCorrespondence,
  useSubmitToDg,
} from "@/hooks/useSgCorrespondences";

interface Props {
  correspondenceId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

const CONFIDENTIALITY: Record<string, { label: string; tone: string; icon: typeof Eye }> = {
  PUBLIC: { label: "Public", tone: "bg-slate-100 text-slate-700", icon: Eye },
  STANDARD: { label: "Standard", tone: "bg-violet-100 text-violet-700", icon: FileText },
  SENSITIVE: { label: "Sensible", tone: "bg-amber-100 text-amber-700", icon: ShieldAlert },
  CONFIDENTIAL: { label: "Confidentiel", tone: "bg-rose-100 text-rose-700", icon: Lock },
};

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Reçu",
  IN_PROGRESS: "En cours",
  AWAITING_DG_SIGNATURE: "Signature DG",
  SIGNED: "Signé",
  SENT: "Envoyé",
  ARCHIVED: "Archivé",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} · ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function CorrespondenceDetailDrawer({ correspondenceId, readOnly, onClose }: Props) {
  const { data, isLoading } = useCorrespondenceDetail(correspondenceId);
  const submitDg = useSubmitToDg(correspondenceId ?? "");
  const send = useSendCorrespondence(correspondenceId ?? "");
  const archive = useArchiveCorrespondence(correspondenceId ?? "");

  if (!correspondenceId) return null;

  const conf = data ? CONFIDENTIALITY[data.confidentiality] : null;
  const ConfIcon = conf?.icon;

  const isDraftOutgoing =
    data?.direction === "OUTGOING" &&
    (data?.status === "RECEIVED" || data?.status === "IN_PROGRESS");
  const canSend =
    data?.direction === "OUTGOING" &&
    ((data?.status === "SIGNED") ||
      (!data?.requiresDgSignature && (data?.status === "RECEIVED" || data?.status === "IN_PROGRESS")));
  const canArchive = data && data.status !== "ARCHIVED";

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {data ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10.5px] font-bold text-ink-3">{data.reference}</span>
                  {conf && ConfIcon && (
                    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", conf.tone)}>
                      <ConfIcon className="h-3 w-3" /> {conf.label}
                    </span>
                  )}
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                    {STATUS_LABEL[data.status]}
                  </span>
                </div>
                <h2 className="mt-1 text-[14px] font-bold text-ink">{data.subject}</h2>
              </>
            ) : (
              <h2 className="text-[14px] font-bold text-ink">Chargement…</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading || !data ? (
            <div className="space-y-2">
              <div className="h-24 animate-pulse rounded-lg bg-surface-alt" />
              <div className="h-32 animate-pulse rounded-lg bg-surface-alt" />
            </div>
          ) : (
            <div className="space-y-3">
              <section className="rounded-lg border border-line bg-white p-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Correspondant</h3>
                <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                  <Row icon={Building2} label="Nom" value={data.correspondentName} />
                  {data.correspondentEntity && <Row icon={Building2} label="Entité" value={data.correspondentEntity} />}
                  <Row icon={Calendar} label="Date" value={fmtDate(data.date)} />
                  <Row
                    icon={UserCheck}
                    label="Affecté à"
                    value={data.assignedTo ? `${data.assignedTo.fullName} (${data.assignedTo.role})` : "Non affecté"}
                  />
                </dl>
              </section>

              {data.summary && (
                <section className="rounded-lg border border-line bg-white p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Résumé</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-ink">{data.summary}</p>
                </section>
              )}

              {data.documentUrl && (
                <a
                  href={data.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-line bg-violet-50 px-3 py-2 text-[12.5px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <FileText className="h-4 w-4" /> Document numérisé en GED
                  <ExternalLink className="ml-auto h-3.5 w-3.5" />
                </a>
              )}

              {data.dueDate && data.status !== "ARCHIVED" && data.status !== "SENT" && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    Échéance de traitement : <strong>{fmtDate(data.dueDate)}</strong>
                  </span>
                </div>
              )}

              <section className="rounded-lg border border-line bg-white">
                <header className="border-b border-line px-3 py-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Workflow ({data.timeline.length} événement{data.timeline.length > 1 ? "s" : ""})
                  </h3>
                </header>
                <ol className="relative space-y-2 border-l-2 border-violet-200 p-3 pl-7">
                  {data.timeline.map((t, idx) => (
                    <li key={`${t.at}-${idx}`} className="relative">
                      <span className="absolute -left-[22px] grid h-4 w-4 place-items-center rounded-full bg-violet-600 text-white">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      </span>
                      <div className="text-[12px] font-semibold text-ink">{t.label}</div>
                      <div className="font-mono text-[10.5px] text-ink-3">{fmtDateTime(t.at)}</div>
                    </li>
                  ))}
                </ol>
              </section>

              {data.dgSignatureRef && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-900">
                  <strong>Signature DG :</strong> {data.dgSignatureRef}
                </div>
              )}
            </div>
          )}
        </div>

        {data && !readOnly && (
          <footer className="flex flex-wrap items-center justify-end gap-1.5 border-t border-line bg-surface-alt/40 px-3 py-2.5">
            {isDraftOutgoing && data.requiresDgSignature && data.status !== "AWAITING_DG_SIGNATURE" && (
              <button
                type="button"
                onClick={() => submitDg.mutate(undefined)}
                disabled={submitDg.isPending}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Soumettre au DG
              </button>
            )}
            {canSend && (
              <button
                type="button"
                onClick={() => send.mutate(undefined)}
                disabled={send.isPending}
                className="inline-flex h-9 items-center gap-1 rounded-md bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" /> Marquer envoyé
              </button>
            )}
            {canArchive && (
              <button
                type="button"
                onClick={() => archive.mutate(undefined)}
                disabled={archive.isPending}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-line bg-white px-3 text-[12px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" /> Archiver GED
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-ink-3">
        <Icon className="h-3 w-3" /> {label}
      </dt>
      <dd className="mt-0.5 truncate text-[12px] font-semibold text-ink">{value}</dd>
    </div>
  );
}
