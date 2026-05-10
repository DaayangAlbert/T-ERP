"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useHrFinancialOverview } from "@/hooks/useDafHr";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n));
}

export function HrFinancialOverview() {
  const { data, isLoading } = useHrFinancialOverview();

  if (isLoading || !data) {
    return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      {/* KPIs ratio masse salariale */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-3">Masse salariale chargée</div>
          <div className="font-mono text-[18px] font-bold text-ink">{fmt(data.currentMonth.payrollMass)}</div>
          <div className="text-[10.5px] text-ink-3">FCFA / mois</div>
        </div>
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="text-[11px] uppercase tracking-wide text-ink-3">CA mensuel synthétique</div>
          <div className="font-mono text-[18px] font-bold text-ink">{fmt(data.currentMonth.monthlyRevenue)}</div>
          <div className="text-[10.5px] text-ink-3">FCFA / mois</div>
        </div>
        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3">
          <div className="text-[11px] uppercase tracking-wide text-primary-700">Ratio MS / CA</div>
          <div className="font-mono text-[18px] font-bold text-primary-900">{data.currentMonth.ratioPercent.toFixed(1)} %</div>
          <div className="text-[10.5px] text-primary-700">Cible secteur ~ 35 %</div>
        </div>
      </div>

      {/* Tendance 12 mois */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Évolution masse salariale (12 mois)</h3>
        <div className="mt-2 h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={data.trend} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="msGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
              <XAxis dataKey="period" fontSize={10} stroke="#6B7280" />
              <YAxis fontSize={10} stroke="#6B7280" tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)} M`} />
              <Tooltip formatter={(v: number) => [`${fmt(v)} FCFA`, "Masse"]} />
              <Area type="monotone" dataKey="massCharged" stroke="#A855F7" strokeWidth={2} fill="url(#msGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Coût total chargé par catégorie */}
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Coût chargé par catégorie professionnelle</h3>
          <div className="mt-2 space-y-2">
            {data.byCategory.map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="font-medium text-ink">{c.category}</span>
                  <span className="font-mono text-ink-3">
                    {c.headcount} pers. · {fmt(c.chargedCost)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-primary-500" style={{ width: `${c.share * 100}%` }} />
                </div>
                <div className="mt-0.5 text-right font-mono text-[10.5px] text-ink-3">
                  {fmt(c.avgPerEmployee)} FCFA / employé
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coût horaire */}
        <div className="rounded-xl border border-line bg-white p-3">
          <h3 className="text-[13px] font-semibold text-ink">Coût horaire chargé (utile devis)</h3>
          <p className="text-[11.5px] text-ink-3">Base 167 h / mois.</p>
          <div className="mt-2 space-y-1">
            {data.hourlyCost.map((h) => (
              <div key={h.category} className="flex items-center justify-between rounded-md border border-line bg-surface-alt px-3 py-2">
                <span className="text-[12.5px] font-medium text-ink">{h.category}</span>
                <span className="font-mono text-[13px] font-bold text-primary-700">{fmt(h.hourly)} FCFA / h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Engagements long terme */}
      <div className="rounded-xl border border-line bg-white p-3">
        <h3 className="text-[13px] font-semibold text-ink">Engagements sociaux long terme</h3>
        <p className="text-[11.5px] text-ink-3">Hors bilan — provisionnés à la prochaine clôture.</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-line bg-surface-alt p-2.5">
            <div className="text-[10.5px] uppercase text-ink-3">Caisse retraite</div>
            <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.longTermCommitments.pensionFund)}</div>
          </div>
          <div className="rounded-md border border-line bg-surface-alt p-2.5">
            <div className="text-[10.5px] uppercase text-ink-3">Mutuelle</div>
            <div className="font-mono text-[13px] font-bold text-ink">{fmt(data.longTermCommitments.mutualFund)}</div>
          </div>
          <div className="rounded-md border border-primary-200 bg-primary-50 p-2.5">
            <div className="text-[10.5px] uppercase text-primary-700">Total</div>
            <div className="font-mono text-[13px] font-bold text-primary-900">{fmt(data.longTermCommitments.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
