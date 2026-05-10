"use client";

import { Search } from "lucide-react";

const STATUSES = [
  { value: "", label: "Tous statuts" },
  { value: "PLANNED", label: "Planifié" },
  { value: "ACTIVE", label: "En cours" },
  { value: "AT_RISK", label: "Vigilance" },
  { value: "DRIFTING", label: "Dérive" },
  { value: "ON_HOLD", label: "Suspendu" },
  { value: "COMPLETED", label: "Livré" },
];

const TYPES = [
  { value: "", label: "Tous types" },
  { value: "ROAD", label: "Routier" },
  { value: "BUILDING", label: "Bâtiment" },
  { value: "CIVIL_ENG", label: "Génie civil" },
  { value: "DEVELOPMENT", label: "Aménagement" },
  { value: "HYDRAULIC", label: "Hydraulique" },
];

interface Props {
  search: string;
  onSearch: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  type: string;
  onType: (v: string) => void;
  region: string;
  onRegion: (v: string) => void;
  director: string;
  onDirector: (v: string) => void;
  managers: Array<{ id: string; name: string }>;
  regions: string[];
}

export function PortfolioFilters({
  search,
  onSearch,
  status,
  onStatus,
  type,
  onType,
  region,
  onRegion,
  director,
  onDirector,
  managers,
  regions,
}: Props) {
  const inputCls =
    "h-9 w-full rounded-md border border-line-2 bg-white px-2.5 text-[12.5px] text-ink placeholder:text-ink-3 focus:border-primary-500 focus:outline-none";

  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <div className="relative lg:col-span-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          placeholder="Rechercher code / chantier / MOA…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={`${inputCls} pl-8`}
        />
      </div>
      <select value={status} onChange={(e) => onStatus(e.target.value)} className={inputCls}>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select value={type} onChange={(e) => onType(e.target.value)} className={inputCls}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <select value={region} onChange={(e) => onRegion(e.target.value)} className={inputCls}>
        <option value="">Toutes régions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        value={director}
        onChange={(e) => onDirector(e.target.value)}
        className={`${inputCls} lg:col-start-5`}
      >
        <option value="">Tous directeurs travaux</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}
