"use client";

import { useDafTreasury } from "@/hooks/useDafTreasury";
import { TreasuryHeader } from "@/components/daf/treasury/TreasuryHeader";
import { TreasuryKpis } from "@/components/daf/treasury/TreasuryKpis";
import { BanksTable } from "@/components/daf/treasury/BanksTable";
import { TreasuryEvolutionChart } from "@/components/daf/treasury/TreasuryEvolutionChart";
import { LatestMovementsList } from "@/components/daf/treasury/LatestMovementsList";

export default function TreasoreriePage() {
  const { data, isLoading, isError } = useDafTreasury();

  if (isError) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">Erreur de chargement.</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-4 border-b border-line pb-4">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Trésorerie temps réel</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Multi-banques · synchro automatique · vue mobile-first.
        </p>
      </header>

      <div className="space-y-4">
        <TreasuryHeader
          consolidatedPosition={data.summary.consolidatedPosition}
          totalAvailable={data.summary.totalAvailable}
        />

        <TreasuryKpis kpis={data.dailyKpis} />

        <BanksTable items={data.items} />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TreasuryEvolutionChart data={data.evolution7d} />
          <LatestMovementsList items={data.latestMovements} />
        </div>
      </div>
    </>
  );
}
