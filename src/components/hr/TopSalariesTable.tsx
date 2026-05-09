"use client";

import { usePayrollMass } from "@/hooks/useHr";
import { formatFCFA } from "@/lib/format";

export function TopSalariesTable() {
  const { data, isLoading } = usePayrollMass();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Décomposition par catégorie
        </h3>
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Catégorie</th>
              <th className="py-2 text-right">Effectif</th>
              <th className="py-2 text-right">Coût moyen</th>
              <th className="py-2 pr-3 text-right">Coût total mensuel</th>
            </tr>
          </thead>
          <tbody>
            {data.byCategory.map((c) => (
              <tr key={c.label} className="border-t border-line">
                <td className="py-2 pl-3 font-medium text-ink">{c.label}</td>
                <td className="py-2 text-right">{c.headcount}</td>
                <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(c.averageGross)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatFCFA(c.totalGross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Top 20 salaires bruts mensuels
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">#</th>
                <th className="py-2 text-left">Nom</th>
                <th className="py-2 text-left">Poste</th>
                <th className="py-2 text-left">Catégorie</th>
                <th className="py-2 text-right">Ancienneté</th>
                <th className="py-2 pr-3 text-right">Brut</th>
              </tr>
            </thead>
            <tbody>
              {data.top20.map((u, i) => (
                <tr key={u.id} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3 font-mono text-[10.5px] text-ink-3">{i + 1}</td>
                  <td className="py-2 font-medium text-ink">{u.name}</td>
                  <td className="py-2 text-ink-2">{u.position}</td>
                  <td className="py-2 text-ink-3">{u.category}</td>
                  <td className="py-2 text-right text-ink-3">{u.seniority} an{u.seniority > 1 ? "s" : ""}</td>
                  <td className="py-2 pr-3 text-right font-mono font-semibold tabular-nums">
                    {formatFCFA(u.gross)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
