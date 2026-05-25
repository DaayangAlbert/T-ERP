"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Package } from "lucide-react";
import { clsx } from "clsx";
import { useArticles, ARTICLE_CATEGORIES } from "@/hooks/useArticles";
import { ArticleCreateModal } from "@/components/articles/ArticleCreateModal";

export function ArticlesCatalogue() {
  const { data, isLoading } = useArticles();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showNew, setShowNew] = useState(false);

  const canManage = data?.canManage ?? false;
  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (a) =>
        (!category || a.category === category) &&
        (!q || a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
    );
  }, [items, search, category]);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of items) m[a.category] = (m[a.category] ?? 0) + 1;
    return m;
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-3">
          Catalogue des articles pré-enregistrés, utilisés dans les bons de commande.
        </p>
        {canManage && (
          <button type="button" onClick={() => setShowNew(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
            <Plus className="h-3.5 w-3.5" /> Nouvel article
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un article (nom ou code)…"
          className="h-10 w-full rounded-md border border-line bg-white pl-10 pr-3 text-[13px]"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={!category} onClick={() => setCategory("")}>Tous ({items.length})</Chip>
        {ARTICLE_CATEGORIES.map((c) => {
          const n = countByCat[c.value] ?? 0;
          if (n === 0) return null;
          return <Chip key={c.value} active={category === c.value} onClick={() => setCategory(c.value)}>{c.label} ({n})</Chip>;
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-alt" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt p-8 text-center text-[12.5px] text-ink-3">
          Aucun article. {canManage ? "Cliquez « Nouvel article » pour en ajouter un." : ""}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead className="border-b border-line bg-surface-alt text-left text-[10.5px] uppercase tracking-wider text-ink-3">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Désignation</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2 text-right">Unité</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-line">
                  <td className="px-3 py-2 font-mono text-[11.5px] text-ink-2">{a.code}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <Package className="h-3.5 w-3.5 text-primary-500" /> {a.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-ink-3">{a.categoryLabel}</td>
                  <td className="px-3 py-2 text-right text-ink-2">{a.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <ArticleCreateModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition",
        active ? "border-primary-500 bg-primary-500 text-white" : "border-line bg-white text-ink-2 hover:border-primary-300"
      )}
    >
      {children}
    </button>
  );
}
