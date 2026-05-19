"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { Building2, Factory, Layers, X } from "lucide-react";
import type { Role, WarehouseScope } from "@prisma/client";
import { useWarehouses, useSitesLookup, type WarehouseSummary } from "@/hooks/useWarehouses";

/**
 * Filtres applicables au module magasin / stocks (espaces ADMIN + DAF).
 *
 * Combinables :
 *   - scope : CHANTIER / DIRECTION / CENTRAL  (ou "all")
 *   - siteId : chantier précis (visible si scope = CHANTIER ou "all")
 *   - ownerDirection : direction propriétaire (visible si scope = DIRECTION)
 *   - warehouseId : magasin précis (override les autres filtres)
 *
 * Les composants parents passent les valeurs courantes + un callback
 * onChange, et envoient les paramètres correspondants aux routes API.
 */
export interface WarehouseFilterValue {
  scope: WarehouseScope | "all";
  siteId: string | "all";
  ownerDirection: Role | "all";
  warehouseId: string | "all";
}

export const DEFAULT_WAREHOUSE_FILTER: WarehouseFilterValue = {
  scope: "all",
  siteId: "all",
  ownerDirection: "all",
  warehouseId: "all",
};

const SCOPE_LABEL: Record<WarehouseScope, string> = {
  CHANTIER: "Chantier",
  DIRECTION: "Direction",
  CENTRAL: "Central",
};

const DIRECTION_LABEL: Partial<Record<Role, string>> = {
  DG: "Direction Générale",
  DAF: "Direction Admin. & Financière",
  HR: "Direction RH",
  SECRETARY_GENERAL: "Secrétariat Général",
  TECH_DIRECTOR: "Direction Technique",
  WORKS_DIRECTOR: "Direction Travaux",
};

interface Props {
  value: WarehouseFilterValue;
  onChange: (next: WarehouseFilterValue) => void;
  /** Optionnel : masque le sélecteur de magasin précis (utile pour les
   *  dashboards multi-magasin où on ne veut filtrer que par dimension). */
  showWarehouseSelect?: boolean;
  className?: string;
}

export function WarehouseFilter({
  value,
  onChange,
  showWarehouseSelect = true,
  className,
}: Props) {
  const { data, isLoading } = useWarehouses();
  const { data: sitesData, isLoading: sitesLoading } = useSitesLookup();
  const warehouses = data?.items ?? [];
  const sitesAll = sitesData?.items ?? [];

  // Liste de chantiers disponibles : TOUS les chantiers (marchés) du
  // tenant, même ceux sans magasin configuré (synchronisation avec les
  // chantiers de la base, demandée par le métier). Les chantiers avec
  // magasin sont marqués visuellement, les autres affichent une note.
  const sites = useMemo(() => {
    return [...sitesAll].sort((a, b) => {
      // Priorise les chantiers avec un magasin
      if (a.hasWarehouse !== b.hasWarehouse) return a.hasWarehouse ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [sitesAll]);

  // Liste de directions disponibles parmi les warehouses scope=DIRECTION.
  const directions = useMemo(() => {
    const set = new Set<Role>();
    for (const w of warehouses) {
      if (w.scope === "DIRECTION" && w.ownerDirection) set.add(w.ownerDirection);
    }
    return Array.from(set).sort();
  }, [warehouses]);

  // Détermine si l'entreprise a au moins un magasin "DIRECTION"
  // (sinon on masque l'option pour éviter du bruit visuel).
  const hasDirectionWarehouse = directions.length > 0;
  const hasCentralWarehouse = warehouses.some((w) => w.scope === "CENTRAL");

  // Filtre la liste des warehouses précis selon le scope sélectionné.
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((w) => {
      if (value.scope !== "all" && w.scope !== value.scope) return false;
      if (value.siteId !== "all" && w.site?.id !== value.siteId) return false;
      if (value.ownerDirection !== "all" && w.ownerDirection !== value.ownerDirection)
        return false;
      return true;
    });
  }, [warehouses, value.scope, value.siteId, value.ownerDirection]);

  const update = (patch: Partial<WarehouseFilterValue>) => {
    onChange({ ...value, ...patch });
  };

  const reset = () => onChange(DEFAULT_WAREHOUSE_FILTER);

  const isFiltered =
    value.scope !== "all" ||
    value.siteId !== "all" ||
    value.ownerDirection !== "all" ||
    value.warehouseId !== "all";

  return (
    <div
      className={clsx(
        "flex flex-wrap items-end gap-2 rounded-md border border-line bg-white p-3",
        className
      )}
    >
      {/* Scope */}
      <FilterField label="Type de magasin" icon={<Layers className="h-3.5 w-3.5" />}>
        <select
          value={value.scope}
          onChange={(e) =>
            update({
              scope: e.target.value as WarehouseScope | "all",
              // Reset les sous-filtres incompatibles avec le nouveau scope
              siteId: e.target.value === "DIRECTION" || e.target.value === "CENTRAL" ? "all" : value.siteId,
              ownerDirection: e.target.value === "CHANTIER" || e.target.value === "CENTRAL" ? "all" : value.ownerDirection,
              warehouseId: "all",
            })
          }
          className="h-8 rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none"
          disabled={isLoading}
        >
          <option value="all">Tous</option>
          <option value="CHANTIER">Chantiers</option>
          {hasDirectionWarehouse && <option value="DIRECTION">Directions</option>}
          {hasCentralWarehouse && <option value="CENTRAL">Central</option>}
        </select>
      </FilterField>

      {/* Chantier (si scope = CHANTIER ou ALL) — tous les chantiers du
          tenant. Depuis la sync, chaque chantier a son magasin associé. */}
      {(value.scope === "all" || value.scope === "CHANTIER") && sites.length > 0 && (
        <FilterField label="Chantier" icon={<Factory className="h-3.5 w-3.5" />}>
          <select
            value={value.siteId}
            onChange={(e) => update({ siteId: e.target.value, warehouseId: "all" })}
            className="h-8 min-w-[180px] rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none"
            disabled={isLoading || sitesLoading}
          >
            <option value="all">Tous les chantiers ({sites.length})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </FilterField>
      )}

      {/* Direction (si scope = DIRECTION) */}
      {value.scope === "DIRECTION" && hasDirectionWarehouse && (
        <FilterField label="Direction" icon={<Building2 className="h-3.5 w-3.5" />}>
          <select
            value={value.ownerDirection}
            onChange={(e) => update({ ownerDirection: e.target.value as Role | "all", warehouseId: "all" })}
            className="h-8 min-w-[160px] rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none"
            disabled={isLoading}
          >
            <option value="all">Toutes les directions</option>
            {directions.map((d) => (
              <option key={d} value={d}>
                {DIRECTION_LABEL[d] ?? d}
              </option>
            ))}
          </select>
        </FilterField>
      )}

      {/* Magasin précis (optionnel) */}
      {showWarehouseSelect && filteredWarehouses.length > 0 && (
        <FilterField label="Magasin">
          <select
            value={value.warehouseId}
            onChange={(e) => update({ warehouseId: e.target.value })}
            className="h-8 min-w-[160px] rounded-md border border-line bg-white px-2 text-[12.5px] text-ink focus:border-primary-300 focus:outline-none"
            disabled={isLoading}
          >
            <option value="all">Tous</option>
            {filteredWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </FilterField>
      )}

      {isFiltered && (
        <button
          type="button"
          onClick={reset}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-ink-3 hover:bg-surface-alt hover:text-ink"
        >
          <X className="h-3.5 w-3.5" /> Réinitialiser
        </button>
      )}
    </div>
  );
}

function FilterField({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * Sérialise un WarehouseFilterValue en query string pour les routes API.
 * Les clés à "all" sont omises.
 */
export function warehouseFilterToQuery(filter: WarehouseFilterValue): string {
  const params = new URLSearchParams();
  if (filter.scope !== "all") params.set("scope", filter.scope);
  if (filter.siteId !== "all") params.set("siteId", filter.siteId);
  if (filter.ownerDirection !== "all") params.set("ownerDirection", filter.ownerDirection);
  if (filter.warehouseId !== "all") params.set("warehouseId", filter.warehouseId);
  return params.toString();
}

/**
 * Décrit les paramètres extraits côté serveur d'une route GET.
 */
export interface WarehouseFilterParams {
  scope: WarehouseScope | null;
  siteId: string | null;
  ownerDirection: Role | null;
  warehouseId: string | null;
}

export function parseWarehouseFilter(url: URL): WarehouseFilterParams {
  const scope = url.searchParams.get("scope") as WarehouseScope | null;
  const siteId = url.searchParams.get("siteId");
  const ownerDirection = url.searchParams.get("ownerDirection") as Role | null;
  const warehouseId = url.searchParams.get("warehouseId");
  return {
    scope: scope || null,
    siteId: siteId || null,
    ownerDirection: ownerDirection || null,
    warehouseId: warehouseId || null,
  };
}
