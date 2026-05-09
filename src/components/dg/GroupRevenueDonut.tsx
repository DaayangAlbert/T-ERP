"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SubsidiaryRow } from "@/hooks/useDgConsolidation";
import { formatFCFA } from "@/lib/format";

interface Props {
  rows: SubsidiaryRow[];
  totalCa: number;
}

export function GroupRevenueDonut({ rows, totalCa }: Props) {
  const total = formatFCFA(totalCa, { splitUnit: true });
  const slices = rows
    .filter((r) => r.ca > 0)
    .map((r) => ({
      name: r.name,
      value: r.ca,
      color: r.color,
      percentage: totalCa ? (r.ca / totalCa) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Répartition CA YTD par filiale</h2>
        <span className="text-[11.5px] text-ink-3">YTD</span>
      </header>
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[180px_1fr]">
        <div className="relative mx-auto h-[180px] w-[180px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={80}
                stroke="#fff"
                strokeWidth={2}
                paddingAngle={1}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
                }}
                formatter={(value: number) => [formatFCFA(value), "CA YTD"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-lg font-bold tabular-nums text-ink">{total.value}</div>
            <div className="text-[11px] text-ink-3">{total.unit} · YTD</div>
          </div>
        </div>

        <ul className="space-y-1.5 text-[12px]">
          {slices.length === 0 && (
            <li className="text-ink-3">Aucun chantier actif sur le groupe.</li>
          )}
          {slices.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="truncate text-ink-2">{s.name}</span>
              </span>
              <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                {s.percentage.toFixed(1).replace(".", ",")} %
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
