"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: Array<{ period: string; headcount: number }>;
}

export function HeadcountEvolutionChart({ data }: Props) {
  const min = Math.min(...data.map((d) => d.headcount));
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <header className="mb-2">
        <h3 className="text-[13px] font-semibold text-ink">Évolution effectifs (12 mois)</h3>
        <p className="text-[11.5px] text-ink-3">
          {min} → {data.at(-1)?.headcount ?? 0} salariés actifs
        </p>
      </header>
      <div className="h-[160px] w-full sm:h-[180px] lg:h-[220px]">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 6 }}>
            <defs>
              <linearGradient id="rhHeadcount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#A855F7" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
            <XAxis dataKey="period" fontSize={10} stroke="#6B7280" />
            <YAxis fontSize={10} stroke="#6B7280" domain={[Math.max(0, min - 20), "auto"]} />
            <Tooltip formatter={(v: number) => [`${v} salariés`, "Effectif"]} />
            <Area type="monotone" dataKey="headcount" stroke="#A855F7" strokeWidth={2} fill="url(#rhHeadcount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
