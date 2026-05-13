"use client";

import { ScrollText, Landmark, Gavel, Scale, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import type { SgDashboardResponse } from "@/hooks/useSgDashboard";

interface Props {
  kpis: SgDashboardResponse["kpis"];
}

function formatBigAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} Md`;
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} M`;
  return amount.toLocaleString("fr-FR");
}

const TONE_CLASSES: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export function SgKpiRow({ kpis }: Props) {
  const meeting = kpis.nextMeeting;
  const meetingTone =
    meeting === null ? "slate" : meeting.daysToMeeting <= 7 ? "rose" : meeting.daysToMeeting <= 30 ? "amber" : "violet";

  const cards = [
    {
      icon: ScrollText,
      label: "Marchés en cours",
      value: kpis.activeContracts.count.toString(),
      sub: `${formatBigAmount(kpis.activeContracts.portfolioValue)} FCFA`,
      tone: "violet" as const,
    },
    {
      icon: Landmark,
      label: "Prochain CA / AG",
      value: meeting ? `${meeting.daysToMeeting} j` : "—",
      sub: meeting
        ? `${meeting.type === "BOARD_MEETING" ? "CA" : meeting.type === "ORDINARY_AG" ? "AG ord." : "AG extra."}`
        : "Aucun planifié",
      tone: meetingTone,
    },
    {
      icon: Gavel,
      label: "Contentieux actifs",
      value: kpis.activeCases.count.toString(),
      sub: `provisions ${formatBigAmount(kpis.activeCases.provisionsTotal)} FCFA`,
      tone: kpis.activeCases.count > 0 ? ("rose" as const) : ("slate" as const),
    },
    {
      icon: kpis.compliance.upToDate ? Scale : AlertTriangle,
      label: "Conformité",
      value: kpis.compliance.upToDate ? "OK" : kpis.compliance.toUpdateCount.toString(),
      sub: kpis.compliance.upToDate
        ? `${kpis.compliance.alertsCount} alerte${kpis.compliance.alertsCount > 1 ? "s" : ""} à traiter`
        : `registres à mettre à jour`,
      tone: kpis.compliance.upToDate ? ("emerald" as const) : ("amber" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <div className={clsx("grid h-10 w-10 place-items-center rounded-lg border", TONE_CLASSES[c.tone])}>
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
