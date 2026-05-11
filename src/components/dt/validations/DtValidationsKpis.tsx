"use client";

import type { DtValidationsResponse } from "@/hooks/useDtValidations";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} M`;
  return n.toLocaleString("fr-FR");
}

export function DtValidationsKpis({ kpis }: { kpis: DtValidationsResponse["kpis"] }) {
  const cards = [
    { label: "N2 en attente", value: kpis.pendingCount.toString(), sub: "Dossiers à traiter" },
    { label: "Montant cumulé", value: `${fmt(kpis.pendingAmount)} FCFA`, sub: "Total des dossiers" },
    { label: "Délai moyen", value: `${kpis.avgDelayHours.toFixed(1)} h`, sub: "Sur le mois" },
    { label: "Validés ce mois", value: kpis.monthValidatedCount.toString(), sub: "N2 technique clôturés" },
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
