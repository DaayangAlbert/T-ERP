"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { clsx } from "clsx";
import { useValidationStats } from "@/hooks/useDafValidationsCircuit";

function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} j`;
}

function HeatmapTable({ heatmap }: { heatmap: Array<{ hour: number; count: number }> }) {
  const max = Math.max(...heatmap.map((h) => h.count), 1);
  return (
    <>
      {/* Desktop : grille horizontale 24 cellules */}
      <div className="hidden md:block">
        <div className="grid grid-cols-12 gap-1 lg:grid-cols-24">
          {heatmap.map((h) => {
            const intensity = h.count / max;
            const bg = intensity > 0.66 ? "bg-primary-600 text-white" : intensity > 0.33 ? "bg-primary-300 text-primary-900" : intensity > 0 ? "bg-primary-100 text-primary-700" : "bg-surface-alt text-ink-3";
            return (
              <div key={h.hour} className={clsx("rounded-md p-2 text-center text-[11px]", bg)}>
                <div className="font-mono">{String(h.hour).padStart(2, "0")}h</div>
                <div className="font-bold">{h.count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile : cards par tranche horaire (regroupées 4h) */}
      <div className="space-y-1 md:hidden">
        {Array.from({ length: 6 }, (_, i) => {
          const slice = heatmap.slice(i * 4, i * 4 + 4);
          const total = slice.reduce((s, x) => s + x.count, 0);
          const start = String(i * 4).padStart(2, "0");
          const end = String(i * 4 + 4).padStart(2, "0");
          return (
            <div key={i} className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2">
              <span className="text-[12.5px] font-medium text-ink">
                {start}h – {end}h
              </span>
              <span className="font-mono text-[13px] font-bold text-primary-700">{total}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ValidationStatsCharts() {
  const { data, isLoading } = useValidationStats();

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-ink-3">
        Statistiques sur les <span className="font-semibold text-ink">{data.period.total}</span> validations
        des {data.period.sinceDays} derniers jours.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Délai moyen par étape */}
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Délai moyen par étape</h3>
          <p className="text-[11.5px] text-ink-3">Temps entre arrivée à l&apos;étape et décision.</p>
          <div className="mt-2 space-y-2">
            {data.avgByStep.map((s) => (
              <div key={s.step}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-ink">Étape {s.step}</span>
                  <span className="font-mono text-ink-3">{s.count} déc · {fmtHours(s.averageHours)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={clsx(
                      "h-full",
                      s.averageHours > 48 ? "bg-rose-500" : s.averageHours > 24 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min((s.averageHours / 72) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Taux de rejet par étape */}
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Taux de rejet par étape</h3>
          <p className="text-[11.5px] text-ink-3">Sur les 90 derniers jours.</p>
          <div className="mt-2 space-y-2">
            {data.rejectionByStep.map((s) => (
              <div key={s.step}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-ink">Étape {s.step}</span>
                  <span className="font-mono text-ink-3">{s.rejected} / {s.total} ({s.percent.toFixed(1)} %)</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className={clsx("h-full", s.percent > 15 ? "bg-rose-500" : s.percent > 5 ? "bg-amber-500" : "bg-primary-500")}
                    style={{ width: `${Math.min(s.percent * 4, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Délai moyen par type */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Délai moyen par type de demande</h3>
        <div className="mt-2 h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data.byType.filter((t) => t.count > 0)} layout="vertical" margin={{ top: 8, right: 12, left: 60, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" fontSize={10} stroke="#6B7280" tickFormatter={(v) => `${v.toFixed(0)} h`} />
              <YAxis type="category" dataKey="label" fontSize={11} stroke="#6B7280" width={70} />
              <Tooltip formatter={(v: number) => [fmtHours(v), "Délai moyen"]} />
              <Bar dataKey="averageHours" radius={[0, 3, 3, 0]}>
                {data.byType.filter((t) => t.count > 0).map((t, i) => (
                  <Cell key={i} fill={t.averageHours > 48 ? "#EF4444" : t.averageHours > 24 ? "#F59E0B" : "#A855F7"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top validateurs lents */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Top validateurs avec demandes en attente</h3>
        <p className="text-[11.5px] text-ink-3">Triés par ancienneté moyenne des demandes.</p>
        <div className="mt-2 h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data.topSlowValidators} layout="vertical" margin={{ top: 8, right: 12, left: 90, bottom: 8 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" horizontal={false} />
              <XAxis type="number" fontSize={10} stroke="#6B7280" tickFormatter={(v) => `${v.toFixed(0)} j`} />
              <YAxis type="category" dataKey="name" fontSize={10} stroke="#6B7280" width={100} />
              <Tooltip formatter={(v: number, n) => n === "averageAgeDays" ? [`${v.toFixed(1)} jours`, "Ancienneté moy"] : [v, "Demandes"]} />
              <Bar dataKey="averageAgeDays" radius={[0, 3, 3, 0]}>
                {data.topSlowValidators.map((s, i) => (
                  <Cell key={i} fill={s.averageAgeDays > 5 ? "#EF4444" : s.averageAgeDays > 3 ? "#F59E0B" : "#A855F7"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heatmap horaire */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Heatmap d&apos;arrivée des validations</h3>
        <p className="text-[11.5px] text-ink-3">Par heure de création (hors weekend).</p>
        <div className="mt-3">
          <HeatmapTable heatmap={data.heatmap} />
        </div>
      </div>
    </div>
  );
}
