"use client";

import { useAgingBalance } from "@/hooks/useDafReceivables";
import { ReceivablesKpis } from "@/components/daf/receivables/ReceivablesKpis";
import { AgingBalanceTable } from "@/components/daf/receivables/AgingBalanceTable";
import { ActiveRemindersList } from "@/components/daf/receivables/ActiveRemindersList";
import { PageHelp } from "@/components/help/PageHelp";
import { DafRecouvrementTutorial } from "@/components/help/tutorials/DafRecouvrementTutorial";

export default function RecouvrementPage() {
  const { data, isLoading } = useAgingBalance();

  return (
    <>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Recouvrement clients</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Balance âgée, dossiers en relance et niveaux R1/R2/R3.
          </p>
        </div>
        <PageHelp title="Aide — Recouvrement clients"><DafRecouvrementTutorial /></PageHelp>
      </header>

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
        </div>
      ) : (
        <div className="space-y-4">
          <ReceivablesKpis summary={data.summary} />
          <AgingBalanceTable />
          <ActiveRemindersList />
        </div>
      )}
    </>
  );
}
