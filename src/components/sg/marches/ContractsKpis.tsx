"use client";

import { ScrollText, Inbox, TrendingUp, Banknote } from "lucide-react";
import { clsx } from "clsx";
import type { SgContractsResponse } from "@/hooks/useSgContracts";

interface Props {
  kpis: SgContractsResponse["kpis"];
}

function fmtAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
  return v.toLocaleString("fr-FR");
}

const TONE: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
};

export function ContractsKpis({ kpis }: Props) {
  const cards = [
    {
      icon: ScrollText,
      label: "Marchés en cours",
      value: kpis.activeContracts.toString(),
      sub: `${fmtAmount(kpis.portfolioValue)} FCFA portefeuille`,
      tone: "violet" as const,
    },
    {
      icon: Inbox,
      label: "AO ouverts",
      value: kpis.openCallsForTenders.toString(),
      sub: "à étudier / soumettre",
      tone: kpis.openCallsForTenders > 0 ? ("amber" as const) : ("violet" as const),
    },
    {
      icon: TrendingUp,
      label: "Taux réussite YTD",
      value: `${kpis.successRateYtd}%`,
      sub: kpis.successRateAttempts > 0 ? `${kpis.successRateAttempts} tentative${kpis.successRateAttempts > 1 ? "s" : ""}` : "(pas de soumission YTD)",
      tone: kpis.successRateYtd >= 40 ? ("emerald" as const) : ("amber" as const),
    },
    {
      icon: Banknote,
      label: "Garanties bancaires",
      value: `${fmtAmount(kpis.guaranteesTotal)}`,
      sub: "FCFA actives",
      tone: "blue" as const,
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
