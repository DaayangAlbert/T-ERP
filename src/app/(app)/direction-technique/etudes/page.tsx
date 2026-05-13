"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useDtTenders } from "@/hooks/useDtTenders";
import { TendersKpis } from "@/components/dt/tenders/TendersKpis";
import { TendersStageTabs } from "@/components/dt/tenders/TendersStageTabs";
import { TendersTable } from "@/components/dt/tenders/TendersTable";

type View = "in_progress" | "imminent" | "this_month" | "history";

export default function DtTendersPage() {
  const [view, setView] = useState<View>("in_progress");
  const { data, isLoading } = useDtTenders(view);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Études et offres
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Pipeline appels d&apos;offres et étude de prix.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Wizard nouvelle étude — V2"
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-3 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" /> Nouvelle étude
        </button>
      </header>

      {data && <TendersKpis kpis={data.kpis} />}

      <TendersStageTabs view={view} onChange={setView} />

      {isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : (
        <TendersTable tenders={data.items} />
      )}
    </div>
  );
}
