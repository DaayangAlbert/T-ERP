/**
 * Matrice d'accès T-ERP : pour chaque rôle, le niveau d'accès à chaque module.
 *
 * Vérité unique consommée par :
 *   - layouts UI (server components, vérif RBAC à l'entrée d'un espace)
 *   - guards API (`src/lib/rbac/*-guard.ts`)
 *   - hook `useAccess()` côté client (sidebar + UI conditionnelle)
 *
 * 5 niveaux d'accès :
 *   FULL    → lecture + édition + validation (le rôle "propriétaire" du module)
 *   READ    → drill-down lecture seule (DG sur DAF, par exemple)
 *   SCOPE   → restreint à un périmètre (chantiers assignés, équipe, département)
 *   OWN     → uniquement les données dont l'user est propriétaire (RGPD)
 *   NONE    → module masqué dans la sidebar, 403 sur les API
 *
 * Convention :
 *   - Les rôles direction (DG, DAF, etc.) ont FULL sur leur module + READ sur
 *     les autres modules direction pour drill-down stratégique.
 *   - SUPER_ADMIN a FULL partout (sans condition tenant).
 *   - WORKER n'a accès qu'à /ouv (OWN) et son espace personnel (OWN).
 *   - CANDIDATE n'a accès qu'à CAND (OWN) — totalement hors tenant.
 *
 * Note historique : les doublons d'enum Role (SG/SECRETARY_GENERAL,
 * GED/ARCHIVIST) ont été fusionnés en mai 2026. Canonicalisé sur
 * SECRETARY_GENERAL et ARCHIVIST (versions explicites).
 */

import { Role } from "@prisma/client";
import { MODULES, type Module } from "@/lib/rbac/modules";

export type AccessLevel = "FULL" | "READ" | "SCOPE" | "OWN" | "NONE";

export interface Access {
  level: AccessLevel;
  /** Peut éditer/créer/modifier des données du module ? */
  canEdit: boolean;
  /** Peut valider/approuver/refuser (étape workflow N1/N2/N3) ? */
  canValidate: boolean;
  /** Doit-on appliquer le filtre par périmètre (assignedSiteIds, équipe) ? */
  scopedByPerimeter: boolean;
  /** Doit-on filtrer aux seules données dont l'user est propriétaire (RGPD) ? */
  ownerOnly: boolean;
}

const accessOf = (level: AccessLevel): Access => {
  switch (level) {
    case "FULL":
      return { level, canEdit: true, canValidate: true, scopedByPerimeter: false, ownerOnly: false };
    case "READ":
      return { level, canEdit: false, canValidate: false, scopedByPerimeter: false, ownerOnly: false };
    case "SCOPE":
      return { level, canEdit: true, canValidate: true, scopedByPerimeter: true, ownerOnly: false };
    case "OWN":
      return { level, canEdit: true, canValidate: false, scopedByPerimeter: false, ownerOnly: true };
    case "NONE":
      return { level, canEdit: false, canValidate: false, scopedByPerimeter: false, ownerOnly: false };
  }
};

/**
 * MATRICE PRINCIPALE.
 *
 * `null` = pas d'entrée → fallback NONE (fail-safe).
 *
 * Format : MATRIX[role][module] = AccessLevel
 */
type Matrix = Partial<Record<Role, Partial<Record<Module, AccessLevel>>>>;

const MATRIX: Matrix = {
  // ═══════════════════════════════════════════════════════════════════════
  // OWNER — Propriétaire / PCA : gouvernance. Voit TOUT (lecture) + son
  // cockpit (FULL) + validation des décisions critiques. Aucune édition
  // opérationnelle (sécurité : pas de saisie comptable directe).
  // ═══════════════════════════════════════════════════════════════════════
  OWNER: {
    OWNER: "FULL",
    DG: "READ",
    DAF: "READ",
    RH: "READ",
    DT: "READ",
    SG: "READ",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    CPT: "READ",
    ACHATS: "READ",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    OUV: "NONE",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PURCHASING_OFFICER — Chargé des achats. FULL sur ACHATS ; lecture sur
  // magasin, compta, finance, logistique, chantiers et technique. Aucune
  // édition opérationnelle ailleurs (séparation des tâches : il engage la
  // commande, il ne paie pas et ne comptabilise pas).
  // ═══════════════════════════════════════════════════════════════════════
  PURCHASING_OFFICER: {
    ACHATS: "FULL",
    MAG: "READ",
    CPT: "READ",
    DAF: "READ",
    LOG: "READ",
    DT: "READ",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    DG: "NONE",
    RH: "NONE",
    SG: "NONE",
    GED: "NONE",
    OUV: "NONE",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SUPER_ADMIN — accès plateforme (hors tenant) + drill-down lecture
  // ═══════════════════════════════════════════════════════════════════════
  SUPER_ADMIN: {
    PLATFORM: "FULL",
    DG: "READ",
    DAF: "READ",
    RH: "READ",
    DT: "READ",
    SG: "READ",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    OUV: "NONE", // pas de sens pour SUPER_ADMIN d'aller dans le PWA ouvrier
    CPT: "READ",
    ACHATS: "READ",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "READ",
    EMP: "NONE",
    CAND: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DG — Directeur Général : FULL sur DG, READ sur tout le reste
  // ═══════════════════════════════════════════════════════════════════════
  DG: {
    DG: "FULL",
    DAF: "READ",
    RH: "READ",
    DT: "READ", // couvre déjà DTRAV/CDT/CC dans la vue technique
    SG: "READ",
    // CC / DTRAV / CDT retirés du drill-down DG : doublons avec Vue Technique
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    OUV: "NONE",
    // CPT retiré : doublon avec Vue Finance (DAF)
    CPT: "NONE",
    ACHATS: "READ", // valide les gros bons de commande (N3)
    // LOG / MAG / GED gardés mais redirigés vers pages condensées DG
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // DAF — Directrice Administrative et Financière
  // ═══════════════════════════════════════════════════════════════════════
  DAF: {
    DAF: "FULL",
    CPT: "FULL", // DAF supervise la compta
    ACHATS: "FULL", // DAF valide les engagements (N2) et supervise les achats
    // Pas de drill-down DG depuis l'espace DAF : la DG est hiérarchiquement
    // au-dessus, ses vues consolidées ne lui sont pas destinées.
    DG: "NONE",
    DTRAV: "READ", // suivi financier chantiers
    CDT: "READ",
    CC: "READ",
    RH: "READ", // accès paie et masse salariale
    DT: "READ",
    SG: "READ",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    OUV: "NONE",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HR — Responsable Ressources Humaines
  // ═══════════════════════════════════════════════════════════════════════
  HR: {
    RH: "FULL",
    DG: "NONE",
    DAF: "READ", // visibilité paie/masse salariale
    DT: "NONE",
    SG: "NONE",
    DTRAV: "READ", // suivi pointages chantiers
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    CPT: "READ",
    LOG: "NONE",
    MAG: "NONE",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "READ", // pré-screening recrutement
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TECH_DIRECTOR — Directeur Technique
  // ═══════════════════════════════════════════════════════════════════════
  TECH_DIRECTOR: {
    DT: "FULL",
    DG: "NONE",
    DAF: "READ",
    RH: "NONE",
    SG: "READ",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WORKS_DIRECTOR — Directeur des Travaux
  // ═══════════════════════════════════════════════════════════════════════
  WORKS_DIRECTOR: {
    DTRAV: "FULL",
    CDT: "FULL", // DTrav supervise les CdT
    CC: "FULL", // et les CC
    DG: "NONE",
    DAF: "READ",
    RH: "READ",
    DT: "READ",
    SG: "NONE",
    OUV: "NONE",
    CPT: "READ",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WORKS_MANAGER — Conducteur de Travaux (N+2 ouvrier)
  // ═══════════════════════════════════════════════════════════════════════
  WORKS_MANAGER: {
    CDT: "FULL",
    CC: "SCOPE", // gère les CC de ses chantiers
    DTRAV: "READ", // remontée vers DTrav
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "READ",
    SG: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SITE_MANAGER — Chef de Chantier (N+1 ouvrier)
  // ═══════════════════════════════════════════════════════════════════════
  SITE_MANAGER: {
    CC: "FULL", // sur son chantier
    DTRAV: "NONE",
    CDT: "READ", // remontée vers CdT
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "READ",
    MAG: "SCOPE", // gestion magasin de son chantier
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WORKER — Ouvrier de base (PWA mobile-first)
  // ═══════════════════════════════════════════════════════════════════════
  WORKER: {
    OUV: "OWN", // ses propres données : pointage, paie, congés, missions, HSE
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    CPT: "NONE",
    LOG: "NONE",
    MAG: "NONE",
    GED: "NONE",
    IT: "NONE",
    // EMP en OWN : permet à l'ouvrier d'utiliser les APIs /api/emp/*
    // (payslips détaillés, profil enrichi) en plus de ses APIs /api/ouv/*.
    // Choix de design : on harmonise la vue paie/profil entre cadre et
    // ouvrier (cf. /ouv/paie et /ouv/profil qui réutilisent les
    // composants EMP). La sidebar évite le doublon en n'ajoutant pas
    // FULL.EMP pour WORKER (qui a déjà OUV_PERSONAL).
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNTANT — Comptable
  // ═══════════════════════════════════════════════════════════════════════
  ACCOUNTANT: {
    CPT: "FULL",
    DAF: "READ",
    DG: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "READ", // facturation chantiers
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    LOG: "READ",
    MAG: "READ",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // LOGISTICS — Logisticien siège
  // ═══════════════════════════════════════════════════════════════════════
  LOGISTICS: {
    LOG: "FULL",
    MAG: "READ", // visibilité stocks chantiers
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "READ",
    SG: "NONE",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    CPT: "NONE",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // WAREHOUSE — Magasinier
  // ═══════════════════════════════════════════════════════════════════════
  WAREHOUSE: {
    MAG: "FULL",
    LOG: "READ", // visibilité transferts inter-chantiers
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    CPT: "NONE",
    GED: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ARCHIVIST — Documentaliste-Archiviste (canReadAllDocuments).
  // Fusionne l'ancien rôle GED (supprimé de l'enum Role).
  // ═══════════════════════════════════════════════════════════════════════
  ARCHIVIST: {
    GED: "FULL",
    DG: "NONE",
    DAF: "READ",
    RH: "READ",
    DT: "READ",
    SG: "READ",
    DTRAV: "READ",
    CDT: "READ",
    CC: "READ",
    OUV: "NONE",
    CPT: "READ",
    LOG: "READ",
    MAG: "READ",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SECRETARY_GENERAL — Secrétaire Général.
  // Fusionne l'ancien rôle SG (supprimé de l'enum Role).
  // ═══════════════════════════════════════════════════════════════════════
  SECRETARY_GENERAL: {
    SG: "FULL",
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "NONE",
    MAG: "NONE",
    GED: "NONE",
    IT: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EMPLOYEE — Employé bureau (espace personnel uniquement)
  // ═══════════════════════════════════════════════════════════════════════
  EMPLOYEE: {
    EMP: "OWN",
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "NONE",
    MAG: "NONE",
    GED: "NONE",
    IT: "NONE",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TENANT_ADMIN — Administrateur IT du tenant.
  // Fusion mai 2026 : l'IT_ADMIN absorbe le périmètre ARCHIVIST (référent
  // documentaire transverse) — un seul "super-utilisateur" tenant pilote
  // la plateforme technique ET la gouvernance documentaire.
  // ═══════════════════════════════════════════════════════════════════════
  TENANT_ADMIN: {
    IT: "FULL",
    GED: "FULL", // espace archiviste intégré à la sidebar IT
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "NONE",
    MAG: "NONE",
    EMP: "OWN",
    CAND: "NONE",
    PLATFORM: "NONE",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATE — Candidat externe (hors tenant)
  // ═══════════════════════════════════════════════════════════════════════
  CANDIDATE: {
    CAND: "OWN",
    DG: "NONE",
    DAF: "NONE",
    RH: "NONE",
    DT: "NONE",
    SG: "NONE",
    DTRAV: "NONE",
    CDT: "NONE",
    CC: "NONE",
    OUV: "NONE",
    CPT: "NONE",
    LOG: "NONE",
    MAG: "NONE",
    GED: "NONE",
    IT: "NONE",
    EMP: "NONE",
    PLATFORM: "NONE",
  },
};

/**
 * Récupère le niveau d'accès d'un rôle sur un module.
 * Fallback : NONE (fail-safe — si le module n'est pas déclaré pour ce rôle).
 */
export function getAccess(role: Role | null | undefined, module: Module): Access {
  if (!role) return accessOf("NONE");
  const level = MATRIX[role]?.[module] ?? "NONE";
  return accessOf(level);
}

/**
 * Retourne la liste des modules pour lesquels le rôle a un niveau ≥ READ.
 * Utilisée pour construire la sidebar : on ne montre que les modules
 * accessibles, en ordre stable (cf MODULE_ORDER).
 */
export function getAccessibleModules(role: Role | null | undefined): Module[] {
  if (!role) return [];
  const entries = MATRIX[role] ?? {};
  return Object.entries(entries)
    .filter(([, level]) => level !== "NONE")
    .map(([m]) => m as Module);
}

/**
 * Helper booléen — utile pour les guards et les redirects rapides.
 */
export function canAccess(role: Role | null | undefined, module: Module): boolean {
  return getAccess(role, module).level !== "NONE";
}

/**
 * Helper pour les guards API : autorise si le rôle a un niveau ≥ READ.
 * Retourne `false` aussi si l'access est OWN/SCOPE et que la donnée n'est
 * pas dans le périmètre (à vérifier en sus côté handler).
 */
export function isAuthorizedForModule(role: Role | null | undefined, module: Module): boolean {
  return canAccess(role, module);
}
