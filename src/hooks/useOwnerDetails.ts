"use client";

import { useQuery } from "@tanstack/react-query";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface OwnerFinances {
  banques: { total: string; creditAccorde: string; creditUtilise: string; creditDisponible: string; items: { bank: string; accountNumber: string; balance: string; creditDisponible: string }[] };
  mois: { entrees: string; sorties: string; net: string };
  comptesProjet: { detteTotale: string; items: { siteCode: string; siteName: string; balance: string; debt: string; banque: string | null }[] };
  compteSalaire: { balance: string; banque: string | null } | null;
}
export interface OwnerChantiers {
  resume: { total: number; actifs: number; vontBien: number; enDifficulte: number; valeurTotale: string; margeMoyenne: number };
  items: { id: string; code: string; name: string; client: string; sante: string; tone: string; progress: number; margin: number; montant: string; echeance: string; responsable: string | null }[];
}
export interface OwnerPersonnel {
  effectif: number;
  ouvriers: number;
  cadresEtBureau: number;
  masseSalariale: string;
  nouveauxCeMois: number;
  departements: { departement: string; effectif: number; masseSalariale: string }[];
}
export interface OwnerGouvernance {
  decisions: { enAttente: number; traiteesCeMois: number; parType: { type: string; count: number; montant: string }[] };
  marches: { nombre: number; valeurTotale: string; nouveauxCeMois: number };
}

export const useOwnerFinances = () => useQuery({ queryKey: ["owner", "finances"], queryFn: () => get<OwnerFinances>("/api/owner/finances") });
export const useOwnerChantiers = () => useQuery({ queryKey: ["owner", "chantiers"], queryFn: () => get<OwnerChantiers>("/api/owner/chantiers") });
export const useOwnerPersonnel = () => useQuery({ queryKey: ["owner", "personnel"], queryFn: () => get<OwnerPersonnel>("/api/owner/personnel") });
export const useOwnerGouvernance = () => useQuery({ queryKey: ["owner", "gouvernance"], queryFn: () => get<OwnerGouvernance>("/api/owner/gouvernance") });
