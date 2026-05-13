"use client";

import { Lock, ShieldAlert, Eye, FileText, ChevronRight, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import type { CorrespondenceListItem } from "@/hooks/useSgCorrespondences";

interface Props {
  items: CorrespondenceListItem[];
  onOpen: (id: string) => void;
  emptyLabel?: string;
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

const STATUS_TONE: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-violet-100 text-violet-700",
  AWAITING_DG_SIGNATURE: "bg-amber-100 text-amber-700",
  SIGNED: "bg-emerald-100 text-emerald-700",
  SENT: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-700",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function dueOverdue(due: string | null): { daysAway: number; overdue: boolean; tone: string } | null {
  if (!due) return null;
  const daysAway = Math.ceil((new Date(due).getTime() - Date.now()) / 86_400_000);
  const overdue = daysAway < 0;
  const tone = overdue
    ? "text-rose-700"
    : daysAway <= 2
      ? "text-rose-700"
      : daysAway <= 7
        ? "text-amber-700"
        : "text-ink-3";
  return { daysAway, overdue, tone };
}

export function CorrespondencesTable({
  items,
  onOpen,
  emptyLabel = "Aucun courrier dans cet onglet.",
}: Props) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white px-4 py-8 text-center text-[12.5px] text-ink-3">
        {emptyLabel}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Réf · Date</th>
              <th className="px-4 py-2 text-left font-semibold">Correspondant</th>
              <th className="px-4 py-2 text-left font-semibold">Objet</th>
              <th className="px-4 py-2 text-left font-semibold">Confidentialité</th>
              <th className="px-4 py-2 text-left font-semibold">Affecté</th>
              <th className="px-4 py-2 text-left font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((c) => {
              const conf = CONFIDENTIALITY[c.confidentiality];
              const ConfIcon = conf.icon;
              const due = dueOverdue(c.dueDate);
              return (
                <tr key={c.id} className="hover:bg-surface-alt/40">
                  <td className="cursor-pointer px-4 py-2" onClick={() => onOpen(c.id)}>
                    <div className="font-mono text-[10.5px] font-bold text-ink-3">{c.reference}</div>
                    <div className="text-[11px] text-ink-3">{fmtDate(c.date)}</div>
                  </td>
                  <td className="cursor-pointer px-4 py-2" onClick={() => onOpen(c.id)}>
                    <div className="font-semibold text-ink">{c.correspondentName}</div>
                    {c.correspondentEntity && (
                      <div className="truncate text-[11px] text-ink-3">{c.correspondentEntity}</div>
                    )}
                  </td>
                  <td className="cursor-pointer px-4 py-2" onClick={() => onOpen(c.id)}>
                    <div className="line-clamp-1 font-semibold text-ink">{c.subject}</div>
                    {due && (
                      <div className={clsx("inline-flex items-center gap-1 text-[10.5px]", due.tone)}>
                        {due.overdue && <AlertTriangle className="h-3 w-3" />}
                        {due.overdue ? `Retard ${-due.daysAway}j` : `Échéance J-${due.daysAway}`}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", conf.tone)}>
                      <ConfIcon className="h-3 w-3" /> {conf.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[11.5px] text-ink-3">
                    {c.assignedTo ? (
                      <>
                        <div className="font-semibold text-ink">{c.assignedTo.fullName}</div>
                        <div className="text-[10.5px]">{c.assignedTo.role}</div>
                      </>
                    ) : (
                      <span className="italic">Non affecté</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", STATUS_TONE[c.status])}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line sm:hidden">
        {items.map((c) => {
          const conf = CONFIDENTIALITY[c.confidentiality];
          const ConfIcon = conf.icon;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="group flex w-full items-start gap-2 px-4 py-2.5 text-left transition hover:bg-surface-alt/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-mono text-[10.5px] font-bold text-ink-3">{c.reference}</span>
                    <span className={clsx("rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold", conf.tone)}>
                      <ConfIcon className="mr-0.5 inline h-2.5 w-2.5" /> {conf.label}
                    </span>
                    <span className={clsx("rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold", STATUS_TONE[c.status])}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12.5px] font-semibold text-ink group-hover:text-violet-700">
                    {c.subject}
                  </div>
                  <div className="text-[11px] text-ink-3">
                    {c.correspondentName}
                    {c.correspondentEntity && <> · {c.correspondentEntity}</>}
                  </div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">{fmtDate(c.date)}</div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-3/60 group-hover:text-violet-700" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
