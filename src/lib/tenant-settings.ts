/**
 * Defaults pour TenantSettings (Phase 2 / Bloc 2 — fn 2.3).
 *
 * V1 fonctionnelle : sections 1 (entreprise), 2 (modules), 4 (paie),
 * 5 (workflows). Sections 3/6/7/8 stockées en JSON pour V2.
 */

export interface IdentitySettings {
  legalName: string;
  rccm: string;
  niu: string;
  capital: string; // BigInt en string
  headquarters: { address: string; city: string; phone: string; email: string };
  establishments: Array<{ name: string; address: string; city: string }>;
  representatives: Array<{ role: string; name: string }>;
  bankAccounts: Array<{ bank: string; accountNumber: string; iban?: string }>;
  plan: string; // BUSINESS, ENTERPRISE...
}

export interface ModulesSettings {
  // Liste des 19 modules avec on/off + meta
  [moduleKey: string]: { active: boolean; activatedAt?: string; activatedBy?: string };
}

export interface PayrollRatesSettings {
  effectiveDate: string;
  irppBrackets: Array<{ min: number; max: number | null; rate: number }>;
  cnpsEmployee: number;
  cnpsEmployer: number;
  cfcEmployee: number;
  cfcEmployer: number;
  fne: number;
  ravBrackets: Array<{ min: number; max: number | null; amount: number }>;
  tcCommunal: number;
  cacRate: number;
  cfsRate: number;
  payPeriodicity: "MONTHLY" | "BIWEEKLY";
}

export interface WorkflowSettings {
  // Seuils par type de validation
  rules: Array<{
    type: string; // PAYROLL, EXPENSE, PURCHASE, HIRING, CONTRACT, LEAVE
    label: string;
    threshold: string; // BigInt en string (FCFA)
    levels: string[]; // ["RH", "DAF", "DG"]
  }>;
}

export const DEFAULT_MODULES = [
  "dashboard", "validations", "reports", "sites", "planning", "finances",
  "accounting", "hr", "payroll", "purchase", "stocks", "messaging",
  "documents", "recruitment", "config", "security", "consolidation",
  "treasury", "objectives",
];

export const MODULE_LABELS: Record<string, { label: string; essential: boolean; premium: boolean }> = {
  dashboard: { label: "Tableau de bord", essential: true, premium: false },
  validations: { label: "Mes validations", essential: true, premium: false },
  reports: { label: "Rapports consolidés", essential: false, premium: false },
  sites: { label: "Chantiers", essential: true, premium: false },
  planning: { label: "Planning", essential: false, premium: false },
  finances: { label: "Finances", essential: true, premium: false },
  accounting: { label: "Comptabilité", essential: true, premium: false },
  hr: { label: "Ressources humaines", essential: true, premium: false },
  payroll: { label: "Paie", essential: true, premium: false },
  purchase: { label: "Achats", essential: false, premium: false },
  stocks: { label: "Stocks & matériel", essential: false, premium: false },
  messaging: { label: "Messagerie", essential: false, premium: false },
  documents: { label: "Documents", essential: false, premium: false },
  recruitment: { label: "Recrutement", essential: false, premium: false },
  config: { label: "Configuration", essential: true, premium: false },
  security: { label: "Sécurité & rôles", essential: true, premium: false },
  consolidation: { label: "Consolidation groupe", essential: false, premium: true },
  treasury: { label: "Trésorerie prévisionnelle", essential: false, premium: true },
  objectives: { label: "Objectifs DG", essential: false, premium: true },
};

export function defaultIdentity(tenantName: string): IdentitySettings {
  return {
    legalName: tenantName,
    rccm: "RC/DLA/2018/B/01258",
    niu: "M102316152502L",
    capital: "100000000",
    headquarters: {
      address: "Quartier Bonapriso, Rue Joffre",
      city: "Douala",
      phone: "+237 233 42 18 90",
      email: "contact@batimcam.cm",
    },
    establishments: [
      { name: "Agence Yaoundé", address: "Quartier Bastos", city: "Yaoundé" },
      { name: "Base logistique", address: "Zone Industrielle Bonabéri", city: "Douala" },
    ],
    representatives: [
      { role: "Directeur Général", name: "Albert DAAYANG" },
      { role: "Directeur Administratif et Financier", name: "Marie NGONO" },
    ],
    bankAccounts: [
      { bank: "UBA Cameroun", accountNumber: "10005-00012-12345678901-42", iban: "CM21..." },
      { bank: "BICEC", accountNumber: "10006-00543-98765432109-87" },
    ],
    plan: "BUSINESS",
  };
}

export function defaultModules(): ModulesSettings {
  const out: ModulesSettings = {};
  for (const k of DEFAULT_MODULES) {
    out[k] = { active: true, activatedAt: new Date().toISOString() };
  }
  return out;
}

export function defaultPayrollRates(): PayrollRatesSettings {
  return {
    effectiveDate: "2026-01-01",
    irppBrackets: [
      { min: 0, max: 2_000_000, rate: 10 },
      { min: 2_000_000, max: 3_000_000, rate: 15 },
      { min: 3_000_000, max: 5_000_000, rate: 25 },
      { min: 5_000_000, max: null, rate: 35 },
    ],
    cnpsEmployee: 4.2,
    cnpsEmployer: 7.0,
    cfcEmployee: 1.0,
    cfcEmployer: 1.5,
    fne: 1.0,
    ravBrackets: [
      { min: 0, max: 50_000, amount: 750 },
      { min: 50_001, max: 100_000, amount: 1_500 },
      { min: 100_001, max: 200_000, amount: 3_000 },
      { min: 200_001, max: null, amount: 6_000 },
    ],
    tcCommunal: 1.0,
    cacRate: 10.0,
    cfsRate: 1.0,
    payPeriodicity: "MONTHLY",
  };
}

export function defaultWorkflows(): WorkflowSettings {
  return {
    rules: [
      { type: "PAYROLL", label: "Paie mensuelle", threshold: "50000000", levels: ["RH", "DAF", "DG"] },
      { type: "EXPENSE", label: "Dépense", threshold: "30000000", levels: ["DAF", "DG"] },
      { type: "PURCHASE", label: "Bon de commande", threshold: "20000000", levels: ["DAF", "DG"] },
      { type: "HIRING", label: "Embauche", threshold: "0", levels: ["RH", "DG"] },
      { type: "CONTRACT", label: "Marché / contrat", threshold: "100000000", levels: ["DAF", "DG"] },
      { type: "LEAVE", label: "Congé exceptionnel", threshold: "0", levels: ["RH", "DG"] },
    ],
  };
}

export function defaultNotifications() {
  return { matrix: {}, templates: {} };
}

export function defaultIntegrations() {
  return {
    banks: { uba: { configured: false }, bicec: { configured: false } },
    momo: { mtn: { configured: false }, orange: { configured: false } },
    email: { resend: { configured: !!process.env.RESEND_API_KEY } },
    storage: { s3: { configured: false } },
  };
}

export const CONFIG_SECTIONS = [
  { key: "entreprise", label: "Identité entreprise", icon: "Building2", v1: true },
  { key: "modules", label: "Modules actifs", icon: "Grid3x3", v1: true },
  { key: "comptable", label: "Plan comptable", icon: "BookOpen", v1: false },
  { key: "paie", label: "Paramètres paie", icon: "Calculator", v1: true },
  { key: "workflows", label: "Workflows de validation", icon: "GitBranch", v1: true },
  { key: "notifications", label: "Notifications", icon: "Bell", v1: false },
  { key: "referentiels", label: "Référentiels", icon: "Tag", v1: false },
  { key: "integrations", label: "Intégrations API", icon: "Plug", v1: false },
] as const;

export type ConfigSectionKey = (typeof CONFIG_SECTIONS)[number]["key"];
