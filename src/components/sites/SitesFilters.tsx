"use client";

import { Search, X } from "lucide-react";
import { SiteStatus, SiteType } from "@prisma/client";
import type { SitesFilters as Filters } from "@/hooks/useSites";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
}

const STATUS_OPTIONS: { value: SiteStatus | ""; label: string }[] = [
  { value: "", label: "Tous statuts" },
  { value: SiteStatus.PLANNED, label: "Planifié" },
  { value: SiteStatus.ACTIVE, label: "Actif" },
  { value: SiteStatus.AT_RISK, label: "Vigilance" },
  { value: SiteStatus.DRIFTING, label: "Dérive" },
  { value: SiteStatus.ON_HOLD, label: "Suspendu" },
  { value: SiteStatus.COMPLETED, label: "Terminé" },
];

const TYPE_OPTIONS: { value: SiteType | ""; label: string }[] = [
  { value: "", label: "Tous types" },
  { value: SiteType.ROAD, label: "BTP routier" },
  { value: SiteType.BUILDING, label: "Bâtiment" },
  { value: SiteType.CIVIL_ENG, label: "Génie civil" },
  { value: SiteType.DEVELOPMENT, label: "Aménagement" },
  { value: SiteType.HYDRAULIC, label: "Forage / AEP" },
];

export function SitesFiltersBar({ filters, onChange }: Props) {
  const hasAny = filters.status || filters.type || filters.region || filters.q;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-card">
      <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-md border border-line bg-surface-alt px-3">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          type="search"
          value={filters.q ?? ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value || undefined, page: 1 })}
          placeholder="Code, libellé, client…"
          className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
        />
      </div>

      <Select
        value={filters.status ?? ""}
        onChange={(value) =>
          onChange({ ...filters, status: (value as SiteStatus | "") || undefined, page: 1 })
        }
        options={STATUS_OPTIONS}
      />
      <Select
        value={filters.type ?? ""}
        onChange={(value) =>
          onChange({ ...filters, type: (value as SiteType | "") || undefined, page: 1 })
        }
        options={TYPE_OPTIONS}
      />
      <input
        type="search"
        value={filters.region ?? ""}
        onChange={(e) => onChange({ ...filters, region: e.target.value || undefined, page: 1 })}
        placeholder="Région"
        className="h-9 w-[140px] rounded-md border border-line bg-surface-alt px-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary-300"
      />

      {hasAny && (
        <button
          onClick={() => onChange({ page: 1, limit: filters.limit })}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line-2 bg-white px-2.5 text-[12px] text-ink-2 hover:border-primary-300"
        >
          <X className="h-3.5 w-3.5" />
          Réinitialiser
        </button>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-line bg-surface-alt px-3 text-sm text-ink-2 focus:outline-none focus:border-primary-300"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
