"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { RevenueChartPoint } from "@/hooks/useDashboardDg";

interface Props {
  data: RevenueChartPoint[];
}

const REVENUE_COLOR = "#A855F7";
const MARGIN_COLOR = "#15803D";

export function RevenueChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Évolution CA &amp; marge — 12 mois
        </h3>
        <span className="text-[11px] text-ink-3">CA en M FCFA · marge en %</span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6B7280" }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <YAxis
              yAxisId="margin"
              orientation="right"
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              cursor={{ fill: "rgba(168,85,247,.08)" }}
              contentStyle={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              }}
              formatter={(value: number, name) => {
                if (name === "Marge brute") return [`${value} %`, name];
                return [`${value} M FCFA`, name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              iconType="circle"
              iconSize={8}
              align="left"
              verticalAlign="bottom"
            />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              name="Chiffre d'affaires"
              fill={REVENUE_COLOR}
              radius={[3, 3, 0, 0]}
              barSize={18}
            />
            <Line
              yAxisId="margin"
              type="monotone"
              dataKey="margin"
              name="Marge brute"
              stroke={MARGIN_COLOR}
              strokeWidth={2.5}
              dot={{ r: 3, fill: MARGIN_COLOR }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
