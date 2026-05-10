"use client";

import { AlertTriangle } from "lucide-react";
import { clsx } from "clsx";
import { useOvertimeSummary } from "@/hooks/useDafHr";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export function OvertimeAnalysis() {
  const { data, isLoading } = useOvertimeSummary();

  if (isLoading || !data) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Heures sup totales</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.totalHours} h</div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Coût total</div>
          <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.summary.totalCost)}</div>
        </div>
        <div className={clsx("rounded-md border p-2.5 text-center", data.summary.alertsCount > 0 ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
          <div className={clsx("text-[10.5px] uppercase", data.summary.alertsCount > 0 ? "text-rose-700" : "text-ink-3")}>
            Hors seuil ({data.threshold} h)
          </div>
          <div className={clsx("font-mono text-[14px] font-bold", data.summary.alertsCount > 0 ? "text-rose-700" : "text-ink")}>
            {data.summary.alertsCount}
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-2.5 text-center">
          <div className="text-[10.5px] uppercase text-ink-3">Top employés analysés</div>
          <div className="font-mono text-[14px] font-bold text-ink">{data.summary.topEmployeesCount}</div>
        </div>
      </div>

      {/* Top 20 */}
      <div className="rounded-xl border border-line bg-white">
        <header className="border-b border-line p-3">
          <h3 className="text-[13px] font-semibold text-ink">Top 20 employés en heures supplémentaires</h3>
          <p className="text-[11.5px] text-ink-3">Seuil convention BTP : {data.threshold} h / mois.</p>
        </header>
        <div className="hidden md:block">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left">Salarié</th>
                <th className="px-3 py-2 text-left">Poste</th>
                <th className="px-3 py-2 text-left">Chantier</th>
                <th className="px-3 py-2 text-right">Heures sup</th>
                <th className="px-3 py-2 text-right">Coût (×1.25)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.topEmployees.map((e) => (
                <tr key={e.name} className={clsx("hover:bg-surface-alt/40", e.aboveThreshold && "bg-rose-50/40")}>
                  <td className="px-3 py-2 font-medium text-ink">{e.name}</td>
                  <td className="px-3 py-2 text-[12px] text-ink-3">{e.position ?? "—"}</td>
                  <td className="px-3 py-2 text-[12px] text-ink-3">{e.siteName ?? "—"}</td>
                  <td className={clsx("px-3 py-2 text-right font-mono text-[12.5px] font-semibold", e.aboveThreshold && "text-rose-700")}>
                    {e.aboveThreshold && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                    {e.overtimeHours} h
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(e.overtimeCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 p-2 md:hidden">
          {data.topEmployees.map((e) => (
            <div key={e.name} className={clsx("rounded-md border p-2.5", e.aboveThreshold ? "border-rose-200 bg-rose-50" : "border-line bg-white")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-ink">{e.name}</div>
                  <div className="text-[11px] text-ink-3">{e.position ?? "—"}{e.siteName && ` · ${e.siteName}`}</div>
                </div>
                <div className="text-right">
                  <div className={clsx("font-mono text-[13px] font-bold", e.aboveThreshold ? "text-rose-700" : "text-ink")}>
                    {e.overtimeHours} h
                  </div>
                  <div className="font-mono text-[11px] text-ink-3">{fmt(e.overtimeCost)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down par chantier */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Drill-down par chantier (impact marge)</h3>
        <div className="mt-2 space-y-1.5">
          {data.bySite.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
              <span className="text-[12.5px] font-medium text-ink">{s.name}</span>
              <span className="text-[12px] text-ink-3">
                {s.hours} h · <span className="font-mono font-semibold text-ink">{fmt(s.cost)} FCFA</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
