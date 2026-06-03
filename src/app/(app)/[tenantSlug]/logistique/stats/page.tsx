"use client";

import { Download, FileText } from "lucide-react";
import { clsx } from "clsx";
import { useLogStats } from "@/hooks/useLogStats";
import { useTenant } from "@/hooks/useTenant";
import { PageHelp } from "@/components/help/PageHelp";
import { LogStatsTutorial } from "@/components/help/tutorials/LogStatsTutorial";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

export default function LogStatsPage() {
  const { data, isLoading } = useLogStats();
  const { tenant } = useTenant();

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  const maxValue = Math.max(...data.monthlyEvolution.map((m) => m.value), 1);
  const W = 600;
  const H = 200;
  const padding = { top: 20, right: 16, bottom: 30, left: 50 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;
  const barWidth = innerW / data.monthlyEvolution.length;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Statistiques achats{tenant?.name ? ` ${tenant.name}` : ""}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Analyses YTD consolidées + rapport DG mensuel.
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            disabled
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-3 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button
            disabled
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-semibold text-white disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" /> Rapport DG
          </button>
          <PageHelp title="Aide — Stats Logistique"><LogStatsTutorial /></PageHelp>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none text-ink">{fmt(data.kpis.totalYtd)}</div>
          <div className="mt-1 text-[11.5px] text-ink-2">Total achats YTD</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className="text-[20px] font-bold leading-none text-emerald-700">
            {fmt(data.kpis.savings)}
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Économies</div>
          <div className="text-[10.5px] text-emerald-700">{data.kpis.savingsPercent} % vs budget</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className={clsx("text-[20px] font-bold leading-none", data.kpis.avgPaymentDays <= data.kpis.paymentTarget ? "text-emerald-700" : "text-amber-700")}>
            {data.kpis.avgPaymentDays} j
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Délai paiement moyen</div>
          <div className="text-[10.5px] text-ink-3">Cible {data.kpis.paymentTarget} j</div>
        </div>
        <div className="rounded-xl border border-line bg-white px-3 py-2.5">
          <div className={clsx("text-[20px] font-bold leading-none", data.kpis.onTimeDeliveryRate >= 90 ? "text-emerald-700" : "text-amber-700")}>
            {data.kpis.onTimeDeliveryRate} %
          </div>
          <div className="mt-1 text-[11.5px] text-ink-2">Livraisons à l&apos;heure</div>
        </div>
      </div>

      {/* Graphe évolution mensuelle (SVG barres) */}
      <section className="rounded-xl border border-line bg-white p-3 sm:p-4">
        <h2 className="text-[13px] font-semibold text-ink">Évolution des achats mensuels (M FCFA)</h2>
        <div className="mt-3 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" preserveAspectRatio="xMidYMid meet">
            {/* Axe Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const y = padding.top + innerH * (1 - t);
              return (
                <g key={t}>
                  <line
                    x1={padding.left}
                    x2={W - padding.right}
                    y1={y}
                    y2={y}
                    stroke="#EEE7F4"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#6F6280"
                  >
                    {new Intl.NumberFormat("fr-FR").format(Math.round((maxValue * t)))}
                  </text>
                </g>
              );
            })}
            {/* Barres */}
            {data.monthlyEvolution.map((m, i) => {
              const h = (m.value / maxValue) * innerH;
              const x = padding.left + i * barWidth + 4;
              const y = padding.top + innerH - h;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth - 8}
                    height={h}
                    fill={m.projected ? "#C4B5FD" : "#5B2A86"}
                    rx={3}
                  >
                    <title>
                      {m.month}: {new Intl.NumberFormat("fr-FR").format(Math.round(m.value))} FCFA{m.projected ? " (projection)" : ""}
                    </title>
                  </rect>
                  <text
                    x={x + (barWidth - 8) / 2}
                    y={padding.top + innerH + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6F6280"
                  >
                    {m.month}{m.projected ? "*" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-1 text-[10.5px] text-ink-3">* mois en cours : projection sur jours restants</p>
      </section>

      {/* Donut catégorie (réutilise barres horizontales) */}
      <section className="rounded-xl border border-line bg-white p-3 sm:p-4">
        <h2 className="text-[13px] font-semibold text-ink">Achats YTD par catégorie</h2>
        <ul className="mt-3 space-y-2 text-[12px]">
          {data.byCategory.map((c) => (
            <li key={c.category}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{c.category}</span>
                <span className="text-ink-3">{c.pct.toFixed(0)} % · {fmt(c.value)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Par chantier */}
      <section className="rounded-xl border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Dépenses par chantier YTD (top 7)</h2>
        </header>
        <div className="hidden md:block">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Chantier</th>
                <th className="px-3 py-2 text-right font-medium">Achats YTD</th>
                <th className="px-3 py-2 text-right font-medium">Budget achats</th>
                <th className="px-3 py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody>
              {data.bySite.map((s) => (
                <tr key={s.code} className="border-t border-line">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{s.code}</td>
                  <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(s.purchases)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{fmt(s.budget)}</td>
                  <td
                    className={clsx(
                      "px-3 py-2 text-right tabular-nums font-semibold",
                      s.gap < 0 ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {s.gap > 0 ? "+" : ""}{fmt(s.gap)} ({s.gapPercent > 0 ? "+" : ""}{s.gapPercent.toFixed(1)} %)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 p-3 md:hidden">
          {data.bySite.map((s) => (
            <div key={s.code} className="rounded-lg border border-line p-3">
              <div className="font-mono text-[11px] text-ink-3">{s.code}</div>
              <div className="text-[13px] font-semibold text-ink">{s.name}</div>
              <div className="mt-1.5 flex justify-between text-[11.5px]">
                <span className="text-ink-3">Achats / Budget</span>
                <span className="font-mono">{fmt(s.purchases)} / {fmt(s.budget)}</span>
              </div>
              <div
                className={clsx(
                  "mt-0.5 text-right text-[11.5px] font-semibold",
                  s.gap < 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                Écart {s.gap > 0 ? "+" : ""}{fmt(s.gap)} ({s.gapPercent > 0 ? "+" : ""}{s.gapPercent.toFixed(1)} %)
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
