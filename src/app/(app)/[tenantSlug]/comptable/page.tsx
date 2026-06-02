"use client";

import { useCptDashboard } from "@/hooks/useCptDashboard";
import { PageHelp } from "@/components/help/PageHelp";
import { DashboardTutorial } from "@/components/help/tutorials/DashboardTutorial";
import { CptScopeBanner } from "@/components/comptable/dashboard/CptScopeBanner";
import { CptKpiRow } from "@/components/comptable/dashboard/CptKpiRow";
import { CptPrioritiesList } from "@/components/comptable/dashboard/CptPrioritiesList";
import { CptActivityTimeline } from "@/components/comptable/dashboard/CptActivityTimeline";
import { EntriesEvolutionChart } from "@/components/comptable/dashboard/EntriesEvolutionChart";
import { JournalsDistributionDonut } from "@/components/comptable/dashboard/JournalsDistributionDonut";
import { AssignedTracksWidget } from "@/components/daf/payment-circuits/AssignedTracksWidget";
import { useTenant } from "@/hooks/useTenant";

export default function ComptablePage() {
  const { data, isLoading, error } = useCptDashboard();
  const { tenant } = useTenant();

  return (
    <div data-rh-screen className="space-y-3" id="screen-cpt-dashboard">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Tableau de bord comptable
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data?.scope.isDirection
              ? `Vue globale ${tenant?.name ?? ""} — consolidation comptable de tous les chantiers.`
              : data?.scope.label
                ? data.scope.label.replace("Périmètre limité · ", "")
                : "Chargement…"}
          </p>
        </div>
        <PageHelp title="Aide — Tableau de bord comptable"><DashboardTutorial /></PageHelp>
      </header>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">
          {String((error as Error).message)}
        </div>
      )}

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="h-12 animate-pulse rounded-xl bg-surface-alt" />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <>
          <CptScopeBanner
            isDirection={data.scope.isDirection}
            label={data.scope.label}
            sites={data.scope.sites}
            cumulatedBudget={data.scope.cumulatedBudget}
          />
          <CptKpiRow kpis={data.kpis} />
          <AssignedTracksWidget limit={3} />
          <CptPrioritiesList items={data.priorities} />
          <div className="grid gap-3 lg:grid-cols-2">
            <EntriesEvolutionChart data={data.entriesEvolution} />
            <JournalsDistributionDonut data={data.journalDistribution} />
          </div>
          <CptActivityTimeline items={data.recentEntries} />
        </>
      )}
    </div>
  );
}
