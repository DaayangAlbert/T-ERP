"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatFCFA } from "@/lib/format";

export function TreasuryEvolutionChart({ data }: { data: Array<{ date: string; value: number }> }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Évolution 7 derniers jours
      </h3>
      <div className="h-[160px] sm:h-[180px] lg:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="treasuryDailyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#A855F7" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(d) => d.slice(8)}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#A855F7" strokeWidth={2} fill="url(#treasuryDailyGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
