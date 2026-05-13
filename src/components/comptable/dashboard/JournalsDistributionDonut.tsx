"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface Props {
  data: Array<{ code: string; label: string; count: number }>;
}

const COLORS = ["#7c3aed", "#15803d", "#0369a1", "#b45309", "#ea580c", "#0891b2"];

export function JournalsDistributionDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <section className="rounded-xl border border-line bg-white p-3 shadow-card">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
        Répartition par journal · 30 jours
      </h2>
      {total === 0 ? (
        <p className="text-[12.5px] text-ink-3">Aucune écriture sur la période.</p>
      ) : (
        <div className="h-48 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 6, border: "1px solid #e5e7eb" }}
                formatter={(v: number) => [`${v} écritures`, "Nombre"]}
              />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
