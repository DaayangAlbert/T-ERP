"use client";

import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, Area, Line, CartesianGrid } from "recharts";
import { usePayrollMass } from "@/hooks/useHr";
import { formatFCFA } from "@/lib/format";

export function PayrollMassChart() {
  const { data, isLoading } = usePayrollMass();
  if (isLoading || !data) return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;

  // Concatène 24 mois passés + 12 mois projection en marquant le dernier point passé
  const chartData = [
    ...data.series.map((p) => ({ ...p, type: "real" as const })),
    ...data.projection12m.slice(1).map((p) => ({ period: p.period, gross: p.gross, charged: p.charged, type: "projection" as const })),
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Brut mensuel courant" value={formatFCFA(data.summary.currentMonthlyGross)} />
        <Stat label="Chargé mensuel courant" value={formatFCFA(data.summary.currentMonthlyCharged)} highlight />
        <Stat label="Ratio masse / CA" value={`${data.summary.ratioToRevenue.toFixed(1).replace(".", ",")} %`} />
        <Stat label="Bulletins payés (12 mois)" value={String(data.summary.payslipsRecent)} />
      </div>

      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Évolution masse salariale (24 mois passés + 12 mois projection)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip
              formatter={(v: number) => formatFCFA(v)}
              labelFormatter={(l) => `Période ${l}`}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="charged" name="Chargé" stroke="#A855F7" fill="#A855F7" fillOpacity={0.15} />
            <Line type="monotone" dataKey="gross" name="Brut" stroke="#15803D" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={
        "rounded-lg border p-3 shadow-card " +
        (highlight ? "border-primary-300 bg-primary-50" : "border-line bg-white")
      }
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className={"mt-1 font-mono text-[18px] font-bold " + (highlight ? "text-primary-800" : "text-ink")}>{value}</div>
    </div>
  );
}
