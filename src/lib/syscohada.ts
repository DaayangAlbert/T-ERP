/**
 * Plan comptable SYSCOHADA simplifié (Phase 2 / Bloc 4 — fn 4.2).
 * V1 : structure conforme aux 9 classes officielles. Validation
 * expert-comptable agréé OHADA requise pour la conformité fiscale.
 */

export const SYSCOHADA_CLASSES: Record<string, { label: string; color: string }> = {
  "1": { label: "Comptes de ressources durables", color: "#7E22CE" },
  "2": { label: "Comptes d'actif immobilisé", color: "#0369A1" },
  "3": { label: "Comptes de stocks", color: "#15803D" },
  "4": { label: "Comptes de tiers", color: "#B45309" },
  "5": { label: "Comptes de trésorerie", color: "#A855F7" },
  "6": { label: "Comptes de charges", color: "#B91C1C" },
  "7": { label: "Comptes de produits", color: "#15803D" },
  "8": { label: "Autres charges et produits", color: "#6B7280" },
  "9": { label: "Comptes analytiques", color: "#0369A1" },
};

// Comptes principaux (échantillon — la liste complète a 800+ comptes)
export const SYSCOHADA_ACCOUNTS: Array<{ code: string; label: string }> = [
  // Classe 1 - Ressources durables
  { code: "101", label: "Capital social" },
  { code: "1061", label: "Réserve légale" },
  { code: "11", label: "Report à nouveau" },
  { code: "13", label: "Résultat net de l'exercice" },
  { code: "162", label: "Emprunts auprès des établissements de crédit" },
  // Classe 2 - Actif immobilisé
  { code: "211", label: "Frais d'établissement" },
  { code: "215", label: "Logiciels" },
  { code: "231", label: "Bâtiments" },
  { code: "241", label: "Matériel et outillage industriel" },
  { code: "245", label: "Matériel de transport" },
  { code: "281", label: "Amortissements des immobilisations" },
  // Classe 3 - Stocks
  { code: "311", label: "Marchandises" },
  { code: "321", label: "Matières premières" },
  { code: "335", label: "Produits finis" },
  // Classe 4 - Tiers
  { code: "401", label: "Fournisseurs" },
  { code: "411", label: "Clients" },
  { code: "421", label: "Personnel — rémunérations dues" },
  { code: "431", label: "CNPS" },
  { code: "442", label: "État — IRPP" },
  { code: "443", label: "État — TVA collectée" },
  { code: "445", label: "État — TVA déductible" },
  { code: "447", label: "État — Impôt sur les sociétés" },
  // Classe 5 - Trésorerie
  { code: "521", label: "Banques" },
  { code: "531", label: "Chèques postaux" },
  { code: "571", label: "Caisse" },
  { code: "585", label: "Virements de fonds" },
  // Classe 6 - Charges
  { code: "601", label: "Achats de marchandises" },
  { code: "604", label: "Achats stockés de matières et fournitures liées" },
  { code: "611", label: "Sous-traitance générale" },
  { code: "624", label: "Entretien et réparations" },
  { code: "641", label: "Impôts directs" },
  { code: "661", label: "Rémunérations directes versées au personnel" },
  { code: "664", label: "Charges sociales" },
  { code: "681", label: "Dotations aux amortissements" },
  // Classe 7 - Produits
  { code: "701", label: "Ventes de marchandises" },
  { code: "706", label: "Services vendus" },
  { code: "707", label: "Produits accessoires" },
  { code: "713", label: "Variation des stocks de biens et services produits" },
  { code: "75", label: "Autres produits" },
];

export const JOURNAL_LABELS: Record<string, string> = {
  AC: "Achats",
  VE: "Ventes",
  BQ: "Banque",
  CA: "Caisse",
  OD: "Opérations diverses",
  PA: "Paie",
};

export const SYSCOHADA_STATES = [
  { key: "balance", label: "Balance générale", description: "Soldes par compte (toutes classes)" },
  { key: "pnl", label: "Compte de résultat", description: "Charges (classe 6) vs produits (classe 7)" },
  { key: "bs", label: "Bilan SYSCOHADA", description: "Actif immobilisé + circulant + trésorerie / Capitaux + dettes" },
  { key: "cashflow", label: "Tableau des flux de trésorerie", description: "TFT activité + investissement + financement" },
  { key: "notes", label: "État annexé (notes)", description: "Notes annexes et mentions légales" },
  { key: "dsf", label: "Liasse fiscale DSF", description: "Déclaration Statistique et Fiscale annuelle (OHADA)" },
] as const;

export type SyscohadaStateKey = (typeof SYSCOHADA_STATES)[number]["key"];

export function classOf(account: string): string {
  return account.charAt(0);
}

export function accountLabel(code: string): string {
  return SYSCOHADA_ACCOUNTS.find((a) => a.code === code)?.label ?? code;
}
