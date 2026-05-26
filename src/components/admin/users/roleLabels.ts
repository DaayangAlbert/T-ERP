// Libellés FR des rôles, pour la console plateforme.
export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propriétaire / PCA",
  DG: "Directeur Général",
  DAF: "Directeur Admin. & Financier",
  SECRETARY_GENERAL: "Secrétaire Général",
  HR: "Ressources Humaines",
  TECH_DIRECTOR: "Directeur Technique",
  WORKS_DIRECTOR: "Directeur des Travaux",
  WORKS_MANAGER: "Conducteur de Travaux",
  SITE_MANAGER: "Chef de Chantier",
  QHSE_MANAGER: "Responsable QHSE",
  WORKER: "Ouvrier",
  ACCOUNTANT: "Comptable",
  PURCHASING_OFFICER: "Chargé des achats",
  LOGISTICS: "Logistique",
  WAREHOUSE: "Magasinier",
  ARCHIVIST: "Archiviste / GED",
  EMPLOYEE: "Employé",
  CANDIDATE: "Chercheur d'emploi",
  TENANT_ADMIN: "Administrateur (IT)",
  SUPER_ADMIN: "Super administrateur",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: "Actif", bg: "rgba(34,197,94,0.18)", color: "#86EFAC" },
  INACTIVE: { label: "Inactif", bg: "rgba(148,163,184,0.18)", color: "#CBD5E1" },
  SUSPENDED: { label: "Suspendu", bg: "rgba(239,68,68,0.22)", color: "#FCA5A5" },
};
