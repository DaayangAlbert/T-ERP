"use client";

import { useState } from "react";
import { clsx } from "clsx";
import type { DtCapacityResponse } from "@/hooks/useDtCapacity";

function pctClass(pct: number): string {
  if (pct >= 100) return "bg-rose-500 text-white";
  if (pct >= 80) return "bg-amber-400 text-amber-900";
  if (pct >= 50) return "bg-emerald-300 text-emerald-900";
  return "bg-slate-100 text-slate-600";
}

interface Props {
  data: DtCapacityResponse;
}

export function CapacityHeatmap({ data }: Props) {
  // Sur mobile : sélecteur d'équipe + vue verticale par semaine
  const [mobileCrew, setMobileCrew] = useState(data.crews[0]?.id ?? "");
  const selectedCrew = data.crews.find((c) => c.id === mobileCrew);

  return (
    <div className="space-y-3">
      {/* Desktop / tablet : heatmap classique */}
      <div className="hidden rounded-xl border border-line bg-white p-3 md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[10.5px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-[10.5px] font-medium text-ink-3">
                  Équipe
                </th>
                {data.weeks.map((w) => (
                  <th
                    key={w}
                    className="border-b border-line px-1 py-1 text-center text-[9.5px] font-medium text-ink-3"
                  >
                    {w.slice(-3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.crews.map((c) => (
                <tr key={c.id}>
                  <td className="sticky left-0 z-10 max-w-[140px] truncate bg-white px-2 py-0.5 text-[11px] font-medium text-ink">
                    {c.name}
                  </td>
                  {c.cells.map((cell) => (
                    <td
                      key={cell.weekIso}
                      title={`${cell.weekIso} · ${cell.plannedHours.toFixed(0)} h (${cell.pct}%)${cell.siteName ? " · " + cell.siteName : ""}`}
                      className={clsx(
                        "border border-white/50 text-center tabular-nums text-[9.5px] font-semibold",
                        pctClass(cell.pct)
                      )}
                      style={{ minWidth: 24, height: 20 }}
                    >
                      {cell.pct}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-ink-3">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-100" />&lt; 50 %</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-300" />50-79 %</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />80-99 %</span>
          <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-500" />≥ 100 % (surcharge)</span>
        </div>
      </div>

      {/* Mobile : sélecteur d'équipe + vue par semaine */}
      <div className="md:hidden">
        <select
          value={mobileCrew}
          onChange={(e) => setMobileCrew(e.target.value)}
          className="mb-2 h-9 w-full rounded-md border border-line-2 bg-white px-2 text-[12.5px] focus:border-primary-500 focus:outline-none"
        >
          {data.crews.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {selectedCrew && (
          <div className="rounded-xl border border-line bg-white">
            <table className="w-full text-[12px]">
              <thead className="bg-surface-alt text-[10.5px] uppercase text-ink-3">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">Sem.</th>
                  <th className="px-2 py-1.5 text-right font-medium">Heures</th>
                  <th className="px-2 py-1.5 text-right font-medium">Charge</th>
                  <th className="px-2 py-1.5 text-left font-medium">Chantier</th>
                </tr>
              </thead>
              <tbody>
                {selectedCrew.cells.map((c) => (
                  <tr key={c.weekIso} className="border-t border-line">
                    <td className="px-2 py-1 font-mono">{c.weekIso.slice(-3)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.plannedHours.toFixed(0)} h</td>
                    <td className="px-2 py-1 text-right">
                      <span
                        className={clsx(
                          "inline-block rounded px-1.5 py-0.5 text-[10.5px] font-semibold",
                          pctClass(c.pct)
                        )}
                      >
                        {c.pct} %
                      </span>
                    </td>
                    <td className="px-2 py-1 text-ink-2">
                      <span className="block truncate" title={c.siteName ?? ""}>
                        {c.siteName ?? "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
