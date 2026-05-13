"use client";

import { useState } from "react";
import { Activity, BarChart3, FlaskConical, LayoutDashboard, Landmark } from "lucide-react";
import { clsx } from "clsx";
import { useDafVariances } from "@/hooks/useDafFinance";
import { VariancesTable } from "@/components/daf/finance/VariancesTable";
import { WaterfallChart } from "@/components/daf/finance/WaterfallChart";
import { SiteProfitabilityHeatmap } from "@/components/daf/finance/SiteProfitabilityHeatmap";
import { ScenarioSimulator } from "@/components/daf/finance/ScenarioSimulator";
import { BankingReportGenerator } from "@/components/daf/finance/BankingReportGenerator";
import { PnLTable } from "@/components/finance/PnLTable";
import { BfrEvolution } from "@/components/finance/BfrEvolution";

type Tab = "overview" | "variances" | "profitability" | "scenarios" | "banking";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { key: "variances", label: "Analyse des écarts", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "profitability", label: "Profitabilité chantiers", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "scenarios", label: "Simulations", icon: <FlaskConical className="h-3.5 w-3.5" /> },
  { key: "banking", label: "Reporting bancaire", icon: <Landmark className="h-3.5 w-3.5" /> },
];

function defaultPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DafFinancesPage() {
  const [tab, setTab] = useState<Tab>("variances");
  const [period, setPeriod] = useState(defaultPeriod());
  const { data: variances, isLoading } = useDafVariances(period);

  return (
    <>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Finances — analyse profonde DAF
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Écarts budgétaires, profitabilité chantiers, simulations et reporting bancaire.
          </p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-md border border-line bg-white px-2.5 text-[12.5px]"
        />
      </header>

      <div className="mb-4 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <PnLTable period={period} />
          <BfrEvolution />
        </div>
      )}

      {tab === "variances" && (
        <div className="space-y-4">
          {isLoading || !variances ? (
            <>
              <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
              <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
            </>
          ) : (
            <>
              <VariancesTable items={variances.items} totals={variances.totals} />
              <WaterfallChart items={variances.items} totals={variances.totals} />
            </>
          )}
        </div>
      )}

      {tab === "profitability" && <SiteProfitabilityHeatmap />}

      {tab === "scenarios" && <ScenarioSimulator />}

      {tab === "banking" && <BankingReportGenerator />}
    </>
  );
}
