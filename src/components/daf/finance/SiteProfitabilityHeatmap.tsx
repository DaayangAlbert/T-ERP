"use client";

import { useState } from "react";
import { ArrowDownAZ, ArrowUpAZ, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useSiteBreakdown, useSiteProfitability, type ProfitabilityRow } from "@/hooks/useDafFinance";

function fmt(amount: string): string {
  return new Intl.NumberFormat("fr-FR").format(Number(amount));
}

function classify(percent: number): "danger" | "warn" | "ok" {
  if (percent < 10) return "danger";
  if (percent < 15) return "warn";
  return "ok";
}

function bgClasses(c: ReturnType<typeof classify>) {
  if (c === "danger") return "bg-rose-50 text-rose-700";
  if (c === "warn") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function dotClasses(c: ReturnType<typeof classify>) {
  if (c === "danger") return "bg-rose-500";
  if (c === "warn") return "bg-amber-500";
  return "bg-emerald-500";
}

function rowBgClasses(c: ReturnType<typeof classify>) {
  if (c === "danger") return "bg-rose-50/50 hover:bg-rose-50";
  if (c === "warn") return "bg-amber-50/50 hover:bg-amber-50";
  return "bg-emerald-50/40 hover:bg-emerald-50";
}

function SiteDetailDrawer({ siteId, onClose }: { siteId: string; onClose: () => void }) {
  const { data, isLoading } = useSiteBreakdown(siteId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Décomposition de la marge</h3>
            {data && <p className="text-[12px] text-ink-3">{data.site.code} · {data.site.name}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        {isLoading || !data ? (
          <div className="p-4">
            <div className="h-32 animate-pulse rounded-md bg-surface-alt" />
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-line bg-surface-alt p-2">
                <div className="text-[11px] uppercase tracking-wide text-ink-3">CA YTD</div>
                <div className="mt-1 font-mono text-[13px] font-bold text-ink">{fmt(data.revenueYtd)}</div>
              </div>
              <div className="rounded-md border border-line bg-surface-alt p-2">
                <div className="text-[11px] uppercase tracking-wide text-ink-3">Coûts</div>
                <div className="mt-1 font-mono text-[13px] font-bold text-ink">{fmt(data.totalCost)}</div>
              </div>
              <div className={clsx("rounded-md p-2", bgClasses(classify(data.marginPercent)))}>
                <div className="text-[11px] uppercase tracking-wide opacity-80">Marge</div>
                <div className="mt-1 font-mono text-[13px] font-bold">{data.marginPercent.toFixed(1)} %</div>
              </div>
            </div>

            <h4 className="mt-4 mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">Formation du coût</h4>
            <div className="space-y-2">
              {data.breakdown.map((b) => (
                <div key={b.key} className="rounded-md border border-line bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-ink">{b.label}</span>
                    <span className="font-mono text-[12.5px] text-ink-3">{b.share} %</span>
                  </div>
                  <div className="mt-1 text-right font-mono text-[12.5px] text-ink">{fmt(b.amount)} FCFA</div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full bg-primary-500" style={{ width: `${b.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function SiteProfitabilityHeatmap() {
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const { data, isLoading } = useSiteProfitability("margin", order);

  if (isLoading || !data) {
    return <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <>
      {/* Desktop : tableau heatmap */}
      <div className="hidden overflow-x-auto rounded-xl border border-line bg-white md:block">
        <header className="flex items-center justify-between border-b border-line p-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Profitabilité chantiers actifs</h3>
            <p className="text-[12px] text-ink-3">
              {data.summary.totalSites} chantiers · marge pondérée {data.summary.weightedMargin.toFixed(1)} %
            </p>
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-ink-3">Tri marge :</span>
            <button
              type="button"
              onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 hover:bg-surface-alt"
            >
              {order === "asc" ? <ArrowUpAZ className="h-3.5 w-3.5" /> : <ArrowDownAZ className="h-3.5 w-3.5" />}
              {order === "asc" ? "Pires d'abord" : "Meilleures d'abord"}
            </button>
          </div>
        </header>
        <table className="w-full text-[13px]">
          <thead className="bg-surface-alt text-[11.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Chantier</th>
              <th className="px-3 py-2 text-right">CA HT YTD</th>
              <th className="px-3 py-2 text-right">Coûts engagés</th>
              <th className="px-3 py-2 text-right">Marge</th>
              <th className="px-3 py-2 text-right">Marge %</th>
              <th className="px-3 py-2 text-left">Statut</th>
              <th className="w-10 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.items.map((s: ProfitabilityRow) => {
              const c = classify(s.marginPercent);
              return (
                <tr
                  key={s.siteId}
                  onClick={() => setSelectedSite(s.siteId)}
                  className={clsx("cursor-pointer transition", rowBgClasses(c))}
                >
                  <td className="px-3 py-2 font-mono text-[12px] text-ink-3">{s.code}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{s.name}</div>
                    <div className="text-[11.5px] text-ink-3">{s.client}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(s.revenueYtd)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {fmt((Number(s.directCosts) + Number(s.indirectCosts)).toString())}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(s.grossMargin)}</td>
                  <td className={clsx("px-3 py-2 text-right font-mono font-bold", bgClasses(c))}>
                    {s.marginPercent.toFixed(1)} %
                  </td>
                  <td className="px-3 py-2 text-[12px] text-ink-3">{s.status}</td>
                  <td className="px-3 py-2 text-right">
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-ink-3" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile : cards par chantier avec pastille couleur */}
      <div className="space-y-2 md:hidden">
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink">Profitabilité chantiers</h3>
            <span className="text-[11.5px] text-ink-3">
              {data.summary.weightedMargin.toFixed(1)} % pondérée
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11.5px]">
            <span className="inline-flex items-center gap-1 text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> {data.summary.inDanger}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> {data.summary.inWarn}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {data.summary.inOk}
            </span>
          </div>
        </div>
        {data.items.map((s) => {
          const c = classify(s.marginPercent);
          return (
            <button
              key={s.siteId}
              type="button"
              onClick={() => setSelectedSite(s.siteId)}
              className="block w-full rounded-xl border border-line bg-white p-3 text-left transition hover:bg-surface-alt"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-ink-3">{s.code}</div>
                  <div className="text-[13px] font-semibold text-ink">{s.name}</div>
                  <div className="text-[11.5px] text-ink-3">{s.client}</div>
                </div>
                <span className={clsx("h-2.5 w-2.5 flex-shrink-0 rounded-full", dotClasses(c))} />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-[10px] uppercase text-ink-3">CA</div>
                  <div className="font-mono text-[11.5px] text-ink">{fmt(s.revenueYtd)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-3">Marge</div>
                  <div className="font-mono text-[11.5px] text-ink">{fmt(s.grossMargin)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-ink-3">%</div>
                  <div className={clsx("rounded font-mono text-[12px] font-bold", bgClasses(c))}>
                    {s.marginPercent.toFixed(1)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedSite && <SiteDetailDrawer siteId={selectedSite} onClose={() => setSelectedSite(null)} />}
    </>
  );
}
