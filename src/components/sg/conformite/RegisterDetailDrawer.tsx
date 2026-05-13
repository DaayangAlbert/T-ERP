"use client";

import { useState } from "react";
import {
  X,
  BookCheck,
  User,
  CalendarClock,
  Plus,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { clsx } from "clsx";
import { useRegisterDetail } from "@/hooks/useSgCompliance";
import { RegisterAuditModal } from "./RegisterAuditModal";
import { RegisterEntryModal } from "./RegisterEntryModal";

interface Props {
  registerId: string | null;
  readOnly: boolean;
  onClose: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  UP_TO_DATE: "À jour",
  TO_UPDATE: "À mettre à jour",
  OVERDUE: "En retard",
};

const STATUS_TONE: Record<string, { badge: string; icon: typeof ShieldCheck }> = {
  emerald: { badge: "bg-emerald-100 text-emerald-700", icon: ShieldCheck },
  amber: { badge: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  rose: { badge: "bg-rose-100 text-rose-700", icon: AlertOctagon },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function RegisterDetailDrawer({ registerId, readOnly, onClose }: Props) {
  const { data, isLoading } = useRegisterDetail(registerId);
  const [showAudit, setShowAudit] = useState(false);
  const [showEntry, setShowEntry] = useState(false);

  if (!registerId) return null;

  const tone = data ? STATUS_TONE[data.severity] : STATUS_TONE.emerald;
  const Icon = tone.icon;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <aside className="flex w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {data ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", tone.badge)}>
                    <Icon className="h-3 w-3" /> {STATUS_LABEL[data.status]}
                  </span>
                  <span className="text-[10.5px] font-mono text-ink-3">{data.entriesCount} entrées</span>
                </div>
                <h2 className="mt-1 text-[14px] font-bold text-ink">{data.name}</h2>
                <p className="mt-0.5 text-[11px] text-ink-3">{data.legalBasis}</p>
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
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Responsable</h3>
                <div className="mt-2 flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">
                    {data.responsible.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{data.responsible.fullName}</div>
                    <div className="text-[10.5px] text-ink-3">{data.responsible.role}</div>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat
                  icon={BookCheck}
                  label="Entrées"
                  value={data.entriesCount.toString()}
                />
                <Stat
                  icon={CalendarClock}
                  label="Prochaine revue"
                  value={fmtDate(data.nextReviewDate)}
                  sub={`J-${data.daysToReview}`}
                />
                <Stat
                  icon={User}
                  label="Dernière entrée"
                  value={data.lastEntryDate ? fmtDate(data.lastEntryDate) : "—"}
                />
              </section>

              {data.description && (
                <section className="rounded-lg border border-line bg-white p-3">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Description</h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-ink">{data.description}</p>
                </section>
              )}

              <section className="rounded-lg border border-line bg-white">
                <header className="border-b border-line px-3 py-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                    Entrées récentes ({data.recentEntries.length})
                  </h3>
                </header>
                {data.recentEntries.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[11.5px] text-ink-3">
                    Pas d'entrées récentes indexées (registre auto-alimenté par autre module).
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.recentEntries.map((e, i) => (
                      <li key={i} className="px-3 py-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-[12px] font-semibold text-ink">{e.label}</span>
                          {e.ref && (
                            <span className="font-mono text-[10.5px] text-ink-3">{e.ref}</span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-ink-3">
                          {new Date(e.date).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>

        {!readOnly && data && (
          <footer className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-line bg-surface-alt/40 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setShowEntry(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-violet-600 px-2 text-[12px] font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-3.5 w-3.5" /> Nouvelle entrée
            </button>
            <button
              type="button"
              onClick={() => setShowAudit(true)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-line bg-white px-2 text-[12px] font-semibold text-ink hover:bg-surface-alt"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Audit interne
            </button>
          </footer>
        )}

        {data && showAudit && (
          <RegisterAuditModal registerId={data.id} registerName={data.name} onClose={() => setShowAudit(false)} />
        )}
        {data && showEntry && (
          <RegisterEntryModal registerId={data.id} registerName={data.name} onClose={() => setShowEntry(false)} />
        )}
      </aside>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: typeof BookCheck; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface-alt/50 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-ink-3">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-[12.5px] font-bold text-ink">{value}</div>
      {sub && <div className="text-[10.5px] text-ink-3">{sub}</div>}
    </div>
  );
}
