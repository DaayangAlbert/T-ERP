"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, FileText, Search } from "lucide-react";
import { clsx } from "clsx";
import {
  useCalculatePayroll,
  useCurrentPayrollCycle,
  useCycleInputs,
  useValidateN1,
} from "@/hooks/useRhPayrollInput";
import { PayrollWorkflowBar } from "@/components/rh/payroll-input/PayrollWorkflowBar";
import { PayrollInputKpis } from "@/components/rh/payroll-input/PayrollInputKpis";
import { PayrollInputTable } from "@/components/rh/payroll-input/PayrollInputTable";
import { PageHelp } from "@/components/help/PageHelp";
import { RhPaieTutorial } from "@/components/help/tutorials/RhPaieTutorial";

const CATEGORIES = ["Journaliers", "Heures sup permanents", "Primes", "Avances", "Retenues"] as const;

export default function PayrollInputPage() {
  const { data: cycle, isLoading } = useCurrentPayrollCycle();
  const [category, setCategory] = useState<string>("Journaliers");
  const [search, setSearch] = useState("");
  const { data: inputs, isLoading: loadingInputs } = useCycleInputs(cycle?.id ?? null, category, search);
  const calculate = useCalculatePayroll(cycle?.id ?? null);
  const validateN1 = useValidateN1(cycle?.id ?? null);
  const [confirmCalc, setConfirmCalc] = useState(false);

  if (isLoading || !cycle) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-xl bg-surface-alt" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Saisie de paie</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Cycle <span className="font-mono font-semibold text-ink">{cycle.period}</span> · statut{" "}
            <span className="font-semibold text-primary-700">{cycle.status}</span>
          </p>
        </div>
        <PageHelp title="Aide — Saisie de paie"><RhPaieTutorial /></PageHelp>
      </header>

      <PayrollWorkflowBar status={cycle.status} />
      <PayrollInputKpis kpis={cycle.kpis} />

      {/* Onglets catégories */}
      <div className="-mx-3 overflow-x-auto px-3">
        <div className="inline-flex gap-1 border-b border-line">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={clsx(
                "relative whitespace-nowrap px-3 py-2 text-[13px] font-medium transition",
                category === c ? "text-primary-700" : "text-ink-3 hover:text-ink"
              )}
            >
              {c}
              {category === c && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Recherche */}
      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Rechercher dans "${category}"...`}
          className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px] focus:border-primary-500 focus:outline-none"
        />
      </label>

      {loadingInputs || !inputs ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : (
        <PayrollInputTable cycleId={cycle.id} category={category} rows={inputs.items} />
      )}

      {/* Sticky CTA mobile + desktop */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-2 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:relative sm:rounded-xl sm:border sm:border-line sm:p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={!["DRAFT", "CALCULATED"].includes(cycle.status) || calculate.isPending}
            onClick={() => setConfirmCalc(true)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary-500 px-4 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-40"
          >
            <Calculator className="h-4 w-4" />
            {calculate.isPending ? "Calcul en cours..." : `Lancer calcul paie ${cycle.period}`}
          </button>
          {cycle.status !== "DRAFT" && (
            <Link
              href={`/ressources-humaines/paie/etat/${cycle.id}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-4 text-[13px] font-semibold text-primary-700 hover:bg-primary-100"
            >
              <FileText className="h-4 w-4" />
              Voir l'etat de salaire
            </Link>
          )}
          <button
            type="button"
            disabled={cycle.status !== "CALCULATED" || validateN1.isPending}
            onClick={() => validateN1.mutate()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-alt disabled:opacity-40"
          >
            {validateN1.isPending ? "..." : "Valider N1 RH → DAF"}
          </button>
        </div>
      </div>

      {confirmCalc && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3" onClick={() => setConfirmCalc(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-ink">Lancer le calcul paie</h3>
            <p className="mt-2 text-[12.5px] text-ink-3">
              Cette opération calcule les bulletins bruts → nets pour {cycle.kpis.totalBulletins} salariés.
              Les saisies non sauvegardées seront perdues.
            </p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCalc(false)}
                className="h-8 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={calculate.isPending}
                onClick={() => calculate.mutate(undefined, { onSuccess: () => setConfirmCalc(false) })}
                className="h-8 rounded-md bg-primary-500 px-3 text-[12.5px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
              >
                Confirmer le lancement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
