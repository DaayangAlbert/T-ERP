/**
 * Modules métier T-ERP — constantes typées partagées par la matrice d'accès.
 *
 * Chaque module = un espace fonctionnel cohérent (un dossier sous
 * `src/app/(app)/[tenantSlug]/*`). La matrice d'accès (cf access-matrix.ts)
 * définit, pour chaque rôle, le niveau d'accès à chaque module.
 *
 * Cette liste est la **vérité unique** consommée par :
 *   - layouts (server components, vérif RBAC à l'entrée)
 *   - guards API (`src/lib/rbac/*-guard.ts`)
 *   - hook `useAccess()` côté client (sidebar + UI conditionnelle)
 *
 * Ajout d'un nouveau module : ajouter la constante ici + déclarer ses accès
 * dans `access-matrix.ts`. Si oublié, l'app n'affichera/n'autorisera rien
 * (fail-safe).
 */

export const MODULES = {
  // ───────────────────────── Pilotage direction ─────────────────────────
  DG: "DG", // /direction-generale
  DAF: "DAF", // /direction-financiere
  RH: "RH", // /ressources-humaines
  DT: "DT", // /direction-technique
  SG: "SG", // /secretaire-general

  // ───────────────────────── Production / chantier ──────────────────────
  DTRAV: "DTRAV", // /directeur-travaux
  CDT: "CDT", // /conducteur-travaux
  CC: "CC", // /chef-chantier
  OUV: "OUV", // /ouv (PWA mobile-first ouvrier)

  // ───────────────────────── Support / opérationnel ─────────────────────
  CPT: "CPT", // /comptable
  LOG: "LOG", // /logistique
  MAG: "MAG", // /magasin
  GED: "GED", // /gestion-documentaire
  IT: "IT", // /informatique

  // ───────────────────────── Espace personnel ───────────────────────────
  EMP: "EMP", // /employe (espace bureau personnel)

  // ───────────────────────── Externe / SaaS ─────────────────────────────
  CAND: "CAND", // /cand (candidat — accès via (candidate) route group)
  PLATFORM: "PLATFORM", // /admin (super-admin SaaS — hors tenant)
} as const;

export type Module = (typeof MODULES)[keyof typeof MODULES];

/**
 * Liste ordonnée pour itération (sidebar, audit, etc.).
 * L'ordre détermine l'ordre d'affichage dans les menus latéraux.
 */
export const MODULE_ORDER: Module[] = [
  MODULES.DG,
  MODULES.DAF,
  MODULES.RH,
  MODULES.DT,
  MODULES.SG,
  MODULES.DTRAV,
  MODULES.CDT,
  MODULES.CC,
  MODULES.OUV,
  MODULES.CPT,
  MODULES.LOG,
  MODULES.MAG,
  MODULES.GED,
  MODULES.IT,
  MODULES.EMP,
  MODULES.CAND,
  MODULES.PLATFORM,
];

/**
 * Mapping module → route racine de l'espace.
 * Utilisé pour générer les liens sidebar et les redirects par rôle.
 * `null` = pas d'espace UI dédié (rare : ex. PLATFORM est hors tenantSlug).
 */
export const MODULE_ROUTE: Record<Module, string | null> = {
  DG: "/direction-generale",
  DAF: "/direction-financiere",
  RH: "/ressources-humaines",
  DT: "/direction-technique",
  SG: "/secretaire-general",
  DTRAV: "/directeur-travaux",
  CDT: "/conducteur-travaux",
  CC: "/chef-chantier",
  OUV: "/ouv",
  CPT: "/comptable",
  LOG: "/logistique",
  MAG: "/magasin",
  GED: "/gestion-documentaire",
  IT: "/informatique",
  EMP: "/employe",
  CAND: null, // hors route group (app)
  PLATFORM: null, // hors route group (app) — réservé SUPER_ADMIN
};

/**
 * Libellé court FR pour affichage UI (sidebar, banner, breadcrumb).
 */
export const MODULE_LABEL: Record<Module, string> = {
  DG: "Direction Générale",
  DAF: "Direction Financière",
  RH: "Ressources Humaines",
  DT: "Direction Technique",
  SG: "Secrétariat Général",
  DTRAV: "Direction Travaux",
  CDT: "Conduite Travaux",
  CC: "Chef Chantier",
  OUV: "Espace Ouvrier",
  CPT: "Comptabilité",
  LOG: "Logistique",
  MAG: "Magasin",
  GED: "Gestion Documentaire",
  IT: "Administration IT",
  EMP: "Espace Personnel",
  CAND: "Espace Candidat",
  PLATFORM: "Console Plateforme",
};
