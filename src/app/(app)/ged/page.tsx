"use client";

import { useGedDashboard } from "@/hooks/useGedDashboard";
import { useAuth } from "@/hooks/useAuth";
import { GedHeaderBanner } from "@/components/ged/dashboard/GedHeaderBanner";
import { GedGreeting } from "@/components/ged/dashboard/GedGreeting";
import { GedKpiRow } from "@/components/ged/dashboard/GedKpiRow";
import { DocumentaryAlertsList } from "@/components/ged/dashboard/DocumentaryAlertsList";
import { SpacesOverviewGrid } from "@/components/ged/dashboard/SpacesOverviewGrid";
import { RecentActivityTable } from "@/components/ged/dashboard/RecentActivityTable";

export default function GedDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useGedDashboard();
  const isReadOnly = user?.role !== "ARCHIVIST";

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord GED.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-alt" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = user?.firstName ?? "Christelle";

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Tableau de bord GED
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {isReadOnly
              ? "Vue lecture seule (DG / admin) — actions documentaires désactivées."
              : `Référent documentaire — ${user?.firstName ?? ""} ${user?.lastName ?? ""}. Structure les espaces documentaires transverses.`}
          </p>
        </div>
      </header>

      <GedHeaderBanner banner={data.banner} />
      <GedGreeting firstName={firstName} greeting={data.greeting} />
      <GedKpiRow kpis={data.kpis} />
      <DocumentaryAlertsList alerts={data.alerts} />
      <SpacesOverviewGrid spaces={data.spaces} />
      <RecentActivityTable activity={data.recentActivity} />
    </div>
  );
}
