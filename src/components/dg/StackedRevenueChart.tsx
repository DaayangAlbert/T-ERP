"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SubsidiaryRow } from "@/hooks/useDgConsolidation";

interface Props {
  data: Record<string, number | string>[];
  subsidiaries: SubsidiaryRow[];
}

export function StackedRevenueChart({ data, subsidiaries }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">CA mensuel par filiale — 12 mois</h2>
        <span className="text-[11.5px] text-ink-3">M FCFA</span>
      </header>
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}M`}
            />
            <Tooltip
              cursor={{ fill: "rgba(168,85,247,.05)" }}
              contentStyle={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              }}
              formatter={(value: number, name) => [`${value} M FCFA`, name]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11.5 }}
              iconType="square"
              iconSize={9}
              align="left"
            />
            {subsidiaries.map((s) => (
              <Bar
                key={s.slug}
                dataKey={s.slug}
                stackId="ca"
                name={s.name}
                fill={s.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
