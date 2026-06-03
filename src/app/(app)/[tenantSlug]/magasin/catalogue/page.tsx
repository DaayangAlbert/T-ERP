"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Package, Plus } from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusBadge } from "@/components/cc/SyncStatusBadge";
import { ArticleCreateModal } from "@/components/articles/ArticleCreateModal";
import { useArticles } from "@/hooks/useArticles";
import { PageHelp } from "@/components/help/PageHelp";
import { MagCatalogueTutorial } from "@/components/help/tutorials/MagCatalogueTutorial";

interface CatalogueItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stockQuantity: number;
  pmpUnitPrice: number;
  totalValue: number;
  minThreshold: number | null;
  isRupture: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  CEMENT_CONCRETE: "Ciment / béton",
  STEEL_REBAR: "Acier",
  AGGREGATES: "Granulats",
  FORMWORK: "Coffrage",
  FUEL: "Carburants",
  CONSUMABLES: "Consommables",
  TOOLS: "Outillage",
  PPE: "EPI",
  OTHER: "Autres",
};

export default function MagCataloguePage() {
  const initialOnlyRuptures = useSearchParams().get("onlyRuptures") === "1";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyRuptures, setOnlyRuptures] = useState(initialOnlyRuptures);
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();
  const canManage = useArticles().data?.canManage ?? false;

  const { data, isLoading } = useQuery({
    queryKey: ["mag", "catalogue", search, category, onlyRuptures],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (onlyRuptures) params.set("onlyRuptures", "1");
      const res = await fetch(`/api/mag/articles?${params}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{
        items: CatalogueItem[];
        totals: { all: number; byCategory: Record<string, number> };
      }>;
    },
  });

  const totalValue = data?.items.reduce((s, i) => s + i.totalValue, 0) ?? 0;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Catalogue articles</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <button type="button" onClick={() => setShowNew(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary-600 px-3 text-[12.5px] font-medium text-white hover:bg-primary-700">
              <Plus className="h-3.5 w-3.5" /> Nouvel article
            </button>
          )}
          <SyncStatusBadge />
          <PageHelp title="Aide — Catalogue"><MagCatalogueTutorial /></PageHelp>
        </div>
      </header>

      <section>
        <p className="text-[12.5px] text-ink-3">
          <strong className="text-ink">{data?.totals.all ?? 0}</strong> articles en catalogue ·
          <strong className="ml-1 text-primary-700">{new Intl.NumberFormat("fr-FR").format(Math.round(totalValue))} FCFA</strong>
          {" "}valorisés au PMP
        </p>
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher code ou nom..."
          style={{ minHeight: 48, fontSize: 16 }}
          className="w-full rounded-md border border-line bg-white pl-10 pr-3"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <Chip active={!category && !onlyRuptures} onClick={() => { setCategory(""); setOnlyRuptures(false); }}>
          Tous {data ? `(${data.totals.all})` : ""}
        </Chip>
        {Object.entries(CATEGORY_LABELS).map(([code, label]) => {
          const count = data?.totals.byCategory[code] ?? 0;
          if (count === 0) return null;
          return (
            <Chip
              key={code}
              active={category === code}
              onClick={() => { setCategory(code); setOnlyRuptures(false); }}
            >
              {label} ({count})
            </Chip>
          );
        })}
        <Chip
          active={onlyRuptures}
          onClick={() => setOnlyRuptures(!onlyRuptures)}
          tone="danger"
        >
          Ruptures
        </Chip>
      </div>

      <section className="space-y-1.5">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-md bg-surface-alt" />)
        ) : data?.items.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-4 text-center text-[12.5px] text-ink-3">
            Aucun article trouvé.
          </p>
        ) : (
          data?.items.map((a) => (
            <article
              key={a.id}
              style={{ minHeight: 80 }}
              className="flex items-center gap-3 rounded-lg border border-line bg-white p-3"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700">
                <Package className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink">{a.code} · {a.name}</div>
                <div className="text-[11.5px] text-ink-3">
                  {CATEGORY_LABELS[a.category] ?? a.category} ·
                  PMP {a.pmpUnitPrice.toLocaleString("fr-FR")} FCFA/{a.unit}
                </div>
              </div>
              <div className="text-right">
                <div className={clsx(
                  "text-[16px] font-bold tabular-nums",
                  a.isRupture ? "text-danger" : a.stockQuantity > 0 ? "text-success" : "text-ink-3"
                )}>
                  {a.stockQuantity} <span className="text-[11px] font-normal">{a.unit}</span>
                </div>
                {a.minThreshold !== null && (
                  <div className="text-[10px] text-ink-3">min {a.minThreshold}</div>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {showNew && (
        <ArticleCreateModal
          onClose={() => setShowNew(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["mag", "catalogue"] })}
        />
      )}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ minHeight: 36 }}
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition",
        active
          ? tone === "danger"
            ? "border-danger bg-danger text-white"
            : "border-primary-500 bg-primary-500 text-white"
          : "border-line bg-white text-ink-2 hover:border-primary-300"
      )}
    >
      {children}
    </button>
  );
}
