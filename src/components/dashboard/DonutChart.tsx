"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SiteTypeSlice } from "@/hooks/useDashboardDg";
import { formatFCFA } from "@/lib/format";

interface Props {
  slices: SiteTypeSlice[];
  totalLabel: string;
  totalUnit: string;
}

export function DonutChart({ slices, totalLabel, totalUnit }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Répartition CA par type</h3>
        <span className="text-[11px] text-ink-3">YTD</span>
      </div>

      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[180px_1fr]">
        <div className="relative mx-auto h-[180px] w-[180px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={80}
                stroke="#fff"
                strokeWidth={2}
                paddingAngle={1}
              >
                {slices.map((s) => (
                  <Cell key={s.type} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,.06)",
                }}
                formatter={(value: number) => [formatFCFA(value), "Budget cumulé"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-lg font-bold tabular-nums text-ink">
              {totalLabel}
            </div>
            <div className="text-[11px] text-ink-3">{totalUnit}</div>
          </div>
        </div>

        <ul className="space-y-1.5 text-[12px]">
          {slices.map((s) => (
            <li key={s.type} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                  style={{ background: s.color }}
                />
                <span className="truncate text-ink-2">{s.label}</span>
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
