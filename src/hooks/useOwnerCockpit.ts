"use client";

import { useQuery } from "@tanstack/react-query";

export interface OwnerCockpit {
  finance: {
    tresorerie: string;
    ligneCredit: string;
    entreesMois: string;
    sortiesMois: string;
    fluxNetMois: string;
    detteProjets: string;
  };
  chantiers: {
    total: number;
    actifs: number;
    enDifficulte: number;
    clotures: number;
    planifies: number;
    valeurPortefeuille: string;
    margeMoyenne: number;
  };
  personnel: {
    effectif: number;
    masseSalariale: string;
  };
  commercial: {
    nombreMarches: number;
    valeurMarches: string;
    nouveauxMarchesMois: number;
    decisionsEnAttente: number;
  };
  recouvrement: { aEncaisser: string; aPayer: string };
  decomptes: { bloques: number; montantBloque: string };
  stocks: { valeur: string; alertes: number };
  logistique: { total: number; auTravail: number; inactifs: number; loues: number };
  generatedAt: string;
}

export function useOwnerCockpit() {
  return useQuery({
    queryKey: ["owner", "cockpit"],
    queryFn: async () => {
      const res = await fetch("/api/owner/cockpit", { credentials: "same-origin" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<OwnerCockpit>;
    },
  });
}
