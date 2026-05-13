"use client";

import { Calendar, MapPin, FileText, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import type { MeetingsListResponse } from "@/hooks/useSgGovernance";

interface Props {
  meetings: MeetingsListResponse["meetings"];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function typeShort(t: string): string {
  if (t === "BOARD_MEETING") return "CA";
  if (t === "ORDINARY_AG") return "AGO";
  return "AGE";
}

function statusChip(s: string): { label: string; cls: string } {
  if (s === "COMPLETED") return { label: "Tenue", cls: "bg-emerald-100 text-emerald-700" };
  if (s === "SCHEDULED") return { label: "Planifiée", cls: "bg-violet-100 text-violet-700" };
  if (s === "CONVOCATIONS_SENT") return { label: "Convoquée", cls: "bg-amber-100 text-amber-700" };
  if (s === "CANCELLED") return { label: "Annulée", cls: "bg-rose-100 text-rose-700" };
  if (s === "POSTPONED") return { label: "Reportée", cls: "bg-slate-200 text-slate-700" };
  return { label: s, cls: "bg-slate-100 text-slate-700" };
}

export function MeetingHistoryTable({ meetings }: Props) {
  if (meetings.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white px-4 py-6 text-center">
        <Calendar className="mx-auto h-8 w-8 text-ink-3/40" />
        <p className="mt-2 text-[12.5px] text-ink-3">Aucune réunion enregistrée.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold text-ink">Historique des réunions ({meetings.length})</h2>
      </header>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt/50 text-[11px] uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Type</th>
              <th className="px-4 py-2 text-left font-semibold">Date</th>
              <th className="px-4 py-2 text-left font-semibold">Lieu</th>
              <th className="px-4 py-2 text-left font-semibold">Statut</th>
              <th className="px-4 py-2 text-center font-semibold">Décisions</th>
              <th className="px-4 py-2 text-left font-semibold">PV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {meetings.map((m) => {
              const chip = statusChip(m.status);
              return (
                <tr key={m.id} className="hover:bg-surface-alt/40">
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">
                      {typeShort(m.type)}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[11.5px] text-ink">{fmtDate(m.scheduledAt)}</td>
                  <td className="px-4 py-2 text-[11.5px] text-ink-3">{m.location}</td>
                  <td className="px-4 py-2">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", chip.cls)}>
                      {chip.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-mono text-[11.5px]">{m.decisionsCount}</td>
                  <td className="px-4 py-2">
                    {m.pvDocumentUrl ? (
                      <a
                        href={m.pvDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-violet-700 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" /> Consulter
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-3/70">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile */}
      <ul className="divide-y divide-line sm:hidden">
        {meetings.map((m) => {
          const chip = statusChip(m.status);
          return (
            <li key={m.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-violet-700">
                    {typeShort(m.type)}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink">{fmtDate(m.scheduledAt)}</span>
                </div>
                <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", chip.cls)}>
                  {chip.label}
                </span>
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-3">
                <MapPin className="h-3 w-3" /> {m.location}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-3">
                <span>{m.decisionsCount} décision{m.decisionsCount > 1 ? "s" : ""}</span>
                {m.pvDocumentUrl ? (
                  <a
                    href={m.pvDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:underline"
                  >
                    <FileText className="h-3 w-3" /> PV
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
