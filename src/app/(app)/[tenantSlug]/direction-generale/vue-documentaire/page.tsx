"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FolderOpen, Search, Download, FileText, Building2, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { PageHelp } from "@/components/help/PageHelp";
import { DgVuesTutorial } from "@/components/help/tutorials/DgVuesTutorial";

interface DocItem {
  id: string;
  source: "SITE" | "GED";
  title: string;
  category: string | null;
  subCategory: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  site: { id: string; code: string; name: string } | null;
  direction: string | null;
  space: { code: string; name: string } | null;
  reference: string | null;
}

interface Response {
  items: DocItem[];
  facets: {
    sites: Array<{ id: string; code: string; name: string }>;
    categories: Array<{ code: string; count: number }>;
    directions: Array<{ code: string; count: number }>;
  };
  summary: { total: number; siteDocs: number; gedDocs: number };
}

const DIRECTION_LABEL: Record<string, string> = {
  CONSTRUCTION_SITE: "Chantier",
  MARKETS_CONTRACTS: "Marchés & contrats",
  HR: "Ressources humaines",
  ACCOUNTING: "Comptabilité",
  LEGAL: "Juridique",
  QSE: "QSE",
  OTHER: "Autre",
};

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function DgVueDocumentairePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [siteId, setSiteId] = useState("");
  const [direction, setDirection] = useState("");
  const [source, setSource] = useState<"" | "SITE" | "GED">("");

  const { data, isLoading } = useQuery({
    queryKey: ["dg", "documents-summary", { q, category, siteId, direction, source }],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (category) sp.set("category", category);
      if (siteId) sp.set("siteId", siteId);
      if (direction) sp.set("direction", direction);
      if (source) sp.set("source", source);
      const res = await fetch(`/api/dg/documents-summary?${sp.toString()}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Response>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-2.5">
        <div>
          <h1 className="text-[20px] font-bold text-ink flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-violet-600" /> Vue Documentaire
          </h1>
          <p className="text-[12.5px] text-ink-3">
            Tous les documents du groupe · tri par catégorie / chantier / direction · recherche et téléchargement
          </p>
        </div>
        <PageHelp title="Aide — Vue Documentaire DG"><DgVuesTutorial domaine="Documentaire" /></PageHelp>
      </header>

      {/* Barre de recherche + filtres */}
      <div className="space-y-2 rounded-xl border border-line bg-white p-3 shadow-card">
        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-alt px-3">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            type="search"
            placeholder="Rechercher un document (titre, référence)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Toutes catégories ({data?.facets.categories.reduce((s, c) => s + c.count, 0) ?? 0})</option>
            {data?.facets.categories.map((c) => (
              <option key={c.code} value={c.code}>{c.code} ({c.count})</option>
            ))}
          </select>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Tous chantiers</option>
            {data?.facets.sites.map((s) => (
              <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
            ))}
          </select>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Toutes directions</option>
            {data?.facets.directions.map((d) => (
              <option key={d.code} value={d.code}>{DIRECTION_LABEL[d.code] ?? d.code} ({d.count})</option>
            ))}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value as "" | "SITE" | "GED")} className="h-8 rounded-md border border-line bg-white px-2 text-[12px]">
            <option value="">Toutes sources</option>
            <option value="SITE">Chantier</option>
            <option value="GED">GED</option>
          </select>
          {(q || category || siteId || direction || source) && (
            <button
              type="button"
              onClick={() => { setQ(""); setCategory(""); setSiteId(""); setDirection(""); setSource(""); }}
              className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] hover:bg-surface-alt"
            >
              ✕ Réinitialiser
            </button>
          )}
        </div>
        {data && (
          <p className="text-[11px] text-ink-3">
            {data.items.length} résultat{data.items.length > 1 ? "s" : ""} affiché{data.items.length > 1 ? "s" : ""} ·{" "}
            <span className="text-ink-2">{data.summary.siteDocs}</span> chantier ·{" "}
            <span className="text-ink-2">{data.summary.gedDocs}</span> GED
            {data.summary.total > data.items.length && (
              <span className="ml-1 text-amber-700">(affinez votre recherche pour réduire le périmètre)</span>
            )}
          </p>
        )}
      </div>

      {/* Liste */}
      {isLoading && !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-surface-alt" />
      ) : !data || data.items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-line bg-white px-4 py-16 text-center">
          <FileText className="mb-2 h-10 w-10 text-ink-3" />
          <p className="text-[13.5px] font-semibold text-ink">Aucun document trouvé</p>
          <p className="mt-1 text-[12px] text-ink-3">Ajustez les filtres ou la recherche.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-card">
          <table className="w-full min-w-[920px] text-[12.5px]">
            <thead className="bg-surface-alt text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="py-2 pl-3 text-left">Document</th>
                <th className="py-2 text-left">Catégorie</th>
                <th className="py-2 text-left">Source</th>
                <th className="py-2 text-left">Auteur</th>
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-right">Taille</th>
                <th className="py-2 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={`${d.source}-${d.id}`} className="border-t border-line hover:bg-surface-alt">
                  <td className="py-2 pl-3">
                    <div className="font-semibold text-ink">{d.title}</div>
                    <div className="text-[10.5px] text-ink-3">
                      {d.fileName}
                      {d.reference && <span className="ml-1.5 font-mono">{d.reference}</span>}
                    </div>
                  </td>
                  <td className="py-2 text-[11px]">
                    <span className="rounded bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">
                      {d.category ?? "—"}
                    </span>
                    {d.subCategory && <div className="mt-0.5 text-[10px] text-ink-3">{d.subCategory}</div>}
                  </td>
                  <td className="py-2 text-[11px]">
                    {d.site ? (
                      <span className="inline-flex items-center gap-1 text-ink-2">
                        <Building2 className="h-3 w-3" /> {d.site.code}
                      </span>
                    ) : d.direction ? (
                      <span className="inline-flex items-center gap-1 text-ink-2">
                        <Briefcase className="h-3 w-3" /> {DIRECTION_LABEL[d.direction] ?? d.direction}
                      </span>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="py-2 text-[11px] text-ink-2">{d.uploadedBy}</td>
                  <td className="py-2 text-[11px] text-ink-3">{new Date(d.uploadedAt).toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 text-right font-mono text-[10.5px] text-ink-3">{fmtBytes(d.fileSize)}</td>
                  <td className="py-2 pr-3 text-right">
                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener"
                      download={d.fileName}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11px] hover:bg-violet-50 hover:text-violet-700"
                    >
                      <Download className="h-3 w-3" /> Télécharger
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
