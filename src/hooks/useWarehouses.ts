"use client";

import { useQuery } from "@tanstack/react-query";
import type { Role, SiteStatus, WarehouseScope } from "@prisma/client";

export interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  scope: WarehouseScope;
  ownerDirection: Role | null;
  site: { id: string; code: string; name: string } | null;
  keeper: { id: string; fullName: string } | null;
}

export interface WarehousesResponse {
  items: WarehouseSummary[];
  scopes: WarehouseScope[];
}

/**
 * Liste les magasins du tenant accessibles à l'utilisateur — utilisée
 * par WarehouseFilter pour peupler les sélecteurs (chantier/direction).
 */
export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: async (): Promise<WarehousesResponse> => {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Erreur de chargement des magasins");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export interface SiteLookupItem {
  id: string;
  code: string;
  name: string;
  status: SiteStatus;
  region: string | null;
  tenantId: string;
  /** true si un Warehouse de scope=CHANTIER est associé à ce site. */
  hasWarehouse: boolean;
}

/**
 * Liste TOUS les chantiers (marchés) actifs du tenant pour peupler le
 * sélecteur "Chantier" du WarehouseFilter — même les chantiers sans
 * magasin configuré apparaissent (cas "synchronisation avec les
 * chantiers/marchés" demandé par l'utilisateur).
 */
export function useSitesLookup() {
  return useQuery({
    queryKey: ["sites", "lookup"],
    queryFn: async (): Promise<{ items: SiteLookupItem[] }> => {
      const res = await fetch("/api/sites/lookup");
      if (!res.ok) throw new Error("Erreur de chargement des chantiers");
      return res.json();
    },
    staleTime: 60_000,
  });
}
