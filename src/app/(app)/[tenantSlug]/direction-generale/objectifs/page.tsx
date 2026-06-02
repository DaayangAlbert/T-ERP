"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ObjectivePeriod } from "@prisma/client";
import {
  useDgObjectives,
  useObjectiveDetail,
  useDeleteObjective,
  type ObjectiveItem,
} from "@/hooks/useDgObjectives";
import { ObjectivesGrid } from "@/components/dg/ObjectivesGrid";
import { ObjectiveTrajectoryChart } from "@/components/dg/ObjectiveTrajectoryChart";
import { ObjectiveFormModal } from "@/components/dg/ObjectiveFormModal";
import { PageHelp } from "@/components/help/PageHelp";
import { DgObjectifsTutorial } from "@/components/help/tutorials/DgObjectifsTutorial";

const YEARS = [2024, 2025, 2026];

function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

export default function ObjectifsPage() {
  const [year, setYear] = useState(2026);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ObjectiveItem | null>(null);
  const [creating, setCreating] = useState(false);

  const annualQuery = useDgObjectives({ year, period: ObjectivePeriod.ANNUAL });
  const quarterlyQuery = useDgObjectives({
    year,
    period: ObjectivePeriod.QUARTERLY,
    quarter: currentQuarter(),
  });
  const detailQuery = useObjectiveDetail(selectedId);
  const deleteMut = useDeleteObjective();

  const annual = annualQuery.data?.items ?? [];
  const quarterly = quarterlyQuery.data?.items ?? [];

  // Sélection par défaut : premier objectif annuel
  useMemo(() => {
    if (!selectedId && annual.length > 0) setSelectedId(annual[0].id);
  }, [selectedId, annual]);

  const handleDelete = async (o: ObjectiveItem) => {
    if (!confirm(`Supprimer l'objectif « ${o.title} » ?`)) return;
    try {
      await deleteMut.mutateAsync(o.id);
      if (selectedId === o.id) setSelectedId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Suppression échouée");
    }
  };

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Mes objectifs {year}</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {annual.length} objectif{annual.length > 1 ? "s" : ""} annuel
            {annual.length > 1 ? "s" : ""} · {quarterly.length} en cours T{currentQuarter()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PageHelp title="Aide — Mes objectifs"><DgObjectifsTutorial /></PageHelp>
          <select
            aria-label="Année"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 rounded-md border border-line-2 bg-white px-3 text-[12.5px] text-ink-2 hover:border-primary-300 focus:outline-none focus:border-primary-400"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                Exercice {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvel objectif
          </button>
          <button
            type="button"
            disabled
            title="Définir les objectifs de l'année prochaine (à venir)"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-3 opacity-60"
          >
            Définir objectifs {year + 1}
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
          Objectifs annuels
        </h2>
        {annualQuery.isLoading ? (
          <SkeletonGrid />
        ) : (
          <ObjectivesGrid
            objectives={annual}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(o) => {
              setEditing(o);
              setCreating(false);
            }}
            onDelete={handleDelete}
            emptyText={`Aucun objectif annuel défini pour ${year}.`}
          />
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
          Objectifs trimestriels en cours (T{currentQuarter()} {year})
        </h2>
        {quarterlyQuery.isLoading ? (
          <SkeletonGrid count={2} />
        ) : (
          <ObjectivesGrid
            objectives={quarterly}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(o) => {
              setEditing(o);
              setCreating(false);
            }}
            onDelete={handleDelete}
            emptyText="Aucun objectif trimestriel défini pour le trimestre en cours."
          />
        )}
      </section>

      {detailQuery.data && (
        <section className="mt-5">
          <ObjectiveTrajectoryChart detail={detailQuery.data} />
        </section>
      )}

      <ObjectiveFormModal
        open={creating || Boolean(editing)}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        initial={editing}
        defaultYear={year}
      />
    </>
  );
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[180px] rounded-xl border border-line bg-white p-4 shadow-card">
          <div className="h-3 w-1/3 animate-pulse rounded bg-surface-alt" />
          <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-surface-alt" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-surface-alt" />
          <div className="mt-3 h-2 w-full animate-pulse rounded bg-surface-alt" />
        </div>
      ))}
    </div>
  );
}
