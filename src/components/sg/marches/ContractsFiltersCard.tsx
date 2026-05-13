"use client";

import { Search } from "lucide-react";
import type { ContractingAuthorityType } from "@prisma/client";

const MOA_LABEL: Record<ContractingAuthorityType, string> = {
  PUBLIC_MINISTRY: "Ministère",
  PUBLIC_MUNICIPALITY: "Commune",
  PUBLIC_INSTITUTION: "Institution publique",
  PRIVATE_COMPANY: "Société privée",
  PRIVATE_INDIVIDUAL: "Particulier",
};

interface Props {
  q: string;
  moaType: ContractingAuthorityType | "ALL";
  minAmountM: number | "";
  year: number | "";
  onChange: (n: Partial<{ q: string; moaType: ContractingAuthorityType | "ALL"; minAmountM: number | ""; year: number | "" }>) => void;
}

export function ContractsFiltersCard({ q, moaType, minAmountM, year, onChange }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Recherche</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="Référence, intitulé, MOA…"
              className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Type MOA</span>
          <select
            value={moaType}
            onChange={(e) => onChange({ moaType: e.target.value as ContractingAuthorityType | "ALL" })}
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          >
            <option value="ALL">Tous</option>
            {(Object.keys(MOA_LABEL) as ContractingAuthorityType[]).map((m) => (
              <option key={m} value={m}>{MOA_LABEL[m]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Montant min. (M FCFA)</span>
          <input
            type="number"
            min={0}
            value={minAmountM}
            onChange={(e) => onChange({ minAmountM: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Année signature</span>
          <input
            type="number"
            min={2000}
            max={2099}
            value={year}
            onChange={(e) => onChange({ year: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="2026"
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </label>
      </div>
    </div>
  );
}

export { MOA_LABEL };
