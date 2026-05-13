"use client";

import { CalendarClock, Landmark } from "lucide-react";
import { clsx } from "clsx";
import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

const MEETING_TYPE_LABEL: Record<string, string> = {
  BOARD_MEETING: "Conseil d'Administration",
  ORDINARY_AG: "Assemblée Générale Ordinaire",
  EXTRAORDINARY_AG: "Assemblée Générale Extraordinaire",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

interface Props {
  calendar: SgDashboardResponse["officialCalendar"];
}

export function OfficialCalendarCard({ calendar }: Props) {
  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
          <CalendarClock className="h-4 w-4 text-violet-600" /> Calendrier officiel
        </h2>
        <span className="text-[11.5px] text-ink-3">{calendar.length} échéance{calendar.length > 1 ? "s" : ""}</span>
      </header>
      {calendar.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune réunion officielle planifiée.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {calendar.map((m) => {
            const tone =
              m.daysToMeeting <= 7 ? "border-l-rose-500" : m.daysToMeeting <= 30 ? "border-l-amber-500" : "border-l-violet-500";
            return (
              <li key={m.id} className={clsx("flex items-center gap-3 border-l-[4px] px-4 py-2.5", tone)}>
                <Landmark className="h-4 w-4 shrink-0 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">{MEETING_TYPE_LABEL[m.type] ?? m.type}</div>
                  <div className="text-[11px] text-ink-3">
                    {fmtDate(m.scheduledAt)} · {m.location}
                  </div>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
                    m.daysToMeeting <= 7 ? "bg-rose-100 text-rose-700" : m.daysToMeeting <= 30 ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700",
                  )}
                >
                  J-{m.daysToMeeting}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
