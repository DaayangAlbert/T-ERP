"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Search, Plus, Download, Building2, Pencil, Eye } from "lucide-react";
import { clsx } from "clsx";

interface ItSite {
  id: string;
  code: string;
  name: string;
  client: string;
  type: string;
  region: string | null;
  budget: number;
  progress: number;
  margin: number;
  status: string;
  plannedEndDate: string;
  manager: { firstName: string; lastName: string } | null;
}

interface SitesResponse {
  items: ItSite[];
  total: number;
  totalPages: number;
  kpis: { active: number; planned: number; completed: number; archived: number; atRisk: number; drifting: number };
}

export default function ItSitesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["it", "sites", search, status, type, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      params.set("page", String(page));
      const res = await fetch(`/api/it/sites?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<SitesResponse>;
    },
  });

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Administration chantiers</h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Création, cycle de vie, clôture et archivage des chantiers.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-2 bg-white px-3 text-[12.5px] font-medium text-ink-2">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link
            href="/informatique/sites/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouveau chantier
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <Kpi label="Actifs" value={data?.kpis.active ?? 0} tone="ok" />
        <Kpi label="Planifiés" value={data?.kpis.planned ?? 0} tone="info" />
        <Kpi label="Vigilance" value={data?.kpis.atRisk ?? 0} tone="warning" />
        <Kpi label="Dérive" value={data?.kpis.drifting ?? 0} tone="danger" />
        <Kpi label="Clôturés" value={data?.kpis.completed ?? 0} />
        <Kpi label="Archivés" value={data?.kpis.archived ?? 0} />
      </section>

      <section className="grid gap-2 rounded-xl border border-line bg-white p-3 shadow-card sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code, nom, MOA..."
            className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-2 text-[13px]"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">Tous statuts</option>
          <option value="PLANNED">Planifié</option>
          <option value="ACTIVE">Actif</option>
          <option value="AT_RISK">Vigilance</option>
          <option value="DRIFTING">Dérive</option>
          <option value="COMPLETED">Clôturé</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border border-line bg-white px-2 text-[13px]">
          <option value="">Tous types</option>
          <option value="ROAD">Routier</option>
          <option value="BUILDING">Bâtiment</option>
          <option value="CIVIL_ENG">Génie civil</option>
          <option value="DEVELOPMENT">Aménagement</option>
          <option value="HYDRAULIC">AEP / Forage</option>
        </select>
      </section>

      <section className="rounded-xl border border-line bg-white shadow-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-md bg-surface-alt" />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-[12.5px]">
                <thead className="border-b border-line bg-surface-alt text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">MOA</th>
                    <th className="px-3 py-2">Directeur</th>
                    <th className="px-3 py-2 text-right">Budget HT</th>
                    <th className="px-3 py-2 text-right">Avancement</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((s) => (
                    <tr key={s.id} className="border-b border-line">
                      <td className="px-3 py-2 font-mono text-[11.5px]">{s.code}</td>
                      <td className="px-3 py-2 font-medium text-ink">{s.name}</td>
                      <td className="px-3 py-2 text-ink-2">{s.client}</td>
                      <td className="px-3 py-2 text-ink-3">
                        {s.manager ? `${s.manager.firstName} ${s.manager.lastName.charAt(0)}.` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {new Intl.NumberFormat("fr-FR").format(Math.round(s.budget))}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.progress}%</td>
                      <td className="px-3 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            s.status === "ACTIVE" && "bg-success/10 text-success",
                            s.status === "PLANNED" && "bg-primary-50 text-primary-700",
                            s.status === "AT_RISK" && "bg-warning/10 text-warning",
                            s.status === "DRIFTING" && "bg-danger/10 text-danger",
                            s.status === "COMPLETED" && "bg-ink-3/10 text-ink-3",
                            s.status === "ARCHIVED" && "bg-ink-3/10 text-ink-3"
                          )}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/chantiers/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> Voir la fiche
                          </Link>
                          <Link
                            href={`/informatique/sites/${s.id}`}
                            className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:border-primary-300 hover:text-primary-700"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Modifier
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line p-3 text-[12px] text-ink-3">
                <span>{data.items.length} sur {data.total}</span>
                <div className="flex gap-1">
                  <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded border border-line px-2 py-1 disabled:opacity-50">Précédent</button>
                  <button type="button" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-line px-2 py-1 disabled:opacity-50">Suivant</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warning" | "danger" | "info" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-ink-3">{label}</div>
      <div className={clsx(
        "mt-1 text-2xl font-bold",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning",
        tone === "ok" && "text-success",
        tone === "info" && "text-primary-700",
        !tone && "text-ink"
      )}>
        {value}
      </div>
    </div>
  );
}
