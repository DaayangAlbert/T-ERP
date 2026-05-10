"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  data: Array<{ category: string; count: number; color: string }>;
}

export function CategoryDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <header className="mb-2">
        <h3 className="text-[13px] font-semibold text-ink">Répartition par catégorie</h3>
        <p className="text-[11.5px] text-ink-3">{total} salariés répartis en {data.length} catégories</p>
      </header>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="h-[180px] w-full max-w-[200px] flex-shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="category"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
                stroke="#FFFFFF"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v} (${((v / total) * 100).toFixed(1)} %)`, "Effectif"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-1.5 text-[12px]">
          {data.map((d) => (
            <li key={d.category} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="flex-1 truncate text-ink">{d.category}</span>
              <span className="font-mono font-semibold text-ink">{d.count}</span>
              <span className="text-[10.5px] text-ink-3">
                {((d.count / total) * 100).toFixed(0)} %
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
