"use client";

import { useEmpDashboard } from "@/hooks/useEmpDashboard";
import { EmpHeaderBanner } from "@/components/emp/dashboard/EmpHeaderBanner";
import { EmpGreeting } from "@/components/emp/dashboard/EmpGreeting";
import { LatestPayslipCallToAction } from "@/components/emp/dashboard/LatestPayslipCallToAction";
import { EmpKpiRow } from "@/components/emp/dashboard/EmpKpiRow";
import { QuickActionsGrid } from "@/components/emp/dashboard/QuickActionsGrid";
import { MyConstructionSiteCard } from "@/components/emp/dashboard/MyConstructionSiteCard";
import { MyTeamList } from "@/components/emp/dashboard/MyTeamList";

/**
 * Tableau de bord personnel ouvrier/employé — fn 1.1 EMP.
 *
 * Mobile-first absolu, lisible smartphone Android 360 px. Layout pile
 * vertical, KPIs 2x2 → 4 col selon largeur, sections "Mon chantier" et
 * "Mon équipe" optionnelles.
 */
export default function EmpDashboardPage() {
  const { data, isLoading, error } = useEmpDashboard();

  if (isLoading || !data) {
    return (
      <main className="mx-auto w-full max-w-screen-md px-4 pb-12 pt-4">
        <div className="h-20 animate-pulse rounded-2xl bg-purple-100" />
        <div className="mt-4 h-16 animate-pulse rounded-2xl bg-purple-50" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-screen-md px-4 pb-12 pt-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Impossible de charger ton tableau de bord. Réessaie dans un instant.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-md px-4 pb-16 pt-0">
      <EmpHeaderBanner
        firstName={data.user.firstName}
        position={data.user.position}
        siteName={data.site?.name ?? null}
      />

      <EmpGreeting firstName={data.user.firstName} />

      <LatestPayslipCallToAction payslip={data.latestPayslip} />

      <EmpKpiRow
        kpis={{
          lastNetSalary: data.kpis.lastNetSalary,
          leavesRemaining: data.kpis.leavesRemaining,
          overtimeHoursMonth: data.kpis.overtimeHoursMonth,
          seniorityYears: data.kpis.seniorityYears,
        }}
      />

      <QuickActionsGrid latestPayslipId={data.latestPayslip?.id ?? null} />

      {data.site && <MyConstructionSiteCard site={data.site} />}

      {data.user.teamLeader && data.team && <MyTeamList team={data.team} />}
    </main>
  );
}
