"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Factory,
  Package,
  Search,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { clsx } from "clsx";
import type { Role, WarehouseScope } from "@prisma/client";
import {
  warehouseFilterToQuery,
  type WarehouseFilterValue,
} from "@/components/magasin/WarehouseFilter";
import { formatFCFA } from "@/lib/format";

interface StockLine {
  id: string;
  article: {
    id: string;
    code: string;
    name: string;
    category: string;
    unit: string;
  };
  quantity: number;
  unit: string;
  pmpUnitPrice: string;
  totalValue: string;
  minThreshold: number | null;
  lastInAt: string | null;
  lastOutAt: string | null;
  isRupture: boolean;
  warehouse: {
    id: string;
    code: string;
    name: string;
    scope: WarehouseScope;
    ownerDirection: Role | null;
    site: { id: string; code: string; name: string } | null;
  } | null;
}

interface Response {
  items: StockLine[];
  summary: {
    warehouseCount: number;
    articleCount: number;
    totalValue: number;
    rupturesCount: number;
  };
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    scope: WarehouseScope;
    ownerDirection: Role | null;
    site: { id: string; code: string; name: string } | null;
  }>;
}

const DIRECTION_LABEL: Partial<Record<Role, string>> = {
  DG: "DG",
  DAF: "DAF",
  HR: "RH",
  SECRETARY_GENERAL: "SG",
  TECH_DIRECTOR: "DT",
  WORKS_DIRECTOR: "DTRAV",
};

/**
 * Tableau des stocks détaillés par magasin (chantier ou direction).
 * Reçoit le filtre depuis le parent (page /stocks), récupère
 * /api/stocks/by-warehouse et regroupe par magasin pour un rendu
 * lisible.
 */
export function WarehouseStocksTable({
  warehouseFilter,
}: {
  warehouseFilter: WarehouseFilterValue;
}) {
  const [search, setSearch] = useState("");
  const [onlyRuptures, setOnlyRuptures] = useState(false);

  const qs = useMemo(() => {
    const filterQs = warehouseFilterToQuery(warehouseFilter);
    const sp = new URLSearchParams(filterQs);
    if (search.trim()) sp.set("search", search.trim());
    if (onlyRuptures) sp.set("onlyRuptures", "true");
    return sp.toString();
  }, [warehouseFilter, search, onlyRuptures]);

  const { data, isLoading } = useQuery({
    queryKey: ["stocks", "by-warehouse", warehouseFilter, search, onlyRuptures],
    queryFn: async (): Promise<Response> => {
      const res = await fetch(`/api/stocks/by-warehouse?${qs}`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });

  // Regroupe les stocks par magasin pour un rendu structuré.
  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { warehouse: StockLine["warehouse"]; lines: StockLine[] }>();
    for (const item of data.items) {
      const key = item.warehouse?.id ?? "_unknown";
      if (!map.has(key)) {
        map.set(key, { warehouse: item.warehouse, lines: [] });
      }
      map.get(key)!.lines.push(item);
    }
    return Array.from(map.values());
  }, [data]);

  return (
    <div className="space-y-3">
      {/* Barre filtres locale (recherche + ruptures) */}
      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-white p-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-surface-alt px-2 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-ink-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article (code ou nom)…"
            className="h-8 flex-1 bg-transparent text-[12.5px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </div>
        <label className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-[12.5px] text-ink hover:bg-surface-alt">
          <input
            type="checkbox"
            checked={onlyRuptures}
            onChange={(e) => setOnlyRuptures(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary-500"
          />
          Ruptures uniquement
        </label>
      </div>

      {/* Résumé */}
      {data && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryCard
            icon={<WarehouseIcon className="h-4 w-4" />}
            label="Magasins"
            value={data.summary.warehouseCount.toString()}
          />
          <SummaryCard
            icon={<Package className="h-4 w-4" />}
            label="Articles stockés"
            value={data.summary.articleCount.toString()}
          />
          <SummaryCard
            icon={<Package className="h-4 w-4" />}
            label="Valeur totale"
            value={`${(data.summary.totalValue / 1_000_000).toFixed(1)} M`}
            unit="FCFA"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Ruptures"
            value={data.summary.rupturesCount.toString()}
            tone={data.summary.rupturesCount > 0 ? "danger" : "ok"}
          />
        </div>
      )}

      {isLoading && (
        <div className="h-32 animate-pulse rounded-xl bg-surface-alt" />
      )}

      {!isLoading && data && grouped.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface-alt p-8 text-center">
          <Package className="mx-auto h-8 w-8 text-ink-3" />
          <h3 className="mt-2 text-sm font-semibold text-ink">
            Aucun article en stock
          </h3>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Pour la sélection actuelle (filtres + recherche), aucun stock n'est
            enregistré.
          </p>
        </div>
      )}

      {!isLoading && grouped.length > 0 && (
        <div className="space-y-4">
          {grouped.map(({ warehouse, lines }) => (
            <WarehouseSection
              key={warehouse?.id ?? "_unknown"}
              warehouse={warehouse}
              lines={lines}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WarehouseSection({
  warehouse,
  lines,
}: {
  warehouse: StockLine["warehouse"];
  lines: StockLine[];
}) {
  if (!warehouse) return null;
  const isDirection = warehouse.scope === "DIRECTION";
  const isCentral = warehouse.scope === "CENTRAL";
  const Icon = isDirection ? Building2 : isCentral ? WarehouseIcon : Factory;
  const tone = isDirection
    ? "bg-primary-50 text-primary-700"
    : isCentral
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  const totalValue = lines.reduce((acc, l) => acc + Number(l.totalValue), 0);
  const rupturesCount = lines.filter((l) => l.isRupture).length;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-alt px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={clsx("grid h-7 w-7 place-items-center rounded-full", tone)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-ink">
              {warehouse.name}
              <span className="ml-2 text-[11px] font-normal text-ink-3">{warehouse.code}</span>
            </div>
            <div className="text-[11px] text-ink-3">
              {isDirection
                ? `Magasin de direction · ${DIRECTION_LABEL[warehouse.ownerDirection ?? "DG"] ?? warehouse.ownerDirection ?? "—"}`
                : isCentral
                  ? "Magasin central groupe"
                  : warehouse.site
                    ? `Chantier · ${warehouse.site.name}`
                    : "Sans site"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11.5px]">
          <span className="font-medium text-ink">
            {lines.length} article{lines.length > 1 ? "s" : ""}
          </span>
          <span className="font-semibold text-primary-700">
            {formatFCFA(totalValue)} FCFA
          </span>
          {rupturesCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 font-semibold text-danger">
              <AlertTriangle className="h-3 w-3" /> {rupturesCount} rupture{rupturesCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-surface-alt text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Article</th>
              <th className="px-3 py-2 text-left">Catégorie</th>
              <th className="px-3 py-2 text-right">Quantité</th>
              <th className="px-3 py-2 text-right">PMP unitaire</th>
              <th className="px-3 py-2 text-right">Valeur totale</th>
              <th className="px-3 py-2 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((l) => (
              <tr key={l.id} className={clsx("hover:bg-surface-alt", l.isRupture && "bg-danger/5")}>
                <td className="px-3 py-2 font-mono text-[11.5px] text-ink-3">{l.article.code}</td>
                <td className="px-3 py-2 font-medium text-ink">{l.article.name}</td>
                <td className="px-3 py-2 text-ink-3">{l.article.category}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {l.quantity.toLocaleString("fr-FR")}{" "}
                  <span className="text-ink-3">{l.unit}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-3">
                  {formatFCFA(Number(l.pmpUnitPrice))}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-ink">
                  {formatFCFA(Number(l.totalValue))}
                </td>
                <td className="px-3 py-2 text-center">
                  {l.isRupture ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[10.5px] font-semibold text-danger">
                      <AlertTriangle className="h-3 w-3" /> Rupture
                    </span>
                  ) : l.minThreshold !== null && l.quantity < l.minThreshold * 1.5 ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                      Bas
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  tone?: "ok" | "danger";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border bg-white p-3 shadow-sm",
        tone === "danger" ? "border-danger/30" : "border-line"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={clsx(
            "grid h-7 w-7 place-items-center rounded-full",
            tone === "danger"
              ? "bg-danger/10 text-danger"
              : "bg-primary-50 text-primary-600"
          )}
        >
          {icon}
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
          {label}
        </span>
      </div>
      <div className="mt-1.5 font-mono text-[18px] font-bold tabular-nums text-ink">
        {value}
        {unit && <span className="ml-1 text-[10.5px] font-medium text-ink-3">{unit}</span>}
      </div>
    </div>
  );
}
