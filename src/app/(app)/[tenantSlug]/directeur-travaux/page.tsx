"use client";

import { useChantier } from "@/contexts/ChantierContext";
import { useDtravDashboard } from "@/hooks/useDtravDashboard";
import { SiteStateBanner } from "@/components/dtrav/dashboard/SiteStateBanner";
import { DtravKpiRow } from "@/components/dtrav/dashboard/DtravKpiRow";
import { SiteAlertsList } from "@/components/dtrav/dashboard/SiteAlertsList";
import { TodayActivityTimeline } from "@/components/dtrav/dashboard/TodayActivityTimeline";
import { PageHelp } from "@/components/help/PageHelp";
import { DtravDashboardTutorial } from "@/components/help/tutorials/DtravDashboardTutorial";

export default function DtravDashboardPage() {
  const { activeChantierId, activeChantier, availableChantiers, isLoading: chantierLoading } = useChantier();
  const { data, isLoading, error } = useDtravDashboard(activeChantierId);

  if (chantierLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
    );
  }

  if (availableChantiers.length === 0) {
    return (
      <div className="rounded-md border border-warning/30 bg-warning/5 p-4 text-[13px] text-warning">
        Aucun chantier ne vous est assigné. Contactez votre Directeur Technique.
      </div>
    );
  }

  return (
    <div id="screen-dtrav-dashboard" className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Tableau de bord chantier
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {activeChantier?.client} · point d&apos;entrée terrain
          </p>
        </div>
        <PageHelp title="Aide — Tableau de bord DTrav"><DtravDashboardTutorial /></PageHelp>
      </header>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger">
          {String((error as Error).message)}
        </div>
      )}

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <>
          <SiteStateBanner
            physicalProgress={data.site.physicalProgress}
            financialProgress={data.site.financialProgress}
            margin={data.site.margin}
            plannedEndDate={data.site.plannedEndDate}
          />
          <DtravKpiRow kpis={data.kpis} />
          <SiteAlertsList items={data.alerts} />
          <TodayActivityTimeline items={data.todayActivity} />
        </>
      )}
    </div>
  );
}
