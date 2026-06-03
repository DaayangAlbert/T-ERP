"use client";

import { useState, useEffect } from "react";
import { Map, List } from "lucide-react";
import { useDtPortfolio } from "@/hooks/useDtPortfolio";
import { PortfolioFilters } from "@/components/dt/portfolio/PortfolioFilters";
import { PortfolioKpis } from "@/components/dt/portfolio/PortfolioKpis";
import { SitesTable } from "@/components/dt/portfolio/SitesTable";
import { SitesMapView } from "@/components/dt/portfolio/SitesMapView";
import { SiteDetailDrawer } from "@/components/dt/portfolio/SiteDetailDrawer";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DtPortefeuilleTutorial } from "@/components/help/tutorials/DtPortefeuilleTutorial";

const LIMIT = 12;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function DtPortfolioPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [region, setRegion] = useState("");
  const [director, setDirector] = useState("");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const { data, isLoading } = useDtPortfolio({
    search: debouncedSearch,
    status,
    type,
    region,
    directorOfWorks: director,
    page,
    limit: LIMIT,
  });

  // Si l'URL a ?focus=<siteId>, ouvrir le drawer
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get("focus");
    if (focus) setSelectedId(focus);
  }, []);

  // Reset page quand un filtre change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type, region, director]);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Portefeuille chantiers
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data?.kpis.activeCount ?? "—"} chantiers actifs · vue consolidée Direction Technique.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PageHelp title="Aide — Portefeuille chantiers"><DtPortefeuilleTutorial /></PageHelp>
        <div className="flex items-center gap-1 rounded-md border border-line-2 bg-white p-0.5">
          <button
            onClick={() => setView("list")}
            className={clsx(
              "inline-flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium transition",
              view === "list" ? "bg-primary-100 text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            <List className="h-3.5 w-3.5" /> Liste
          </button>
          <button
            onClick={() => setView("map")}
            className={clsx(
              "inline-flex items-center gap-1 rounded px-2.5 py-1 text-[12px] font-medium transition",
              view === "map" ? "bg-primary-100 text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            <Map className="h-3.5 w-3.5" /> Carte
          </button>
        </div>
        </div>
      </header>

      {data && <PortfolioKpis kpis={data.kpis} />}

      <PortfolioFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        type={type}
        onType={setType}
        region={region}
        onRegion={setRegion}
        director={director}
        onDirector={setDirector}
        managers={data?.facets.managers ?? []}
        regions={data?.facets.regions ?? []}
      />

      {view === "list" ? (
        <>
          {isLoading || !data ? (
            <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
          ) : (
            <>
              <SitesTable sites={data.items} onSelect={setSelectedId} />
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between rounded-md border border-line bg-white px-3 py-2 text-[12px]">
                  <span className="text-ink-3">
                    Page {data.pagination.page} / {data.pagination.totalPages} · {data.pagination.total} chantier(s)
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={page >= data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded border border-line-2 px-2 py-1 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <SitesMapView onSelect={setSelectedId} />
      )}

      <SiteDetailDrawer siteId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
