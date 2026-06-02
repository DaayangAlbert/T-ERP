"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Building, Package, PlayCircle } from "lucide-react";
import { PageHelp } from "@/components/help/PageHelp";
import { ActifsTutorial } from "@/components/help/tutorials/ActifsTutorial";

interface Asset {
  id: string;
  code: string;
  description: string;
  category: string;
  acquisitionDate: string;
  grossValue: number;
  accumulatedDepreciation: number;
  netValue: number;
  usefulLifeMonths: number;
  siteId: string | null;
  condition: string;
}

interface StockItem {
  code: string;
  label: string;
  qty: number;
  value: number;
  pmp: number;
}

export default function ActifsPage() {
  const [tab, setTab] = useState<"stocks" | "assets">("stocks");
  const qc = useQueryClient();

  const stocks = useQuery({
    queryKey: ["comptable", "stock-valuation"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/stock-valuation", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ items: StockItem[]; totalValue: number }>;
    },
  });

  const assets = useQuery({
    queryKey: ["comptable", "fixed-assets"],
    queryFn: async () => {
      const res = await fetch("/api/comptable/fixed-assets", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: Asset[];
        totals: { gross: number; depreciation: number; net: number };
        scope: { isDirection: boolean };
      }>;
    },
  });

  const runDepreciation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/comptable/fixed-assets/depreciation-run", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comptable", "fixed-assets"] }),
  });

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-actifs">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Actifs comptables</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Stocks valorisés (PMP) + immobilisations + amortissements automatiques.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Actifs comptables"><ActifsTutorial /></PageHelp>
          {assets.data?.scope.isDirection && (
            <button
              type="button"
              onClick={() => runDepreciation.mutate()}
              disabled={runDepreciation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              {runDepreciation.isPending ? "Calcul…" : "Calcul amortissement mensuel"}
            </button>
          )}
        </div>
      </header>

      {runDepreciation.data && (
        <div className="rounded-md border border-success/30 bg-success/5 p-3 text-[12.5px] text-success">
          ✓ {runDepreciation.data.count} immobilisations amorties · {runDepreciation.data.totalDot.toLocaleString("fr-FR")} FCFA · réf {runDepreciation.data.reference}
        </div>
      )}

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi label="Valeur stock" value={stocks.data ? `${new Intl.NumberFormat("fr-FR").format(Math.round(stocks.data.totalValue))}` : "—"} icon={Package} />
        <Kpi label="Immo brutes" value={assets.data ? `${new Intl.NumberFormat("fr-FR").format(Math.round(assets.data.totals.gross))}` : "—"} icon={Building} />
        <Kpi label="Amort. cumulés" value={assets.data ? `-${new Intl.NumberFormat("fr-FR").format(Math.round(assets.data.totals.depreciation))}` : "—"} accent="warning" />
        <Kpi label="VNC" value={assets.data ? `${new Intl.NumberFormat("fr-FR").format(Math.round(assets.data.totals.net))}` : "—"} accent="success" />
      </section>

      <div className="flex flex-wrap gap-1 border-b border-line">
        <TabBtn active={tab === "stocks"} onClick={() => setTab("stocks")} label="Stocks valorisés" />
        <TabBtn active={tab === "assets"} onClick={() => setTab("assets")} label="Immobilisations" />
      </div>

      {tab === "stocks" && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Libellé</th>
                  <th className="px-3 py-2 text-right">Qté</th>
                  <th className="px-3 py-2 text-right">PMP</th>
                  <th className="px-3 py-2 text-right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {stocks.data?.items.map((s) => (
                  <tr key={s.code} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{s.code}</td>
                    <td className="px-3 py-2 text-ink-2">{s.label}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.qty.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.pmp.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{s.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
                {!stocks.isLoading && stocks.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-ink-3">Aucun mouvement de stock.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "assets" && (
        <section className="rounded-xl border border-line bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Désignation</th>
                  <th className="px-3 py-2">Cat.</th>
                  <th className="px-3 py-2">Acquis</th>
                  <th className="px-3 py-2 text-right">Valeur brute</th>
                  <th className="px-3 py-2 text-right">VNC</th>
                  <th className="px-3 py-2">Durée</th>
                </tr>
              </thead>
              <tbody>
                {assets.data?.items.map((a) => (
                  <tr key={a.id} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{a.code}</td>
                    <td className="px-3 py-2 text-ink-2">{a.description}</td>
                    <td className="px-3 py-2 text-ink-3">{a.category}</td>
                    <td className="px-3 py-2 text-ink-3">
                      {new Date(a.acquisitionDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {a.grossValue.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {a.netValue.toLocaleString("fr-FR")}
                    </td>
                    <td className="px-3 py-2 text-ink-3">{(a.usefulLifeMonths / 12).toFixed(1)} ans</td>
                  </tr>
                ))}
                {!assets.isLoading && assets.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-ink-3">
                      Aucune immobilisation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon?: typeof Package; accent?: "warning" | "success" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-primary-600" />}
      </div>
      <div
        className={clsx(
          "mt-1 text-2xl font-bold",
          accent === "warning" && "text-warning",
          accent === "success" && "text-success",
          !accent && "text-ink"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
        active ? "text-primary-700" : "text-ink-3 hover:text-ink"
      )}
    >
      {label}
      {active && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
    </button>
  );
}
