"use client";

import { Plus, Scale } from "lucide-react";
import type { LegalCasesListResponse } from "@/hooks/useSgLegalCases";

interface Props {
  kpis: LegalCasesListResponse["kpis"];
  lawyersCount: number;
  readOnly: boolean;
  onCreate: () => void;
}

function fmtFcfa(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k`;
  return n.toString();
}

export function LegalCasesHeader({ kpis, lawyersCount, readOnly, onCreate }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Contentieux juridique</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          <Scale className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5" />
          {kpis.activeCount} contentieux actif{kpis.activeCount > 1 ? "s" : ""} ·
          provisions {fmtFcfa(kpis.provisionTotal)} FCFA · {lawyersCount} cabinet
          {lawyersCount > 1 ? "s" : ""} avocats partenaire{lawyersCount > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={readOnly}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouveau dossier
        </button>
      </div>
    </div>
  );
}
