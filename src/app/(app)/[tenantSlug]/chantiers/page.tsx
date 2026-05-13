"use client";

import { useState } from "react";
import { Download, Plus, MapPin, BarChart3, FileSignature, List } from "lucide-react";
import { useSites, type SitesFilters } from "@/hooks/useSites";
import { SitesKpis } from "@/components/sites/SitesKpis";
import { SitesFiltersBar } from "@/components/sites/SitesFilters";
import { SitesTable } from "@/components/sites/SitesTable";
import { SitesMap } from "@/components/sites/SitesMap";
import { PerformanceTable } from "@/components/sites/PerformanceTable";
import { ContractsList } from "@/components/sites/ContractsList";
import { clsx } from "clsx";

type Tab = "list" | "map" | "performance" | "contracts";

const TABS: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
  { key: "list", label: "Tous les chantiers", icon: <List className="h-3.5 w-3.5" /> },
  { key: "map", label: "Carte", icon: <MapPin className="h-3.5 w-3.5" /> },
  { key: "performance", label: "Performance", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "contracts", label: "Marchés", icon: <FileSignature className="h-3.5 w-3.5" /> },
];

export default function ChantiersPage() {
  const [tab, setTab] = useState<Tab>("list");
  const [filters, setFilters] = useState<SitesFilters>({ page: 1, limit: 12 });
  const { data, isLoading } = useSites(filters);

  return (
    <>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Chantiers</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {data
              ? `${data.summary.activeCount} chantier${data.summary.activeCount > 1 ? "s" : ""} actif${
                  data.summary.activeCount > 1 ? "s" : ""
                } · ${data.total} au total`
              : "Chargement…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Stub icon={<Download className="h-3.5 w-3.5" />}>Exporter</Stub>
          <Stub icon={<Plus className="h-3.5 w-3.5" />} primary>
            Nouveau chantier
          </Stub>
        </div>
      </header>

      {data && tab === "list" && (
        <div className="mb-4">
          <SitesKpis summary={data.summary} />
        </div>
      )}

      {/* Onglets */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx(
              "relative inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition",
              tab === t.key ? "text-primary-700" : "text-ink-3 hover:text-ink"
            )}
          >
            {t.icon}
            {t.label}
            {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <>
          <div className="mb-4">
            <SitesFiltersBar filters={filters} onChange={setFilters} />
          </div>
          <SitesTable
            items={data?.items ?? []}
            loading={isLoading}
            page={filters.page ?? 1}
            pages={data?.pages ?? 1}
            total={data?.total ?? 0}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </>
      )}

      {tab === "map" && <SitesMap />}
      {tab === "performance" && <PerformanceTable />}
      {tab === "contracts" && <ContractsList />}
    </>
  );
}

function Stub({
  icon,
  children,
  primary,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      className={
        primary
          ? "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary-500 px-3 text-[12px] font-medium text-white hover:bg-primary-600"
          : "inline-flex h-8 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12px] font-medium text-ink-2 hover:border-primary-300"
      }
    >
      {icon}
      {children}
    </button>
  );
}
