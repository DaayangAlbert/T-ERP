"use client";

import { useEffect, useState } from "react";
import { Search, FileText, Archive, AlertTriangle, Calendar, Filter, Shield } from "lucide-react";
import { clsx } from "clsx";
import { useArchivalStats, useGedSearch, type SearchFilters, type SearchResultItem } from "@/hooks/useGedSearch";
import { useGedClassifications, type ClassificationRow } from "@/hooks/useGedClassifications";

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const ARCH_STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  SEMI_ACTIVE: "bg-blue-100 text-blue-800",
  FINAL_ARCHIVE: "bg-violet-100 text-violet-800",
  PENDING_DESTRUCTION: "bg-amber-100 text-amber-800",
  DESTROYED: "bg-zinc-100 text-zinc-700",
};

const ARCH_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  SEMI_ACTIVE: "Semi-actif",
  FINAL_ARCHIVE: "Archive déf.",
  PENDING_DESTRUCTION: "À détruire",
  DESTROYED: "Détruit",
};

export default function GedRecherchePage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const search = useGedSearch();
  const { data: stats } = useArchivalStats();
  const { data: classifs } = useGedClassifications("ALL");

  const runSearch = () => search.mutate({ query, filters, page: 1 });

  useEffect(() => {
    search.mutate({ query: "", filters: {}, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = search.data;

  return (
    <div className="space-y-3 pb-20">
      <header className="border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Recherche & archivage</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          Moteur full-text · {fmt(stats?.totals.active ?? 0)} actifs · {fmt(stats?.totals.semiActive ?? 0)} semi-actifs · {fmt(stats?.totals.finalArchive ?? 0)} archives définitives
        </p>
      </header>

      {/* KPIs */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<FileText className="h-4 w-4 text-emerald-600" />} label="Actifs" value={fmt(stats?.totals.active ?? 0)} />
        <Kpi icon={<Archive className="h-4 w-4 text-blue-600" />} label="Semi-actifs" value={fmt(stats?.totals.semiActive ?? 0)} />
        <Kpi icon={<Shield className="h-4 w-4 text-violet-600" />} label="Archives déf." value={fmt(stats?.totals.finalArchive ?? 0)} />
        <Kpi icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="À détruire" value={fmt(stats?.totals.pendingDestruction ?? 0)} alert={(stats?.totals.pendingDestruction ?? 0) > 0} />
      </div>

      {/* Barre de recherche */}
      <div className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={`Recherche full-text dans ${fmt(stats?.totals.all ?? 0)} documents...`}
              className="h-12 w-full rounded-md border border-line bg-white pl-9 pr-3 text-[14px]"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={search.isPending}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md bg-primary-500 px-4 text-[13px] font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
          >
            <Search className="h-4 w-4" /> {search.isPending ? "Recherche..." : "Rechercher"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:bg-surface-alt"
          >
            <Filter className="h-4 w-4" /> Filtres avancés
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-3 lg:grid-cols-5">
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Type</div>
              <select
                value={filters.classificationId ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, classificationId: e.target.value || undefined }))}
                className="mt-1 h-11 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              >
                <option value="">Tous</option>
                {(classifs?.items ?? []).map((c: ClassificationRow) => (
                  <option key={c.id} value={c.id}>{c.prefix} · {c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Statut archivage</div>
              <select
                value={filters.archivalStatus ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, archivalStatus: e.target.value || undefined }))}
                className="mt-1 h-11 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              >
                <option value="">Tous</option>
                <option value="ACTIVE">Actif</option>
                <option value="SEMI_ACTIVE">Semi-actif</option>
                <option value="FINAL_ARCHIVE">Archive définitive</option>
                <option value="PENDING_DESTRUCTION">À détruire</option>
              </select>
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Confidentialité</div>
              <select
                value={filters.confidentiality ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, confidentiality: (e.target.value as SearchFilters["confidentiality"]) || undefined }))}
                className="mt-1 h-11 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              >
                <option value="">Toutes</option>
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Interne</option>
                <option value="RESTRICTED">Restreint</option>
                <option value="CONFIDENTIAL">Confidentiel</option>
              </select>
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Période du</div>
              <input
                type="date"
                value={filters.periodFrom ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, periodFrom: e.target.value || undefined }))}
                className="mt-1 h-11 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </label>
            <label className="block">
              <div className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">au</div>
              <input
                type="date"
                value={filters.periodTo ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, periodTo: e.target.value || undefined }))}
                className="mt-1 h-11 w-full rounded-md border border-line bg-white px-2 text-[13px]"
              />
            </label>
          </div>
        )}
      </div>

      {/* Résultats */}
      {results && (
        <section>
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            Résultats ({fmt(results.total)}) · page {results.page}/{results.pages || 1}
          </h2>
          {results.items.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface-alt p-6 text-center text-[13px] text-ink-3">
              Aucun document ne correspond à votre recherche.
            </div>
          ) : (
            <ul className="space-y-2">
              {results.items.map((d) => (
                <ResultItem key={d.id} d={d} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-3 shadow-card min-w-0", alert ? "border-amber-200 bg-amber-50" : "border-line")}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon} <span className="truncate">{label}</span>
      </div>
      <div className={clsx("mt-1 font-mono text-[18px] font-bold sm:text-[20px]", alert ? "text-amber-700" : "text-ink")}>{value}</div>
    </div>
  );
}

function ResultItem({ d }: { d: SearchResultItem }) {
  return (
    <li className="rounded-xl border border-line bg-white p-3 hover:bg-surface-alt/40">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            {d.classificationPrefix && (
              <span className="rounded bg-primary-50 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-primary-700">{d.classificationPrefix}</span>
            )}
            <span className="text-[13px] font-semibold text-ink line-clamp-1">{d.name}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
            {d.internalReference && <span className="font-mono">{d.internalReference}</span>}
            {d.spaceName && <span>· {d.spaceName}</span>}
            {d.author && <span>· {d.author}</span>}
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {fmtDate(d.createdAt)}
            </span>
            <span>· {d.sizeMb} Mo</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {d.archivalStatus && (
            <span className={clsx("rounded px-1.5 py-0.5 text-[10px] font-semibold", ARCH_STATUS_COLOR[d.archivalStatus])}>
              {ARCH_STATUS_LABEL[d.archivalStatus]}
            </span>
          )}
          {d.legalHold && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">⚖ Gel légal</span>
          )}
        </div>
      </div>
    </li>
  );
}
