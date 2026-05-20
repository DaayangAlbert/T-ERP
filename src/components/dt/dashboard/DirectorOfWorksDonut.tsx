"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DtDashboardResponse } from "@/hooks/useDtDashboard";

interface Props {
  data: DtDashboardResponse["progressByDirectorOfWorks"];
}

function formatM(amount: number): string {
  if (amount >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))}`;
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))}`;
}

export function DirectorOfWorksDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.production, 0);

  return (
    <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-ink">
        Répartition par directeur de travaux
      </h3>
      <p className="mb-3 text-[11px] text-ink-3">
        Production cumulée YTD par directeur, sur les 23 chantiers.
      </p>
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:items-stretch">
        <div className="h-[160px] w-full sm:h-[180px] lg:h-[200px] lg:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="production"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                formatter={(v: number) => `${formatM(v)} FCFA`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-col gap-1.5 text-[11.5px] lg:flex-1 lg:justify-center">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: d.color }}
              />
              <span className="flex-1 truncate font-medium text-ink">{d.name}</span>
              <span className="text-ink-3">
                {d.sites} ch · {formatM(d.production)}
              </span>
            </li>
          ))}
          {total > 0 && (
            <li className="mt-2 border-t border-line pt-1.5 text-[11px] text-ink-3">
              Total : <strong>{formatM(total)} FCFA</strong>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
