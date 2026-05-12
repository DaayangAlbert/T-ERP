"use client";

import { Search } from "lucide-react";
import { Confidentiality } from "@prisma/client";

interface Props {
  q: string;
  confidentiality: Confidentiality | "ALL";
  minIndexation: number | "";
  minVolumeMb: number | "";
  onChange: (
    next: Partial<{
      q: string;
      confidentiality: Confidentiality | "ALL";
      minIndexation: number | "";
      minVolumeMb: number | "";
    }>,
  ) => void;
}

const CONF_OPTIONS: { value: Confidentiality | "ALL"; label: string }[] = [
  { value: "ALL", label: "Toutes" },
  { value: "PUBLIC", label: "Public" },
  { value: "INTERNAL", label: "Interne" },
  { value: "RESTRICTED", label: "Restreint" },
  { value: "CONFIDENTIAL", label: "Confidentiel" },
];

export function SpacesFiltersCard({ q, confidentiality, minIndexation, minVolumeMb, onChange }: Props) {
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
              placeholder="Nom ou code d'espace…"
              className="h-9 w-full rounded-lg border border-line bg-white pl-8 pr-2 text-[12.5px] outline-none focus:border-violet-400"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Confidentialité</span>
          <select
            value={confidentiality}
            onChange={(e) => onChange({ confidentiality: e.target.value as Confidentiality | "ALL" })}
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          >
            {CONF_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Indexation min.</span>
          <input
            type="number"
            min={0}
            max={100}
            value={minIndexation}
            onChange={(e) => onChange({ minIndexation: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="0–100 %"
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Volume min. (Mo)</span>
          <input
            type="number"
            min={0}
            value={minVolumeMb}
            onChange={(e) => onChange({ minVolumeMb: e.target.value === "" ? "" : Number(e.target.value) })}
            placeholder="0"
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[12.5px] outline-none focus:border-violet-400"
          />
        </label>
      </div>
    </div>
  );
}
