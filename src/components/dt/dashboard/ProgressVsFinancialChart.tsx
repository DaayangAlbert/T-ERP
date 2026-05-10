"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";

interface Props {
  data: DtDashboardResponse["progressVsFinancial"];
}

export function ProgressVsFinancialChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">
        Avancement physique vs financier
      </h3>
      <p className="mb-3 text-[11px] text-ink-3">
        Top 6 chantiers par budget. Écart &gt; 5 pts ⇒ révision facturation/coûts.
      </p>
      <div className="h-[180px] sm:h-[200px] lg:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE7F4" />
            <XAxis
              dataKey="code"
              tick={{ fontSize: 10, fill: "#6F6280" }}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={48}
            />
            <YAxis tick={{ fontSize: 10, fill: "#6F6280" }} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v: number) => `${v} %`}
              labelFormatter={(label, payload) =>
                payload?.[0]?.payload?.name ?? label
              }
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="physical" name="Physique" fill="#A855F7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="financial" name="Financier" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
