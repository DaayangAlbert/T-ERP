"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashflowResponse } from "@/hooks/useDgCashflow";
import { formatFCFA } from "@/lib/format";

interface Props {
  data: CashflowResponse;
}

function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}Md`;
  if (abs >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (abs >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toString();
}

export function CashFlowChart({ data }: Props) {
  const series = data.weeks.map((w) => ({
    week: w.weekLabel,
    balance: w.closingBalance,
    income: w.totalIncome,
    expense: -w.totalExpense, // affiché en barres négatives
    level: w.level,
  }));

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Trésorerie projetée — {data.horizon.weeks} semaines glissantes
          </h2>
          <p className="text-[11.5px] text-ink-3">
            Du {new Date(data.horizon.startDate).toLocaleDateString("fr-FR")} au{" "}
            {new Date(data.horizon.endDate).toLocaleDateString("fr-FR")}
            {" · "}
            {data.summary.criticalWeeksCount > 0 ? (
              <span className="font-medium text-danger">
                {data.summary.criticalWeeksCount} semaine(s) en alerte
              </span>
            ) : (
              <span className="text-success">Trajectoire saine</span>
            )}
          </p>
        </div>
      </header>
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={{ stroke: "#E5E7EB" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6B7280", fontFamily: "var(--font-plex-mono)" }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(v) => compact(v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(168,85,247,.05)" }}
              contentStyle={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.06)",
              }}
              formatter={(value: number, name) => {
                const isExpense = name === "Décaissements";
                return [formatFCFA(Math.abs(value)) + (isExpense && value < 0 ? " (sortie)" : ""), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} align="left" />
            <ReferenceLine
              y={data.thresholds.comfort}
              stroke="#7E22CE"
              strokeDasharray="4 4"
              label={{ value: "Confort", fill: "#7E22CE", fontSize: 10, position: "right" }}
            />
            <ReferenceLine
              y={data.thresholds.critical}
              stroke="#B91C1C"
              strokeDasharray="4 4"
              label={{ value: "Critique", fill: "#B91C1C", fontSize: 10, position: "right" }}
            />
            <Bar dataKey="income" name="Encaissements" fill="#15803D" radius={[2, 2, 0, 0]} barSize={14} />
            <Bar dataKey="expense" name="Décaissements" fill="#B91C1C" radius={[0, 0, 2, 2]} barSize={14} />
            <Line
              type="monotone"
              dataKey="balance"
              name="Solde projeté"
              stroke="#A855F7"
              strokeWidth={3}
              dot={{ r: 3, fill: "#A855F7" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
