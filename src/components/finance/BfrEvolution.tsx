"use client";

import Link from "next/link";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, Legend, Area, Line, CartesianGrid } from "recharts";
import { ArrowRight } from "lucide-react";
import { useBfr } from "@/hooks/useFinance";
import { formatFCFA } from "@/lib/format";
import { clsx } from "clsx";

export function BfrEvolution() {
  const { data, isLoading } = useBfr();
  if (isLoading || !data) return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;

  const latest = data.latest;
  if (!latest) return <div className="rounded-lg border border-line bg-white p-6 text-center text-[13px] text-ink-3">Aucune donnée BFR.</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="DSO clients" value={`${latest.dso} j`} benchmark={data.benchmark.dso} actual={latest.dso} higherIsBad />
        <Kpi label="DPO fournisseurs" value={`${latest.dpo} j`} benchmark={data.benchmark.dpo} actual={latest.dpo} />
        <Kpi label="Rotation stocks" value={`${latest.stockRotation} j`} benchmark={data.benchmark.stockRotation} actual={latest.stockRotation} higherIsBad />
        <Kpi label="BFR" value={formatFCFA(latest.bfr)} />
      </div>

      <div className="rounded-xl border border-line bg-white p-4 shadow-card">
        <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
          Évolution BFR & trésorerie nette (24 mois)
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <Tooltip formatter={(v: number) => formatFCFA(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="bfr" name="BFR" stroke="#A855F7" fill="#A855F7" fillOpacity={0.18} />
            <Line type="monotone" dataKey="treasury" name="Trésorerie nette" stroke="#15803D" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-primary-200 bg-primary-50/40 p-3">
        <Link href="/direction-generale/tresorerie-previsionnelle" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary-700 hover:underline">
          Trésorerie prévisionnelle 12 semaines <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function Kpi({ label, value, benchmark, actual, higherIsBad }: { label: string; value: string; benchmark?: number; actual?: number; higherIsBad?: boolean }) {
  let tone: "ok" | "warning" | "danger" = "ok";
  if (benchmark != null && actual != null) {
    if (higherIsBad) {
      if (actual > benchmark * 1.2) tone = "danger";
      else if (actual > benchmark) tone = "warning";
    } else {
      if (actual < benchmark * 0.8) tone = "warning";
    }
  }
  return (
    <div
      className={clsx(
        "rounded-lg border p-3 shadow-card",
        tone === "danger" && "border-danger/30 bg-danger/5",
        tone === "warning" && "border-warning/30 bg-warning/5",
        tone === "ok" && "border-line bg-white"
      )}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">{label}</div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink">{value}</div>
      {benchmark != null && (
        <div className="mt-0.5 text-[10.5px] text-ink-3">Norme secteur : {benchmark} j</div>
      )}
    </div>
  );
}
