"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyTrendPoint } from "@/hooks/useDashboardDg";

interface Props {
  data: WeeklyTrendPoint[];
}

export function WeeklyTrendChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.production, 0);

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Tendance hebdomadaire</h2>
          <p className="mt-0.5 text-[11px] text-ink-3">
            Production journalière des 7 derniers jours · M FCFA
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[13px] font-semibold tabular-nums text-ink">
            {total.toFixed(1).replace(".", ",")} M
          </div>
          <div className="text-[11px] text-ink-3">cumul 7 j</div>
        </div>
      </header>
      <div className="h-[180px] w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="weekly-trend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v) => `${v}M`}
            />
            <Tooltip
              cursor={{ stroke: "#A855F7", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              }}
              formatter={(value: number) => [`${value.toFixed(2).replace(".", ",")} M FCFA`, "Production"]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload as WeeklyTrendPoint | undefined;
                return item ? `${label} · ${new Date(item.date).toLocaleDateString("fr-FR")}` : label;
              }}
            />
            <Area
              type="monotone"
              dataKey="production"
              stroke="#A855F7"
              strokeWidth={2.5}
              fill="url(#weekly-trend)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
