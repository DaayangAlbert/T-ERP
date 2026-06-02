"use client";

import { useState } from "react";
import { Download, Plus, RefreshCw, Sliders } from "lucide-react";
import { useDgCashflow } from "@/hooks/useDgCashflow";
import { CashFlowSummary } from "@/components/dg/CashFlowSummary";
import { CashFlowChart } from "@/components/dg/CashFlowChart";
import { CashFlowTable } from "@/components/dg/CashFlowTable";
import { MajorDueDates } from "@/components/dg/MajorDueDates";
import { ManualForecastModal } from "@/components/dg/ManualForecastModal";
import { PageHelp } from "@/components/help/PageHelp";
import { DgTresorerieTutorial } from "@/components/help/tutorials/DgTresorerieTutorial";

export default function TresoreriePrevisionnellePage() {
  const [weeks, setWeeks] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useDgCashflow(weeks);

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error instanceof Error ? error.message : "Erreur"}
      </div>
    );
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Trésorerie prévisionnelle — {weeks} semaines glissantes
          </h1>
          {data && (
            <p className="mt-1 text-[12.5px] text-ink-3">
              Du {new Date(data.horizon.startDate).toLocaleDateString("fr-FR")} au{" "}
              {new Date(data.horizon.endDate).toLocaleDateString("fr-FR")}
              {" · "}
              {data.projectionsCount} prévisions agrégées
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PageHelp title="Aide — Trésorerie prévisionnelle"><DgTresorerieTutorial /></PageHelp>
          <select
            aria-label="Horizon"
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="h-8 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2 hover:border-primary-300 focus:outline-none focus:border-primary-400"
          >
            <option value={4}>4 semaines</option>
            <option value={8}>8 semaines</option>
            <option value={12}>12 semaines</option>
            <option value={26}>26 semaines</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300 disabled:opacity-50"
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
          <button
            type="button"
            disabled
            title="Paramétrage des pondérations à venir"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-3 opacity-60"
          >
            <Sliders className="h-3.5 w-3.5" />
            Paramètres
          </button>
          <button
            type="button"
            disabled
            title="Export Excel à venir"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-3 opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Prévision manuelle
          </button>
        </div>
      </header>

      {isLoading || !data ? (
        <Skeleton />
      ) : (
        <>
          <CashFlowSummary summary={data.summary} weeks={data.horizon.weeks} />
          <div className="mt-4">
            <CashFlowChart data={data} />
          </div>
          <div className="mt-4">
            <CashFlowTable weeks={data.weeks} />
          </div>
          <div className="mt-4">
            <MajorDueDates items={data.majorDueDates} />
          </div>
        </>
      )}

      <ManualForecastModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-surface-alt" />
      <div className="h-72 animate-pulse rounded-xl bg-surface-alt" />
    </div>
  );
}
