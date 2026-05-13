"use client";

import { useDtDashboard } from "@/hooks/useDtDashboard";
import { useAuth } from "@/hooks/useAuth";
import { DtProductionBanner } from "@/components/dt/dashboard/DtProductionBanner";
import { DtKpiRow } from "@/components/dt/dashboard/DtKpiRow";
import { DtAlertsList } from "@/components/dt/dashboard/DtAlertsList";
import { ProgressVsFinancialChart } from "@/components/dt/dashboard/ProgressVsFinancialChart";
import { DirectorOfWorksDonut } from "@/components/dt/dashboard/DirectorOfWorksDonut";
import { SitesToWatchTable } from "@/components/dt/dashboard/SitesToWatchTable";

export default function DtDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, isError } = useDtDashboard();
  const isReadOnly = user?.role !== "TECH_DIRECTOR";

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        Impossible de charger le tableau de bord Direction Technique.
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Tableau de bord Direction Technique
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {isReadOnly
              ? "Vue lecture seule (DG / admin) — actions DT désactivées."
              : `Cockpit production — ${user?.firstName ?? ""} ${user?.lastName ?? ""}. Supervision portefeuille chantiers et équipes travaux.`}
          </p>
        </div>
      </header>

      <DtProductionBanner banner={data.banner} />
      <DtKpiRow kpis={data.kpis} />
      <DtAlertsList alerts={data.alerts} />
      <div className="grid gap-3 lg:grid-cols-2">
        <ProgressVsFinancialChart data={data.progressVsFinancial} />
        <DirectorOfWorksDonut data={data.progressByDirectorOfWorks} />
      </div>
      <SitesToWatchTable sites={data.sitesToWatch} />
    </div>
  );
}
