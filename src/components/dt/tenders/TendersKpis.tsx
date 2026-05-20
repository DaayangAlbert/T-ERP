"use client";

import type { TendersListResponse } from "@/hooks/useDtTenders";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

export function TendersKpis({ kpis }: { kpis: TendersListResponse["kpis"] }) {
  const cards = [
    { label: "Études en cours", value: kpis.inProgressCount.toString(), sub: "Pipeline actif" },
    { label: "Volume pipeline", value: `${fmt(kpis.pipelineVolume)} FCFA`, sub: "Budgets estimés" },
    { label: "Taux transformation", value: `${kpis.transformationRate} %`, sub: "WON / (WON + LOST)" },
    { label: "Coût études YTD", value: `${fmt(kpis.ytdStudyCost)} FCFA`, sub: "Investis depuis 1er janv." },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none tracking-tight text-ink">
            {c.value}
          </div>
          <div className="mt-1 text-[11.5px] font-medium text-ink-2">{c.label}</div>
          <div className="text-[10.5px] text-ink-3">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
