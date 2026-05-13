"use client";

import { Users, CalendarClock, CheckCircle2, FileText } from "lucide-react";
import { clsx } from "clsx";
import type { MeetingsListResponse } from "@/hooks/useSgGovernance";

interface Props {
  kpis: MeetingsListResponse["kpis"];
  decisionsCount: number;
}

const TONE: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export function GovernanceKpis({ kpis, decisionsCount }: Props) {
  const meetingTone =
    kpis.nextMeetingDaysAway === null
      ? "slate"
      : kpis.nextMeetingDaysAway <= 7
        ? "rose"
        : kpis.nextMeetingDaysAway <= 30
          ? "amber"
          : "violet";

  const cards = [
    {
      icon: Users,
      label: "Administrateurs",
      value: kpis.boardMembersCount.toString(),
      sub: "actifs",
      tone: "violet" as const,
    },
    {
      icon: CalendarClock,
      label: "Prochain CA / AG",
      value: kpis.nextMeetingDaysAway !== null ? `J-${kpis.nextMeetingDaysAway}` : "—",
      sub: kpis.nextMeetingDaysAway !== null ? "à préparer" : "aucun planifié",
      tone: meetingTone,
    },
    {
      icon: CheckCircle2,
      label: "Réunions YTD",
      value: kpis.completedYtd.toString(),
      sub: `${kpis.scheduledCount} programmée${kpis.scheduledCount > 1 ? "s" : ""}`,
      tone: "emerald" as const,
    },
    {
      icon: FileText,
      label: "Décisions registres",
      value: decisionsCount.toString(),
      sub: "indexées",
      tone: "violet" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <div className={clsx("grid h-10 w-10 place-items-center rounded-lg border", TONE[c.tone])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-none tracking-tight text-ink">{c.value}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{c.label}</div>
              <div className="text-[11px] text-ink-3/80">{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
