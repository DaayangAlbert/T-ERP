"use client";

import { ArrowDownLeft, ArrowUpRight, CalendarCheck, Clock } from "lucide-react";
import { clsx } from "clsx";
import type { CorrespondencesListResponse } from "@/hooks/useSgCorrespondences";

interface Props {
  counts: CorrespondencesListResponse["counts"];
}

const TONE: Record<string, string> = {
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
};

export function CorrespondencesKpis({ counts }: Props) {
  const cards = [
    {
      icon: ArrowDownLeft,
      label: "Entrants ce mois",
      value: counts.incomingMonth.toString(),
      sub: "à traiter / classer",
      tone: "violet" as const,
    },
    {
      icon: ArrowUpRight,
      label: "Sortants ce mois",
      value: counts.outgoingMonth.toString(),
      sub: "expédiés",
      tone: "violet" as const,
    },
    {
      icon: Clock,
      label: "Signature DG",
      value: counts.awaitingDg.toString(),
      sub: counts.awaitingDg > 0 ? "à traiter ≤ 48h" : "rien à signer",
      tone: counts.awaitingDg > 0 ? "amber" : ("emerald" as const),
    },
    {
      icon: CalendarCheck,
      label: "Traités YTD",
      value: counts.handledYtd.toString(),
      sub: "depuis 1er janvier",
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
