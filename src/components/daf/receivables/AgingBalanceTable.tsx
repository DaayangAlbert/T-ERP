"use client";

import { useAgingBalance } from "@/hooks/useDafReceivables";
import { formatFCFA } from "@/lib/format";

export function AgingBalanceTable() {
  const { data, isLoading } = useAgingBalance();
  if (isLoading || !data) return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Balance âgée
      </h3>

      {/* Desktop : tableau */}
      <table className="hidden w-full text-[12.5px] md:table">
        <thead className="text-[11px] uppercase tracking-wide text-ink-3">
          <tr>
            <th className="pb-2 text-left">Tranche</th>
            <th className="pb-2 text-right">Montant</th>
            <th className="pb-2 text-right">%</th>
            <th className="pb-2 pl-3 text-left">Indicateur</th>
          </tr>
        </thead>
        <tbody>
          {data.buckets.map((b) => (
            <tr key={b.range} className="border-t border-line">
              <td className="py-2 font-medium text-ink">{b.range}</td>
              <td className="py-2 text-right font-mono tabular-nums">{formatFCFA(BigInt(b.amount))}</td>
              <td className="py-2 text-right font-mono">{b.pct.toFixed(1).replace(".", ",")} %</td>
              <td className="py-2 pl-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
                  <div className="h-full" style={{ width: `${Math.min(100, b.pct)}%`, background: b.color }} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile : cards superposées */}
      <ul className="space-y-2 md:hidden">
        {data.buckets.map((b) => (
          <li key={b.range} className="rounded-lg border border-line bg-surface-alt p-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-ink">{b.range}</span>
              <span className="font-mono text-[11.5px] text-ink-3">{b.pct.toFixed(1).replace(".", ",")} %</span>
            </div>
            <div className="mt-1 font-mono text-[14px] font-semibold text-ink">{formatFCFA(BigInt(b.amount))}</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
              <div className="h-full" style={{ width: `${Math.min(100, b.pct)}%`, background: b.color }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
