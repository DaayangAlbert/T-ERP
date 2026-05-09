"use client";

import { Sliders } from "lucide-react";
import { useDafDashboard } from "@/hooks/useDafDashboard";
import { useAuth } from "@/hooks/useAuth";
import { DafConsolidatedBanner } from "@/components/daf/dashboard/DafConsolidatedBanner";
import { DafKpiRow } from "@/components/daf/dashboard/DafKpiRow";
import { DafPrioritiesList } from "@/components/daf/dashboard/DafPrioritiesList";
import { TreasuryAreaChart } from "@/components/daf/dashboard/TreasuryAreaChart";
import { OutflowsDonutChart } from "@/components/daf/dashboard/OutflowsDonutChart";

export default function DafDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDafDashboard();
  const isReadOnly = user?.role !== "DAF";

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord DAF.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4 sm:mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Tableau de bord DAF
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {isReadOnly
              ? "Vue lecture seule (DG / admin) — actions DAF désactivées."
              : "Position consolidée et priorités du jour."}
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Personnalisation des widgets — V2"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-3 disabled:cursor-not-allowed"
        >
          <Sliders className="h-3.5 w-3.5" /> Personnaliser
        </button>
      </header>

      <div className="space-y-4">
        <DafConsolidatedBanner position={data.consolidatedPosition} />

        <DafKpiRow primary={data.primaryKpis} secondary={data.secondaryKpis} />

        <DafPrioritiesList items={data.priorities} />

        <div className="grid gap-3 lg:grid-cols-2">
          <TreasuryAreaChart data={data.treasuryEvolution30d} />
          <OutflowsDonutChart data={data.outflowsBreakdown7d} />
        </div>
      </div>
    </>
  );
}
