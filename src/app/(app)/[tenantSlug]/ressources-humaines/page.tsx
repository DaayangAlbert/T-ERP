"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, Banknote, Crown, BarChart3, GraduationCap } from "lucide-react";
import { PayrollMassChart } from "@/components/hr/PayrollMassChart";
import { TopSalariesTable } from "@/components/hr/TopSalariesTable";
import { SuccessionOrgChart } from "@/components/hr/SuccessionOrgChart";
import { SocialIndicatorsDashboard } from "@/components/hr/SocialIndicatorsDashboard";
import { TrainingsCalendar } from "@/components/hr/TrainingsCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useRhDashboard } from "@/hooks/useRhDashboard";
import { RhKpiRow } from "@/components/rh/dashboard/RhKpiRow";
import { RhAlertsList } from "@/components/rh/dashboard/RhAlertsList";
import { HeadcountEvolutionChart } from "@/components/rh/dashboard/HeadcountEvolutionChart";
import { CategoryDonut } from "@/components/rh/dashboard/CategoryDonut";
import { HiringPipelineTable } from "@/components/rh/dashboard/HiringPipelineTable";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { RhDashboardTutorial } from "@/components/help/tutorials/RhDashboardTutorial";

type Tab = "overview" | "payroll" | "succession" | "social" | "trainings";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "overview", label: "Vue d'ensemble", icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { key: "payroll", label: "Masse salariale", icon: <Banknote className="h-3.5 w-3.5" /> },
  { key: "succession", label: "Plan de succession", icon: <Crown className="h-3.5 w-3.5" /> },
  { key: "social", label: "Indicateurs sociaux", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "trainings", label: "Formations", icon: <GraduationCap className="h-3.5 w-3.5" /> },
];

function RhDashboardScreen() {
  const { data, isLoading } = useRhDashboard();
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Tableau de bord RH</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue d&apos;ensemble {user ? `pour ${user.firstName} ${user.lastName}, Responsable RH` : "RH"}.
          </p>
        </div>
        <PageHelp title="Aide — Tableau de bord RH"><RhDashboardTutorial /></PageHelp>
      </header>

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <>
          <RhKpiRow kpis={data.kpis} />
          <RhAlertsList items={data.alerts} />
          <div className="grid gap-3 lg:grid-cols-2">
            <HeadcountEvolutionChart data={data.headcountEvolution12m} />
            <CategoryDonut data={data.categoryBreakdown} />
          </div>
          <HiringPipelineTable items={data.hiringPipeline} />
        </>
      )}
    </div>
  );
}

export default function RhPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  if (user?.role === "HR") return <RhDashboardScreen />;

  return (
    <>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Ressources humaines</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Vue stratégique : masse salariale, succession, indicateurs sociaux, formations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Ressources humaines"><RhDashboardTutorial /></PageHelp>
          <Link
            href="/ressources-humaines/succession"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2 hover:border-primary-300"
          >
            <Crown className="h-3.5 w-3.5" /> Organigramme dédié
          </Link>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview />}
      {tab === "payroll" && (
        <div className="space-y-4">
          <PayrollMassChart />
          <TopSalariesTable />
        </div>
      )}
      {tab === "succession" && <SuccessionOrgChart />}
      {tab === "social" && <SocialIndicatorsDashboard />}
      {tab === "trainings" && <TrainingsCalendar />}
    </>
  );
}

function Overview() {
  return (
    <div className="space-y-4">
      <PayrollMassChart />
      <SocialIndicatorsDashboard />
    </div>
  );
}
