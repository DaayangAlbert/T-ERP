"use client";

import type { DtPortfolioResponse } from "@/hooks/useDtPortfolio";

function fmt(amount: number): string {
  if (amount >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))}`;
  if (amount >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))}`;
  return amount.toLocaleString("fr-FR");
}

interface Props {
  kpis: DtPortfolioResponse["kpis"];
}

export function PortfolioKpis({ kpis }: Props) {
  const cards = [
    { label: "Valeur portefeuille", value: `${fmt(kpis.portfolioValue)} FCFA`, sub: `${kpis.activeCount} chantiers` },
    { label: "Production cumulée", value: `${fmt(kpis.production)} FCFA`, sub: "YTD réalisé" },
    { label: "Reste à produire", value: `${fmt(kpis.remaining)} FCFA`, sub: "Carnet" },
    { label: "Marge moyenne", value: `${kpis.avgMargin.toFixed(1)} %`, sub: "Pondérée budget" },
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
