"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { VarianceItem, VarianceTotals } from "@/hooks/useDafFinance";

const BUDGETED_NET_RESULT_FCFA = 540_000_000; // base de référence pour la cascade

interface Step {
  key: string;
  label: string;
  base: number;     // start
  delta: number;    // signed
  color: string;
  isTotal?: boolean;
}

function buildSteps(items: VarianceItem[], totals: VarianceTotals): Step[] {
  // Cascade : on part du résultat budgété, on applique chaque écart, on arrive au résultat réalisé
  const base = BUDGETED_NET_RESULT_FCFA;
  const steps: Step[] = [
    { key: "budget", label: "Résultat budgété", base: 0, delta: base, color: "#7E22CE", isTotal: true },
  ];

  let running = base;
  for (const it of items) {
    // Un écart positif sur un poste de coût = surcoût = impact négatif sur le résultat
    const impactOnResult = -Number(it.variance);
    const start = impactOnResult >= 0 ? running : running + impactOnResult;
    steps.push({
      key: it.id,
      label: it.costCenter,
      base: start,
      delta: Math.abs(impactOnResult),
      color: impactOnResult >= 0 ? "#10B981" : "#EF4444",
    });
    running += impactOnResult;
  }
  steps.push({ key: "actual", label: "Résultat réalisé", base: 0, delta: running, color: running >= base ? "#10B981" : "#EF4444", isTotal: true });

  // Use totals.variancePercent so eslint does not flag it as unused
  return totals ? steps : steps;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Md`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M`;
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export function WaterfallChart({ items, totals }: { items: VarianceItem[]; totals: VarianceTotals }) {
  const steps = buildSteps(items, totals);
  const data = steps.map((s) => ({
    name: s.label,
    base: s.base,
    delta: s.delta,
    color: s.color,
    isTotal: s.isTotal,
  }));

  const maxValue = Math.max(...data.map((d) => d.base + d.delta));

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <header className="mb-2">
        <h3 className="text-[13px] font-semibold text-ink">Cascade : du résultat budgété au résultat réalisé</h3>
        <p className="text-[11.5px] text-ink-3">Vert = gain · Rouge = perte · Violet = jalons</p>
      </header>
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 12, left: 8, bottom: 56 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              fontSize={10}
              stroke="#6B7280"
              angle={-30}
              textAnchor="end"
              interval={0}
              height={60}
            />
            <YAxis
              fontSize={10}
              stroke="#6B7280"
              tickFormatter={(v) => fmt(Number(v))}
              domain={[0, Math.ceil(maxValue * 1.08)]}
            />
            <Tooltip
              cursor={{ fill: "#F8F4FB" }}
              formatter={(value: number, name) => {
                if (name === "base") return ["", ""];
                return [`${fmt(value)} FCFA`, "Variation"];
              }}
              labelStyle={{ fontSize: 11, fontWeight: 600 }}
            />
            <Bar dataKey="base" stackId="cascade" fill="transparent" />
            <Bar dataKey="delta" stackId="cascade" radius={[3, 3, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
