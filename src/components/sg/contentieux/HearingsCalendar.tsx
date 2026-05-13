"use client";

import { CalendarClock, MapPin, User } from "lucide-react";
import { clsx } from "clsx";
import { useHearingsCalendar } from "@/hooks/useSgLegalCases";

interface Props {
  onOpenCase: (id: string) => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const NOTIFY_TONE: Record<string, string> = {
  "J-1": "bg-rose-100 text-rose-700",
  "J-7": "bg-amber-100 text-amber-700",
  "J-30": "bg-violet-100 text-violet-700",
};

export function HearingsCalendar({ onOpenCase }: Props) {
  const { data, isLoading } = useHearingsCalendar();

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-violet-600" />
          <h2 className="text-[13.5px] font-semibold text-ink">
            Calendrier audiences (90 j)
          </h2>
        </div>
        {data && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="rounded bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-700">
              ≤ 7 j : {data.counts.within7d}
            </span>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700">
              ≤ 30 j : {data.counts.within30d}
            </span>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="px-4 py-6 text-center text-[12px] text-ink-3">Chargement…</div>
      ) : !data || data.items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-ink-3/40" />
          <p className="mt-2 text-[12.5px] text-ink-3">Aucune audience prévue dans les 90 jours.</p>
        </div>
      ) : (
        <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
          {data.items.map((h) => (
            <li key={`${h.caseId}-${h.hearingDate}`}>
              <button
                type="button"
                onClick={() => onOpenCase(h.caseId)}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-surface-alt/40"
              >
                <div className="shrink-0 text-center">
                  <div className="font-mono text-[10.5px] text-ink-3">
                    {fmtDate(h.hearingDate)}
                  </div>
                  <div
                    className={clsx(
                      "mt-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
                      h.daysAway <= 7
                        ? "bg-rose-100 text-rose-700"
                        : h.daysAway <= 30
                          ? "bg-amber-100 text-amber-700"
                          : "bg-violet-100 text-violet-700",
                    )}
                  >
                    J-{h.daysAway}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10.5px] font-bold text-ink-3">{h.reference}</span>
                    {h.notify && (
                      <span className={clsx("rounded-md px-1 py-0.5 text-[10px] font-semibold", NOTIFY_TONE[h.notify])}>
                        {h.notify} alerte
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12.5px] font-semibold text-ink">{h.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {h.jurisdiction}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" /> {h.lawyerName}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
