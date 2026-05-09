"use client";

import { useState } from "react";
import { Download, Plus, Map } from "lucide-react";
import { useSites, type SitesFilters } from "@/hooks/useSites";
import { SitesKpis } from "@/components/sites/SitesKpis";
import { SitesFiltersBar } from "@/components/sites/SitesFilters";
import { SitesTable } from "@/components/sites/SitesTable";

export default function ChantiersPage() {
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
          <Stub icon={<Map className="h-3.5 w-3.5" />}>Vue carte</Stub>
          <Stub icon={<Download className="h-3.5 w-3.5" />}>Exporter</Stub>
          <Stub icon={<Plus className="h-3.5 w-3.5" />} primary>
            Nouveau chantier
          </Stub>
        </div>
      </header>

      {data && (
        <div className="mb-4">
          <SitesKpis summary={data.summary} />
        </div>
      )}

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
