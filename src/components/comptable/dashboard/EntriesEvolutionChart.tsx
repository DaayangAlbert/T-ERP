"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props {
  data: Array<{ date: string; count: number }>;
}

export function EntriesEvolutionChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: d.date.slice(5),
    count: d.count,
  }));

  return (
    <section className="rounded-xl border border-line bg-white p-3 shadow-card">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Écritures saisies · 30 jours
      </h2>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
              formatter={(v: number) => [`${v} écritures`, "Nombre"]}
            />
            <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
