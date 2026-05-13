"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { ChevronRight } from "lucide-react";
import type { SubsidiaryRow } from "@/hooks/useDgConsolidation";
import { formatFCFA } from "@/lib/format";

interface Props {
  rows: SubsidiaryRow[];
}

export function SubsidiariesTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">
          Comparatif filiales — performance YTD
        </h2>
        <span className="text-[11.5px] text-ink-3">{rows.length} entité{rows.length > 1 ? "s" : ""}</span>
      </header>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2.5 pl-4 text-left">Filiale</th>
              <th className="py-2.5 text-right">CA YTD</th>
              <th className="py-2.5 text-right">Marge</th>
              <th className="py-2.5 text-right">Effectif</th>
              <th className="py-2.5 text-right">Trésorerie</th>
              <th className="py-2.5 text-right">vs N-1</th>
              <th className="py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className={clsx("transition hover:bg-surface-alt", i < rows.length - 1 && "border-b border-line")}
              >
                <td className="py-3 pl-4">
                  <Link
                    href={`/direction-generale/consolidation/${r.id}`}
                    className="flex items-center gap-2.5 hover:text-primary-700"
                  >
                    <span
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md text-[12px] font-bold text-white"
                      style={{ background: r.color }}
                    >
                      {r.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{r.name}</span>
                      <span className="block text-[11px] text-ink-3">
                        {r.isParent ? "Société mère · " : ""}
                        {r.sector ?? "—"} · {r.sitesCount} chantier{r.sitesCount > 1 ? "s" : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-ink">
                  {formatFCFA(r.ca)}
                </td>
                <td
                  className={clsx(
                    "py-3 text-right font-mono font-semibold tabular-nums",
                    r.margin < 10 ? "text-danger" : r.margin < 15 ? "text-warning" : "text-success"
                  )}
                >
                  {r.margin.toFixed(1).replace(".", ",")} %
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-ink-2">
                  {r.headcount}
                </td>
                <td className="py-3 text-right font-mono tabular-nums text-ink-2">
                  {formatFCFA(r.treasury)}
                </td>
                <td
                  className={clsx(
                    "py-3 text-right font-mono font-semibold tabular-nums",
                    r.perfYoY > 0 ? "text-success" : r.perfYoY < 0 ? "text-danger" : "text-ink-3"
                  )}
                >
                  {r.perfYoY > 0 ? "▲ " : r.perfYoY < 0 ? "▼ " : "▬ "}
                  {Math.abs(r.perfYoY).toFixed(1).replace(".", ",")} %
                </td>
                <td className="py-3 pr-4 text-right">
                  <Link
                    href={`/direction-generale/consolidation/${r.id}`}
                    aria-label={`Détail ${r.name}`}
                    className="grid h-7 w-7 place-items-center rounded text-ink-3 hover:bg-surface-alt hover:text-primary-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/direction-generale/consolidation/${r.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-alt">
              <span
                className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md text-sm font-bold text-white"
                style={{ background: r.color }}
              >
                {r.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ink">{r.name}</span>
                  <span
                    className={clsx(
                      "font-mono text-[11px] font-semibold tabular-nums",
                      r.perfYoY > 0 ? "text-success" : r.perfYoY < 0 ? "text-danger" : "text-ink-3"
                    )}
                  >
                    {r.perfYoY > 0 ? "▲ " : r.perfYoY < 0 ? "▼ " : "▬ "}
                    {Math.abs(r.perfYoY).toFixed(1).replace(".", ",")} %
                  </span>
                </span>
                <span className="mt-0.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-ink-3">
                  <span>CA : <span className="font-mono text-ink-2">{formatFCFA(r.ca)}</span></span>
                  <span>Marge : <span className="font-mono text-ink-2">{r.margin.toFixed(1).replace(".", ",")} %</span></span>
                  <span>Effectif : <span className="font-mono text-ink-2">{r.headcount}</span></span>
                  <span>Trésorerie : <span className="font-mono text-ink-2">{formatFCFA(r.treasury)}</span></span>
                </span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-4" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
