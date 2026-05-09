"use client";

import { useState } from "react";
import { Calendar, Download, Plus, Sliders } from "lucide-react";
import { useDashboardDg } from "@/hooks/useDashboardDg";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { ValidationsList } from "@/components/dashboard/ValidationsList";
import { TopSitesTable } from "@/components/dashboard/TopSitesTable";
import { SecondaryKpiRow } from "@/components/dg/SecondaryKpiRow";
import { DailyKeyStats } from "@/components/dg/DailyKeyStats";
import { WeeklyTrendChart } from "@/components/dg/WeeklyTrendChart";
import { DashboardCustomizer } from "@/components/dg/DashboardCustomizer";
import { formatFCFA, formatNumber, formatDate } from "@/lib/format";

export default function DgDashboard() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useDashboardDg();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const today = formatDate(new Date(), "MMMM yyyy");

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord : {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  if (isLoading || !data) {
    return <DashboardSkeleton period={today} tenantName={tenant?.name} />;
  }

  const {
    kpis,
    kpisSecondaires,
    chiffresCles,
    tendanceHebdo,
    revenueChart,
    siteTypeBreakdown,
    alerts,
    pendingValidations,
    topSites,
    meta,
  } = data;

  const revenueFmt = formatFCFA(kpis.revenue.value, { splitUnit: true });
  const treasuryFmt = formatFCFA(kpis.treasury.value, { splitUnit: true });
  const totalCa = siteTypeBreakdown.reduce((s, t) => s + t.value, 0);
  const totalCaFmt = formatFCFA(totalCa, { splitUnit: true });

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Vue consolidée — Direction Générale
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {tenant ? `${tenant.name} · ` : ""}
            Période : <span className="capitalize">{today}</span> ·{" "}
            {meta.activeSitesTotal} chantier{meta.activeSitesTotal > 1 ? "s" : ""} actif
            {meta.activeSitesTotal > 1 ? "s" : ""} ·{" "}
            {kpis.headcount.value} employés
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionStub icon={<Calendar className="h-3.5 w-3.5" />}>{today}</ActionStub>
          <button
            type="button"
            onClick={() => setCustomizerOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 text-[12px] font-medium text-primary-700 hover:border-primary-400 hover:bg-primary-100"
          >
            <Sliders className="h-3.5 w-3.5" />
            Personnaliser
          </button>
          <ActionStub icon={<Download className="h-3.5 w-3.5" />}>Exporter</ActionStub>
          <ActionStub icon={<Plus className="h-3.5 w-3.5" />} primary>
            Nouveau chantier
          </ActionStub>
        </div>
      </header>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires (YTD)"
          value={revenueFmt.value}
          unit={revenueFmt.unit}
          kpi={kpis.revenue}
          href="/finances"
          sparkColor="#15803D"
        />
        <KpiCard
          label="Marge globale"
          value={kpis.margin.value.toFixed(1).replace(".", ",")}
          unit="%"
          kpi={kpis.margin}
          href="/finances"
          sparkColor="#B91C1C"
        />
        <KpiCard
          label="Trésorerie nette"
          value={treasuryFmt.value}
          unit={treasuryFmt.unit}
          kpi={kpis.treasury}
          href="/comptabilite"
          sparkColor="#A855F7"
        />
        <KpiCard
          label="Effectif total"
          value={formatNumber(kpis.headcount.value)}
          kpi={kpis.headcount}
          href="/rh"
          sparkColor="#6B7280"
        />
      </div>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <RevenueChart data={revenueChart} />
        <DonutChart slices={siteTypeBreakdown} totalLabel={totalCaFmt.value} totalUnit={`${totalCaFmt.unit} · YTD`} />
      </div>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <AlertsList alerts={alerts} />
        <ValidationsList validations={pendingValidations} />
      </div>

      {/* === Phase 2 / fn 1.1 — sections enrichies, juste avant Top chantiers === */}
      <div className="mt-4">
        <SecondaryKpiRow kpis={kpisSecondaires} />
      </div>

      <div className="mt-4">
        <DailyKeyStats stats={chiffresCles} />
      </div>

      <div className="mt-4">
        <WeeklyTrendChart data={tendanceHebdo} />
      </div>

      <div className="mt-4">
        <TopSitesTable sites={topSites} />
      </div>

      <p className="mt-4 text-right text-[11px] text-ink-4">
        Bonjour {user?.firstName} · données mises à jour le {formatDate(meta.generatedAt, "dd/MM/yyyy 'à' HH:mm")}
      </p>

      <DashboardCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </>
  );
}

function ActionStub({
  icon,
  children,
  primary,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        primary
          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          : "inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300"
      }
    >
      {icon}
      {children}
    </button>
  );
}

function DashboardSkeleton({ period, tenantName }: { period: string; tenantName?: string }) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Vue consolidée — Direction Générale
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {tenantName ? `${tenantName} · ` : ""}Période : <span className="capitalize">{period}</span>
          </p>
        </div>
      </header>
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[112px] rounded-xl border border-line bg-white p-4 shadow-card">
            <div className="h-3 w-1/2 animate-pulse rounded bg-surface-alt" />
            <div className="mt-3 flex items-end justify-between">
              <div className="h-7 w-20 animate-pulse rounded bg-surface-alt" />
              <div className="h-5 w-14 animate-pulse rounded bg-surface-alt" />
            </div>
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface-alt" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <div className="h-[300px] animate-pulse rounded-xl border border-line bg-white p-4" />
        <div className="h-[300px] animate-pulse rounded-xl border border-line bg-white p-4" />
      </div>
      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <div className="h-[200px] animate-pulse rounded-xl border border-line bg-white p-4" />
        <div className="h-[200px] animate-pulse rounded-xl border border-line bg-white p-4" />
      </div>
    </>
  );
}
