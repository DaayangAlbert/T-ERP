"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, ArrowDownLeft, ArrowUpRight, Building2, Warehouse, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

interface Summary {
  summary: {
    totalStockValue: string;
    warehouseCount: number;
    sitesWithStock: number;
    totalIn: string;
    totalOut: string;
    periodDays: number;
  };
  byWarehouse: Array<{
    warehouseId: string;
    code: string;
    name: string;
    scope: string;
    ownerDirection: string | null;
    site: { id: string; code: string; name: string } | null;
    totalValue: string;
    articleCount: number;
    lowStockCount: number;
  }>;
  bySite: Array<{
    siteId: string;
    code: string;
    name: string;
    totalValue: string;
    articleCount: number;
    warehouseCount: number;
  }>;
  historyBySite: Array<{
    siteId: string;
    code: string;
    name: string;
    inValue: string;
    outValue: string;
    inCount: number;
    outCount: number;
  }>;
}

function fmtFCFA(n: string): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

const SCOPE_LABEL: Record<string, string> = {
  CHANTIER: "Chantier",
  DIRECTION: "Direction",
  CENTRAL: "Central",
};

export default function DgVueStocksPage() {
  const [tab, setTab] = useState<"by-site" | "by-warehouse" | "history">("by-site");
  const { data, isLoading } = useQuery({
    queryKey: ["dg", "stocks-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/dg/stocks-summary`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Summary>;
    },
  });

  if (isLoading || !data) return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;

  const totalLow = data.byWarehouse.reduce((s, w) => s + w.lowStockCount, 0);

  return (
    <div className="space-y-4">
      <header className="border-b border-line pb-2.5">
        <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
          <Package className="h-5 w-5 text-violet-600" /> Vue Stocks
        </h1>
        <p className="text-[12.5px] text-ink-3">
          Stock disponible par chantier et entrepôt · historique mouvements sur {data.summary.periodDays} jours
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Valeur stock totale" value={fmtFCFA(data.summary.totalStockValue)} icon={<Package className="h-4 w-4" />} tone="primary" />
        <Kpi label="Entrepôts" value={String(data.summary.warehouseCount)} icon={<Warehouse className="h-4 w-4" />} tone="default" />
        <Kpi label="Entrées (90 j)" value={fmtFCFA(data.summary.totalIn)} icon={<ArrowDownLeft className="h-4 w-4" />} tone="ok" />
        <Kpi label="Sorties (90 j)" value={fmtFCFA(data.summary.totalOut)} icon={<ArrowUpRight className="h-4 w-4" />} tone="warn" />
      </div>

      {totalLow > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" /> {totalLow} article{totalLow > 1 ? "s" : ""} sous seuil minimum
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        <TabBtn active={tab === "by-site"} onClick={() => setTab("by-site")}>Par chantier</TabBtn>
        <TabBtn active={tab === "by-warehouse"} onClick={() => setTab("by-warehouse")}>Par entrepôt</TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")}>Historique entrées / sorties</TabBtn>
      </div>

      {tab === "by-site" && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Chantier</th>
                <th className="py-2 text-right">Entrepôts</th>
                <th className="py-2 text-right">Articles distincts</th>
                <th className="py-2 pr-3 text-right">Valeur du stock</th>
              </tr>
            </thead>
            <tbody>
              {data.bySite.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-ink-3">Aucun stock affecté à un chantier.</td></tr>
              ) : (
                data.bySite.map((s) => (
                  <tr key={s.siteId} className="border-t border-line hover:bg-surface-alt">
                    <td className="py-2.5 pl-3">
                      <div className="font-bold text-ink">{s.code}</div>
                      <div className="text-[10.5px] text-ink-3">{s.name}</div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{s.warehouseCount}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{s.articleCount}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold text-ink">{fmtFCFA(s.totalValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "by-warehouse" && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Entrepôt</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Chantier / Direction</th>
                <th className="py-2 text-right">Articles</th>
                <th className="py-2 text-right">Sous seuil</th>
                <th className="py-2 pr-3 text-right">Valeur du stock</th>
              </tr>
            </thead>
            <tbody>
              {data.byWarehouse.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-ink-3">Aucun entrepôt.</td></tr>
              ) : (
                data.byWarehouse
                  .slice()
                  .sort((a, b) => Number(b.totalValue) - Number(a.totalValue))
                  .map((w) => (
                    <tr key={w.warehouseId} className="border-t border-line hover:bg-surface-alt">
                      <td className="py-2.5 pl-3">
                        <div className="font-bold text-ink">{w.code}</div>
                        <div className="text-[10.5px] text-ink-3">{w.name}</div>
                      </td>
                      <td className="py-2.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-700">
                          {SCOPE_LABEL[w.scope] ?? w.scope}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11.5px] text-ink-2">
                        {w.site ? `${w.site.code} — ${w.site.name}` : w.ownerDirection ?? "—"}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{w.articleCount}</td>
                      <td className={clsx("py-2.5 text-right font-mono tabular-nums", w.lowStockCount > 0 && "font-bold text-amber-700")}>{w.lowStockCount}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums font-semibold text-ink">{fmtFCFA(w.totalValue)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Chantier</th>
                <th className="py-2 text-right">Entrées (nb)</th>
                <th className="py-2 text-right">Valeur entrées</th>
                <th className="py-2 text-right">Sorties (nb)</th>
                <th className="py-2 text-right">Valeur sorties</th>
                <th className="py-2 pr-3 text-right">Solde net</th>
              </tr>
            </thead>
            <tbody>
              {data.historyBySite.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-ink-3">Aucun mouvement sur la période.</td></tr>
              ) : (
                data.historyBySite.map((s) => {
                  const net = Number(s.inValue) - Number(s.outValue);
                  return (
                    <tr key={s.siteId} className="border-t border-line hover:bg-surface-alt">
                      <td className="py-2.5 pl-3">
                        <div className="font-bold text-ink">{s.code}</div>
                        <div className="text-[10.5px] text-ink-3">{s.name}</div>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{s.inCount}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-emerald-700">{fmtFCFA(s.inValue)}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{s.outCount}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-rose-700">{fmtFCFA(s.outValue)}</td>
                      <td className={clsx("py-2.5 pr-3 text-right font-mono tabular-nums font-semibold", net >= 0 ? "text-emerald-700" : "text-rose-700")}>
                        {net >= 0 ? "+" : ""}{fmtFCFA(String(net))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "default" | "ok" | "warn" }) {
  const cls = {
    primary: "border-l-violet-500 text-violet-700",
    default: "border-l-slate-400 text-slate-700",
    ok: "border-l-emerald-500 text-emerald-700",
    warn: "border-l-amber-500 text-amber-700",
  }[tone];
  return (
    <div className={clsx("rounded-xl border border-line border-l-4 bg-white p-3 shadow-card", cls)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink-3">{icon}{label}</div>
      <div className="mt-1 text-[16px] font-bold text-ink">{value}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "border-b-2 px-3 py-2 text-[12.5px] font-semibold transition",
        active ? "border-violet-600 text-violet-700" : "border-transparent text-ink-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
