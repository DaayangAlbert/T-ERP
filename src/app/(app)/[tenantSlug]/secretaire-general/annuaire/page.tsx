"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, Search, Users } from "lucide-react";

interface PersonnelRow {
  id: string;
  matricule: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  category: string;
  contractType: string;
  site: string;
}

interface PersonnelPayload {
  items: PersonnelRow[];
  total: number;
  page: number;
  totalPages: number;
  facets: {
    categories: string[];
    sites: string[];
    contracts: string[];
    statuses: string[];
  };
}

const LIMIT = 20;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function SgAnnuairePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [site, setSite] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => setPage(1), [debouncedSearch, category, site]);

  const sp = new URLSearchParams();
  if (debouncedSearch) sp.set("search", debouncedSearch);
  if (category) sp.set("category", category);
  if (site) sp.set("site", site);
  sp.set("page", String(page));
  sp.set("limit", String(LIMIT));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sg", "annuaire", { search: debouncedSearch, category, site, page }],
    queryFn: async (): Promise<PersonnelPayload> => {
      const res = await fetch(`/api/rh/personnel?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Annuaire personnel</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Contacts directs (téléphone &amp; email) de tous les collaborateurs — {data?.total ?? "…"}{" "}
            {data && data.total > 1 ? "personnes" : "personne"}.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, matricule, téléphone, email…"
              className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[12.5px]"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Toutes catégories</option>
            {data?.facets.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={site}
            onChange={(e) => setSite(e.target.value)}
            className="h-9 rounded-md border border-line bg-white px-2 text-[12.5px]"
          >
            <option value="">Tous sites</option>
            {data?.facets.sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {isError ? (
          <p className="p-6 text-center text-[12.5px] text-rose-700">Impossible de charger l&apos;annuaire.</p>
        ) : isLoading || !data ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-surface-alt" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-ink-3">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-[12.5px]">Aucun collaborateur ne correspond aux filtres.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{p.fullName}</span>
                    <span className="text-[11px] text-ink-3">{p.matricule}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-ink-3">
                    <span>{p.position}</span>
                    <span aria-hidden>·</span>
                    <span>{p.category}</span>
                    <span aria-hidden>·</span>
                    <span>{p.site}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone.replace(/\s+/g, "")}`}
                      title={p.phone}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink-2 hover:bg-surface-alt"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary-600" />
                      <span className="hidden sm:inline">{p.phone}</span>
                    </a>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-md border border-dashed border-line px-2.5 text-[11.5px] text-ink-3">
                      Pas de téléphone
                    </span>
                  )}
                  <a
                    href={`mailto:${p.email}`}
                    title={p.email}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12px] font-medium text-ink-2 hover:bg-surface-alt"
                  >
                    <Mail className="h-3.5 w-3.5 text-primary-600" />
                    <span className="hidden lg:inline max-w-[200px] truncate">{p.email}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line bg-surface-alt px-3 py-2 text-[12px]">
            <span className="text-ink-3">
              Page {data.page} / {data.totalPages} — {data.total} résultats
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-line bg-white px-2 py-1 text-ink-2 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                className="rounded-md border border-line bg-white px-2 py-1 text-ink-2 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
