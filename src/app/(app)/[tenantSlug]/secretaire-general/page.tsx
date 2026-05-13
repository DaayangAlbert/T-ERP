"use client";

import { useSgDashboard } from "@/hooks/useSgDashboard";
import { SgHeaderBanner } from "@/components/sg/dashboard/SgHeaderBanner";
import { SgGreeting } from "@/components/sg/dashboard/SgGreeting";
import { SgKpiRow } from "@/components/sg/dashboard/SgKpiRow";
import { PriorityAlertsList } from "@/components/sg/dashboard/PriorityAlertsList";
import { CapitalStructureCard } from "@/components/sg/dashboard/CapitalStructureCard";
import { OfficialCalendarCard } from "@/components/sg/dashboard/OfficialCalendarCard";

export default function SgDashboardPage() {
  const { data, isLoading, isError } = useSgDashboard();

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord SG.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Tableau de bord SG</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Bras droit administratif et juridique de la Direction — gouvernance, marchés clients, contentieux, conformité OHADA.
          </p>
        </div>
      </header>

      <SgHeaderBanner
        registersUpToDate={data.kpis.compliance.upToDate}
        toUpdateCount={data.kpis.compliance.toUpdateCount}
        tenantName={data.greeting.tenantName}
      />
      <SgGreeting greeting={data.greeting} />
      <SgKpiRow kpis={data.kpis} />
      <PriorityAlertsList alerts={data.alerts} />
      <CapitalStructureCard
        capital={data.capitalStructure}
        board={data.boardComposition}
        tenantName={data.greeting.tenantName}
      />
      <OfficialCalendarCard calendar={data.officialCalendar} />
    </div>
  );
}
