"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { formatFCFA } from "@/lib/format";

export function OutflowsDonutChart({ data }: { data: Array<{ category: string; amount: number; color: string }> }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 shadow-card">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Sorties à venir 7 jours
      </h3>
      <div className="h-[180px] sm:h-[220px] lg:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              paddingAngle={2}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => formatFCFA(v)}
              contentStyle={{ borderRadius: 8, fontSize: 11 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
