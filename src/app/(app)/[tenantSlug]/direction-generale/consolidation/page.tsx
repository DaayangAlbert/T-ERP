"use client";

import { Calendar, Download, FileSpreadsheet } from "lucide-react";
import { useDgConsolidation } from "@/hooks/useDgConsolidation";
import { GroupKpiBanner } from "@/components/dg/GroupKpiBanner";
import { SubsidiariesTable } from "@/components/dg/SubsidiariesTable";
import { StackedRevenueChart } from "@/components/dg/StackedRevenueChart";
import { GroupRevenueDonut } from "@/components/dg/GroupRevenueDonut";
import { IntragroupTransactions } from "@/components/dg/IntragroupTransactions";
import { formatFCFA } from "@/lib/format";
import { PageHelp } from "@/components/help/PageHelp";
import { DgConsolidationTutorial } from "@/components/help/tutorials/DgConsolidationTutorial";

export default function ConsolidationPage() {
  const { data, isLoading, isError, error } = useDgConsolidation();

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        <header className="mb-5 border-b border-line pb-4">
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Cockpit consolidation groupe
          </h1>
        </header>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
          <div className="grid gap-3.5 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
            <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
          </div>
        </div>
      </>
    );
  }

  const { group, groupKpis, subsidiaries, monthlyByFiliale, intragroupTransactions } = data;
  const ca = formatFCFA(groupKpis.ca, { splitUnit: true });

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Cockpit consolidation groupe {group.name}
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {group.childrenCount} filiale{group.childrenCount > 1 ? "s" : ""} · CA cumulé YTD{" "}
            <span className="font-mono text-ink-2">
              {ca.value} {ca.unit}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PageHelp title="Aide — Consolidation groupe"><DgConsolidationTutorial /></PageHelp>
          <select
            aria-label="Période"
            className="h-8 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2 hover:border-primary-300 focus:outline-none focus:border-primary-400"
            defaultValue="ytd"
          >
            <option value="month">Mois en cours</option>
            <option value="quarter">Trimestre</option>
            <option value="ytd">YTD</option>
            <option value="rolling">Année roulante</option>
          </select>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300"
            disabled
            title="Export Excel groupe (à venir)"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </button>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
            disabled
            title="Rapport CA (à venir)"
          >
            <Download className="h-3.5 w-3.5" /> Rapport CA
          </button>
        </div>
      </header>

      <GroupKpiBanner kpis={groupKpis} groupName={group.name} />

      <div className="mt-4">
        <SubsidiariesTable rows={subsidiaries} />
      </div>

      <div className="mt-4 grid gap-3.5 lg:grid-cols-2">
        <StackedRevenueChart data={monthlyByFiliale} subsidiaries={subsidiaries} />
        <GroupRevenueDonut rows={subsidiaries} totalCa={groupKpis.ca} />
      </div>

      <div className="mt-4">
        <IntragroupTransactions transactions={intragroupTransactions} />
      </div>

      <p className="mt-4 text-right text-[11px] text-ink-4 flex items-center justify-end gap-1.5">
        <Calendar className="h-3 w-3" />
        Données mises à jour le {new Date(data.meta.generatedAt).toLocaleString("fr-FR")}
      </p>
    </>
  );
}
