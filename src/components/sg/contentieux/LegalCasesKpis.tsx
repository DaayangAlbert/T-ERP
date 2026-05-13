"use client";

import { AlertOctagon, Banknote, CalendarClock, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import type { LegalCasesListResponse } from "@/hooks/useSgLegalCases";

interface Props {
  kpis: LegalCasesListResponse["kpis"];
}

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}

const TONE: Record<string, string> = {
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function LegalCasesKpis({ kpis }: Props) {
  const activeTone =
    kpis.activeCount >= 5 ? "rose" : kpis.activeCount >= 3 ? "amber" : "violet";
  const hearingTone =
    kpis.hearingsSoon >= 3 ? "rose" : kpis.hearingsSoon >= 1 ? "amber" : "violet";
  const winRate = kpis.closedYtd > 0 ? Math.round((kpis.wonYtd / kpis.closedYtd) * 100) : null;

  const cards = [
    {
      icon: AlertOctagon,
      label: "Dossiers actifs",
      value: kpis.activeCount.toString(),
      sub: "en cours",
      tone: activeTone,
    },
    {
      icon: Banknote,
      label: "Provisions IFRS",
      value: `${fmtFcfa(kpis.provisionTotal)} FCFA`,
      sub: `enjeu ${fmtFcfa(kpis.amountAtStakeTotal)}`,
      tone: "amber" as const,
    },
    {
      icon: CalendarClock,
      label: "Audiences ≤ 30 j",
      value: kpis.hearingsSoon.toString(),
      sub: kpis.hearingsSoon > 0 ? "à préparer" : "rien planifié",
      tone: hearingTone,
    },
    {
      icon: TrendingUp,
      label: "Succès YTD",
      value: winRate !== null ? `${winRate}%` : "—",
      sub: `${kpis.wonYtd}/${kpis.closedYtd} clôturés`,
      tone: "emerald" as const,
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
