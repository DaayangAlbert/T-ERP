"use client";

import { Search, X } from "lucide-react";

interface Props {
  search: string;
  onSearch: (s: string) => void;
  status: string;
  onStatus: (s: string) => void;
  category: string;
  onCategory: (s: string) => void;
  site: string;
  onSite: (s: string) => void;
  contract: string;
  onContract: (s: string) => void;
  facets: {
    categories: string[];
    sites: string[];
    contracts: string[];
    statuses: string[];
  };
}

export function PersonnelFilters({
  search,
  onSearch,
  status,
  onStatus,
  category,
  onCategory,
  site,
  onSite,
  contract,
  onContract,
  facets,
}: Props) {
  return (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <label className="relative col-span-1 sm:col-span-2 lg:col-span-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          placeholder="Rechercher (nom, matricule, n° CNPS, téléphone)..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-8 text-[13px] focus:border-primary-500 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-ink-3 hover:bg-surface-alt"
            aria-label="Effacer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </label>
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
      >
        <option value="">Tous statuts</option>
        {facets.statuses.map((s) => (
          <option key={s} value={s}>
            {s === "ACTIVE" ? "Actifs" : "Inactifs"}
          </option>
        ))}
      </select>
      <select
        value={category}
        onChange={(e) => onCategory(e.target.value)}
        className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
      >
        <option value="">Toutes catégories</option>
        {facets.categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={site}
        onChange={(e) => onSite(e.target.value)}
        className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
      >
        <option value="">Tous chantiers</option>
        {facets.sites.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={contract}
        onChange={(e) => onContract(e.target.value)}
        className="h-9 w-full rounded-md border border-line bg-white px-2 text-[12.5px]"
      >
        <option value="">Tous contrats</option>
        {facets.contracts.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
