"use client";

import { Plus, Download } from "lucide-react";

interface Props {
  activeCount: number;
  portfolioValue: number;
  openCalls: number;
  closedCount: number;
  readOnly: boolean;
  onCreate: () => void;
}

function fmtAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} Md`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} M`;
  return v.toLocaleString("fr-FR");
}

export function ContractsHeader({ activeCount, portfolioValue, openCalls, closedCount, readOnly, onCreate }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Marchés et contrats clients</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {activeCount} marchés en cours · {fmtAmount(portfolioValue)} FCFA HT portefeuille · {openCalls} AO en cours · {closedCount} archives
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled
          title="Export Excel (à venir)"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink-3 opacity-50"
        >
          <Download className="h-4 w-4" /> Exporter
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={readOnly}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nouveau marché
        </button>
      </div>
    </div>
  );
}
