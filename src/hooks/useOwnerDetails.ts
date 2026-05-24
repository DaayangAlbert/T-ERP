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

export interface OwnerRecouvrement {
  aEncaisser: { total: string; enRetard: string; nombre: number; items: { ref: string; client: string; reste: string; echeance: string; enRetard: boolean }[] };
  aPayer: { total: string; enRetard: string; nombre: number; items: { ref: string; fournisseur: string; chantier: string | null; montant: string; echeance: string; enRetard: boolean }[] };
  soldeNet: string;
}
export interface OwnerStocks {
  resume: { valeurTotale: string; nbMagasins: number; nbArticles: number; nbAlertes: number };
  magasins: {
    id: string; nom: string; type: string; chantier: string | null; nbArticles: number; valeur: string; alertes: number;
    articles: { article: string; quantite: number; unite: string; valeur: string; low: boolean }[];
  }[];
  ruptures: { article: string; magasin: string; quantite: number; seuil: number; unite: string }[];
}
export interface OwnerLogistique {
  resume: { total: number; auTravail: number; inactifs: number; enMaintenance: number; loues: number; valeurParc: string };
  parModele: { nom: string; type: string; quantite: number; auTravail: number; inactifs: number; loues: number; valeur: string }[];
  chantiers: string[];
  items: { id: string; immatriculation: string; nom: string; type: string; statut: string; tone: string; chantier: string | null; inactifJours: number | null; isRented: boolean; valeur: string }[];
}
export interface OwnerSalaires {
  resume: { effectif: number; avecImpayes: number; masseImpayee: string };
  items: { id: string; nom: string; poste: string | null; salaire: string; moisPayes: number; moisImpayes: number; impayes: string[]; resteAPayer: string }[];
}

export interface OwnerDecomptes {
  resume: { total: number; enCours: number; bloques: number; termines: number; montantTotal: string; montantBloque: string };
  items: {
    id: string;
    decompte: string;
    client: string;
    montant: string;
    reste: string;
    echeance: string;
    suiviPar: string | null;
    etapesTotal: number;
    etapesValidees: number;
    etapeCourante: string;
    statut: "termine" | "bloque" | "en_cours";
    blocages: { etape: string; motif: string | null; depuis: string | null; documentsManquants: string[] }[];
  }[];
}

export interface OwnerPlanning {
  resume: { chantiers: number; phases: number; enRetard: number };
  items: { code: string; name: string; avancement: number; phases: { nom: string; debut: string; fin: string; progress: number; statut: string; tone: string }[] }[];
}
export interface OwnerReunions {
  aVenir: { id: string; type: string; date: string; lieu: string; nbPoints: number; statut: string; joursRestants?: number }[];
  passees: { id: string; type: string; date: string; lieu: string; nbPoints: number; statut: string; nbDecisions?: number }[];
}
export interface OwnerRapports {
  conseil: { id: string; titre: string; date: string; auteur: string; pdfUrl: string | null }[];
  financier: { id: string; titre: string; date: string; auteur: string; pdfUrl: string | null }[];
  technique: { id: string; titre: string; date: string; auteur: string; pdfUrl: string | null }[];
}

export const useOwnerFinances = () => useQuery({ queryKey: ["owner", "finances"], queryFn: () => get<OwnerFinances>("/api/owner/finances") });
export const useOwnerPlanning = () => useQuery({ queryKey: ["owner", "planning"], queryFn: () => get<OwnerPlanning>("/api/owner/planning") });
export const useOwnerReunions = () => useQuery({ queryKey: ["owner", "reunions"], queryFn: () => get<OwnerReunions>("/api/owner/reunions") });
export const useOwnerRapports = () => useQuery({ queryKey: ["owner", "rapports"], queryFn: () => get<OwnerRapports>("/api/owner/rapports") });
export const useOwnerDecomptes = () => useQuery({ queryKey: ["owner", "decomptes"], queryFn: () => get<OwnerDecomptes>("/api/owner/decomptes") });
export const useOwnerChantiers = () => useQuery({ queryKey: ["owner", "chantiers"], queryFn: () => get<OwnerChantiers>("/api/owner/chantiers") });
export const useOwnerPersonnel = () => useQuery({ queryKey: ["owner", "personnel"], queryFn: () => get<OwnerPersonnel>("/api/owner/personnel") });
export const useOwnerGouvernance = () => useQuery({ queryKey: ["owner", "gouvernance"], queryFn: () => get<OwnerGouvernance>("/api/owner/gouvernance") });
export const useOwnerRecouvrement = () => useQuery({ queryKey: ["owner", "recouvrement"], queryFn: () => get<OwnerRecouvrement>("/api/owner/recouvrement") });
export const useOwnerStocks = () => useQuery({ queryKey: ["owner", "stocks"], queryFn: () => get<OwnerStocks>("/api/owner/stocks") });
export const useOwnerLogistique = () => useQuery({ queryKey: ["owner", "logistique"], queryFn: () => get<OwnerLogistique>("/api/owner/logistique") });
export const useOwnerSalaires = () => useQuery({ queryKey: ["owner", "salaires"], queryFn: () => get<OwnerSalaires>("/api/owner/salaires") });

export interface OwnerFournisseurs {
  resume: { total: number; totalDu: string; avecDette: number };
  categories: { categorie: string; nombre: number }[];
  items: { id: string; nom: string; categorie: string; ville: string | null; contact: string | null; note: number | null; volumeAnnee: string; duMontant: string; duFactures: number }[];
}
export const useOwnerFournisseurs = () => useQuery({ queryKey: ["owner", "fournisseurs"], queryFn: () => get<OwnerFournisseurs>("/api/owner/fournisseurs") });
