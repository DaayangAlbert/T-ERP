"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObjectiveDetail } from "@/hooks/useDgObjectives";
import { formatFCFA } from "@/lib/format";

interface Props {
  detail: ObjectiveDetail;
}

function formatTickValue(value: number, unit: string): string {
  if (unit === "FCFA") {
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}Md`;
    if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 1_000_000)}M`;
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  }
  return value.toString();
}

function formatTooltipValue(value: number, unit: string): string {
  if (unit === "FCFA") return formatFCFA(value);
  if (unit === "%") return `${value.toFixed(1).replace(".", ",")} %`;
  return `${value.toLocaleString("fr-FR")} ${unit}`;
}

export function ObjectiveTrajectoryChart({ detail }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">Trajectoire — {detail.title}</h2>
          <p className="text-[11.5px] text-ink-3">
            Cible <span className="font-mono">{formatTooltipValue(detail.targetValue, detail.unit)}</span> ·
            Réalisé <span className="font-mono text-ink-2">{formatTooltipValue(detail.actualValue, detail.unit)}</span>
          </p>
        </div>
      </header>
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <LineChart data={detail.trajectory} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
              width={48}
              tickFormatter={(v) => formatTickValue(v, detail.unit)}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              }}
              formatter={(value: number, name) => {
                if (value === null || value === undefined) return ["—", name];
                return [formatTooltipValue(value, detail.unit), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" iconSize={10} align="left" />
            <ReferenceLine
              y={detail.targetValue}
              stroke="#7E22CE"
              strokeDasharray="6 4"
              label={{
                value: "Cible",
                fill: "#7E22CE",
                fontSize: 11,
                position: "right",
              }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Prévisionnel"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Réalisé"
              stroke="#A855F7"
              strokeWidth={3}
              dot={{ r: 3, fill: "#A855F7" }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
