"use client";

import Link from "next/link";
import { Truck, ClipboardList, ChevronRight, AlertTriangle, Store, Wrench } from "lucide-react";
import { clsx } from "clsx";
import { useLogDashboard } from "@/hooks/useLogDashboard";
import { PageHelp } from "@/components/help/PageHelp";
import { LogDashboardTutorial } from "@/components/help/tutorials/LogDashboardTutorial";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  if (n >= 1_000_000) return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))}`;
  return n.toLocaleString("fr-FR");
}

const SEVERITY_CLASSES: Record<string, string> = {
  high: "border-l-rose-500 bg-rose-50/60",
  medium: "border-l-amber-500 bg-amber-50/60",
  low: "border-l-blue-500 bg-blue-50/60",
};

const SEVERITY_TEXT: Record<string, string> = {
  high: "text-rose-700",
  medium: "text-amber-700",
  low: "text-blue-700",
};

export default function LogDashboardPage() {
  const { data, isLoading, isError } = useLogDashboard();

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord Logistique.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bandeau gradient violet */}
      <div className="rounded-2xl bg-gradient-to-br from-[#3C1361] via-[#5B2A86] to-[#7E3FB7] p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/80">
              <Truck className="h-3.5 w-3.5" /> Siège · vue consolidée {data.banner.sitesCount} chantiers
            </div>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight sm:text-[26px]">
              Bonjour Robert
            </h1>
            <p className="mt-0.5 text-[12.5px] text-white/85">
              {data.greeting.poTracked} BC suivis · {data.greeting.suppliersCount} fournisseurs ·{" "}
              {data.greeting.equipmentCount} engins · {data.greeting.poToValidate} BC à valider
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11.5px] font-semibold backdrop-blur-sm">
              Stocks · {fmt(data.banner.consolidatedStockValue)} FCFA
            </span>
            <PageHelp title="Aide — Logistique"><LogDashboardTutorial /></PageHelp>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          {
            label: "BC en cours",
            value: data.kpis.poInProgress.toString(),
            sub: `${data.kpis.poToValidate} à valider`,
            tone: "violet",
            Icon: ClipboardList,
          },
          {
            label: "À valider",
            value: data.kpis.poToValidate.toString(),
            sub: `dont ${data.kpis.poN2Daf} N2 DAF`,
            tone: data.kpis.poToValidate > 5 ? "amber" : "slate",
            Icon: AlertTriangle,
          },
          {
            label: "Engins en service",
            value: `${data.kpis.fleetActive}/${data.kpis.fleetTotal}`,
            sub: `${data.kpis.fleetAvailability} % dispo`,
            tone: data.kpis.fleetAvailability >= 90 ? "emerald" : "amber",
            Icon: Truck,
          },
          {
            label: "Économies achats YTD",
            value: `${fmt(data.kpis.savingsYtd)}`,
            sub: "vs budget",
            tone: "emerald",
            Icon: Store,
          },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
            <div
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-lg border",
                c.tone === "violet" && "bg-violet-50 border-violet-200 text-violet-700",
                c.tone === "amber" && "bg-amber-50 border-amber-200 text-amber-700",
                c.tone === "slate" && "bg-slate-50 border-slate-200 text-slate-700",
                c.tone === "emerald" && "bg-emerald-50 border-emerald-200 text-emerald-700"
              )}
            >
              <c.Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-bold leading-none text-ink">{c.value}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-2">{c.label}</div>
              <div className="text-[10.5px] text-ink-3">{c.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {data.alerts.length > 0 && (
        <section>
          <header className="mb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-2">
              Alertes logistique
            </h2>
            <span className="text-[11px] text-ink-3">{data.alerts.length} alerte(s)</span>
          </header>
          <div className="flex flex-col gap-1.5">
            {data.alerts.map((a) => (
              <div
                key={a.id}
                className={clsx(
                  "flex flex-col gap-2 rounded-lg border border-line border-l-[4px] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
                  SEVERITY_CLASSES[a.severity]
                )}
              >
                <AlertTriangle className={clsx("h-4 w-4 flex-shrink-0", SEVERITY_TEXT[a.severity])} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-ink">{a.title}</div>
                  {a.details && <div className="text-[11.5px] text-ink-3">{a.details}</div>}
                </div>
                {a.link && (
                  <Link
                    href={a.link}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-line-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:border-primary-300 sm:w-auto"
                  >
                    Drill-down <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Donut achats par catégorie + top fournisseurs */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
          <h3 className="text-[13px] font-semibold text-ink">
            Achats YTD par catégorie — {fmt(data.purchasesByCategory.total)} FCFA
          </h3>
          <ul className="mt-3 space-y-2 text-[12px]">
            {data.purchasesByCategory.items.map((c) => {
              const pct = data.purchasesByCategory.total > 0 ? (c.value / data.purchasesByCategory.total) * 100 : 0;
              return (
                <li key={c.category}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{c.category}</span>
                    <span className="text-ink-3">{pct.toFixed(0)} % · {fmt(c.value)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: c.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
          <h3 className="text-[13px] font-semibold text-ink">Top 5 fournisseurs YTD</h3>
          <ul className="mt-3 space-y-2 text-[12px]">
            {data.topSuppliers.map((s, i) => {
              const max = data.topSuppliers[0]?.volume ?? 1;
              const pct = (s.volume / max) * 100;
              return (
                <li key={s.name}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{s.name}</span>
                    <span className="font-mono text-ink-3">{fmt(s.volume)}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Stocks par chantier */}
      <section className="rounded-xl border border-line bg-white">
        <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-[13px] font-semibold text-ink">Stocks par chantier (top 6)</h2>
          <Link href="/logistique/bc" className="text-[11.5px] font-semibold text-primary-700">
            Voir BC →
          </Link>
        </header>
        <div className="hidden md:block">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase text-ink-3">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Chantier</th>
                <th className="px-3 py-2 text-right font-medium">Valeur stock</th>
                <th className="px-3 py-2 text-right font-medium">Ruptures</th>
                <th className="px-3 py-2 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.stocksTopSites.map((s) => (
                <tr key={s.code} className="border-t border-line hover:bg-surface-alt/60">
                  <td className="px-3 py-2 font-mono text-[11.5px]">{s.code}</td>
                  <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(s.stockValue)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={clsx(s.rupturesCount >= 3 ? "text-rose-700 font-semibold" : "text-ink-2")}>
                      {s.rupturesCount}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-2">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 p-3 md:hidden">
          {data.stocksTopSites.map((s) => (
            <div key={s.code} className="rounded-lg border border-line p-3">
              <div className="font-mono text-[11px] text-ink-3">{s.code}</div>
              <div className="text-[13px] font-semibold text-ink">{s.name}</div>
              <div className="mt-1.5 flex justify-between text-[11.5px]">
                <span className="text-ink-3">Valeur stock</span>
                <span className="font-mono">{fmt(s.stockValue)} FCFA</span>
              </div>
              <div className="flex justify-between text-[11.5px]">
                <span className="text-ink-3">Ruptures</span>
                <span className={clsx(s.rupturesCount >= 3 ? "text-rose-700 font-semibold" : "")}>
                  {s.rupturesCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
