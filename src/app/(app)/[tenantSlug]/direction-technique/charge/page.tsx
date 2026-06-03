"use client";

import { useDtCapacity } from "@/hooks/useDtCapacity";
import { CapacityHeatmap } from "@/components/dt/capacity/CapacityHeatmap";
import { OverloadsList } from "@/components/dt/capacity/OverloadsList";
import { PageHelp } from "@/components/help/PageHelp";
import { DtChargeTutorial } from "@/components/help/tutorials/DtChargeTutorial";

export default function DtCapacityPage() {
  const { data, isLoading } = useDtCapacity();

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />;
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Plan de charge équipes
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data.weeks[0]} → {data.weeks[data.weeks.length - 1]} — pilotage capacité et arbitrage surcharges.
          </p>
        </div>
        <PageHelp title="Aide — Plan de charge"><DtChargeTutorial /></PageHelp>
      </header>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          { label: "Équipes actives", v: data.kpis.crewCount.toString() },
          { label: "Capacité semaine", v: `${data.kpis.totalCapacityWeek} h.h` },
          { label: "Charge planifiée", v: `${data.kpis.totalPlannedWeek} h (${data.kpis.utilizationPercent} %)` },
          { label: "Surcharges détectées", v: data.kpis.overloadsCount.toString() },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-line bg-white px-3 py-2.5">
            <div className="text-[18px] font-bold leading-tight text-ink">{k.v}</div>
            <div className="mt-0.5 text-[11.5px] text-ink-2">{k.label}</div>
          </div>
        ))}
      </div>

      <CapacityHeatmap data={data} />
      <OverloadsList overloads={data.overloads} />
    </div>
  );
}
