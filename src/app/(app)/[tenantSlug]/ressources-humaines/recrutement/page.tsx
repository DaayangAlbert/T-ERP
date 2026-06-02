"use client";

import { useState } from "react";
import { Briefcase, ClipboardList, Calendar, UserCheck } from "lucide-react";
import { useRecruitmentDashboard } from "@/hooks/useRhRecruitment";
import { KanbanBoard } from "@/components/rh/recruitment/KanbanBoard";
import { OffersSection } from "@/components/rh/recruitment/OffersSection";
import { ApplicationDrawer } from "@/components/rh/recruitment/ApplicationDrawer";
import { PageHelp } from "@/components/help/PageHelp";
import { RhRecrutementTutorial } from "@/components/help/tutorials/RhRecrutementTutorial";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export default function RecrutementPage() {
  const { data, isLoading } = useRecruitmentDashboard();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Recrutement</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Pipeline de candidatures, offres publiées et entretiens.
          </p>
        </div>
        <PageHelp title="Aide — Recrutement"><RhRecrutementTutorial /></PageHelp>
      </header>

      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Briefcase className="h-4 w-4 text-primary-600" />} label="Offres actives" value={fmt(data?.kpis.offersActive ?? 0)} hint="Publiées" />
        <Kpi icon={<ClipboardList className="h-4 w-4 text-emerald-600" />} label="Candidatures" value={fmt(data?.kpis.applicationsTotal ?? 0)} hint="Total pipeline" />
        <Kpi icon={<Calendar className="h-4 w-4 text-amber-600" />} label="Entretiens en cours" value={fmt(data?.kpis.interviewsThisWeek ?? 0)} hint="Cette semaine" />
        <Kpi icon={<UserCheck className="h-4 w-4 text-rose-600" />} label="Embauches du mois" value={fmt(data?.kpis.hiredThisMonth ?? 0)} hint="Acceptées" />
      </div>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Pipeline candidats</h2>
        {isLoading ? (
          <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
        ) : (
          <KanbanBoard onSelect={setSelected} />
        )}
      </section>

      <OffersSection />

      {selected && <ApplicationDrawer id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card min-w-0">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 font-mono text-[18px] font-bold text-ink sm:text-[20px]">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-ink-3">{hint}</div>
    </div>
  );
}
