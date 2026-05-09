"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { usePurchaseAnalytics } from "@/hooks/usePurchase";
import { formatFCFA } from "@/lib/format";

const COLORS = ["#A855F7", "#15803D", "#0369A1", "#B45309", "#B91C1C", "#7E22CE", "#3B82F6", "#10B981"];

export function PurchaseAnalytics() {
  const { data, isLoading } = usePurchaseAnalytics();
  if (isLoading || !data) return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Fournisseurs actifs" value={String(data.summary.totalSuppliers)} />
        <Stat label="Volume YTD" value={formatFCFA(BigInt(data.summary.totalVolumeYTD))} highlight />
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Évolution volume achats (24 mois)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="amount" fill="#A855F7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Top 10 fournisseurs (donut)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.top10}
                dataKey="volume"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.top10.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-xl border border-line bg-white p-4 shadow-card">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Évolution prix matières clés
          </h3>
          <ul className="space-y-2.5">
            {data.materials.map((m) => (
              <li key={m.name} className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
                <div>
                  <div className="text-[12.5px] font-medium text-ink">{m.name}</div>
                  <div className="font-mono text-[14px] font-semibold text-ink">{m.currentPrice.toLocaleString("fr-FR")} FCFA</div>
                </div>
                <span
                  className={
                    m.variation12m > 0
                      ? "inline-flex items-center gap-1 rounded bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger"
                      : "inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"
                  }
                >
                  {m.variation12m > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {m.variation12m > 0 ? "+" : ""}
                  {m.variation12m.toFixed(1).replace(".", ",")} %
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Répartition par catégorie
        </h3>
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="py-2 pl-3 text-left">Catégorie</th>
              <th className="py-2 pr-3 text-right">Volume YTD</th>
            </tr>
          </thead>
          <tbody>
            {data.byCategory.map((c) => (
              <tr key={c.category} className="border-t border-line">
                <td className="py-2 pl-3 text-ink">{c.category}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{formatFCFA(BigInt(c.volume))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-lg border p-3 shadow-card " + (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
