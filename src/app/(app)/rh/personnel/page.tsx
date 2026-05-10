"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { usePersonnel } from "@/hooks/useRhPersonnel";
import { PersonnelFilters } from "@/components/rh/personnel/PersonnelFilters";
import { PersonnelTable } from "@/components/rh/personnel/PersonnelTable";
import { PersonnelPagination } from "@/components/rh/personnel/PersonnelPagination";
import { EmployeeFiche } from "@/components/rh/personnel/EmployeeFiche";

const LIMIT = 8;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function PersonnelPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [site, setSite] = useState("");
  const [contract, setContract] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading } = usePersonnel({
    search: debouncedSearch || undefined,
    status: status || undefined,
    category: category || undefined,
    site: site || undefined,
    contract: contract || undefined,
    page,
    limit: LIMIT,
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, category, site, contract]);

  const facets = data?.facets ?? { categories: [], sites: [], contracts: [], statuses: [] };

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Personnel</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Annuaire complet : {data?.total ?? "—"} collaborateurs (filtres avancés + export).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/rh/personnel/export"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-[12.5px] font-medium text-ink-3 hover:bg-surface-alt"
          >
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </a>
        </div>
      </header>

      <PersonnelFilters
        search={search}
        onSearch={setSearch}
        status={status}
        onStatus={setStatus}
        category={category}
        onCategory={setCategory}
        site={site}
        onSite={setSite}
        contract={contract}
        onContract={setContract}
        facets={facets}
      />

      {isLoading || !data ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-alt" />
          ))}
        </div>
      ) : (
        <>
          <PersonnelTable items={data.items} onSelect={setSelectedId} />
          <PersonnelPagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            onChange={setPage}
          />
        </>
      )}

      {selectedId && <EmployeeFiche id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
