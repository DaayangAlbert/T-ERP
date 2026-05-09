"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatFCFA } from "@/lib/format";

export function PayrollMassChart({ data }: { data: Array<{ period: string; gross: number }> }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Évolution masse salariale 12 mois
      </h3>
      <div className="h-[180px] sm:h-[220px] lg:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 10 }}
              tickFormatter={(p) => p.slice(5)}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="gross" fill="#A855F7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
