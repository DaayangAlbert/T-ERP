// Bibliothèque de blocs disponibles dans le wizard sur-mesure (Phase 2 / fn 2.2).
// Constantes client-safe (ne pas importer next/headers ou prisma ici).

export const BLOCK_CATEGORIES = {
  KPI: "Indicateurs clés",
  CHART: "Graphiques",
  TABLE: "Tableaux",
  TEXT: "Textes",
} as const;

export type BlockCategory = keyof typeof BLOCK_CATEGORIES;

export interface ReportBlock {
  key: string;
  label: string;
  category: BlockCategory;
  description: string;
}

export const REPORT_BLOCKS: ReportBlock[] = [
  // KPIs
  { key: "kpi.revenue", label: "Chiffre d'affaires consolidé", category: "KPI", description: "CA actualisé sur la période" },
  { key: "kpi.margin", label: "Marge consolidée", category: "KPI", description: "Marge moyenne pondérée" },
  { key: "kpi.treasury", label: "Trésorerie disponible", category: "KPI", description: "Snapshot bancaire + projection" },
  { key: "kpi.backlog", label: "Carnet de commandes", category: "KPI", description: "Reste à facturer" },
  { key: "kpi.headcount", label: "Effectif total", category: "KPI", description: "Permanents + temporaires" },
  { key: "kpi.activeSites", label: "Chantiers actifs", category: "KPI", description: "Hors archivés" },
  // Graphiques
  { key: "chart.revenue_trend", label: "Évolution du CA", category: "CHART", description: "Courbe 12 mois" },
  { key: "chart.cashflow", label: "Trésorerie 12 semaines", category: "CHART", description: "Projection encaissements/décaissements" },
  { key: "chart.objectives", label: "Avancement objectifs", category: "CHART", description: "Bar chart par catégorie" },
  // Tableaux
  { key: "table.top_sites", label: "Top 5 chantiers", category: "TABLE", description: "Par budget · avancement · marge" },
  { key: "table.subsidiaries", label: "Comparatif filiales", category: "TABLE", description: "CA / marge / chantiers" },
  { key: "table.upcoming_validations", label: "Validations en attente", category: "TABLE", description: "Vue d'ensemble" },
  // Textes
  { key: "text.summary", label: "Synthèse exécutive (rédigée)", category: "TEXT", description: "Texte libre du DG" },
  { key: "text.actions", label: "Plan d'actions", category: "TEXT", description: "Décisions et arbitrages" },
];

export const REPORT_TYPE_LABEL: Record<string, string> = {
  EXECUTIVE_SUMMARY: "Synthèse exécutive",
  MONTHLY_DASHBOARD: "Tableau de bord mensuel",
  ANNUAL_GROUP: "Bilan annuel groupe",
  QUARTERLY_NOTE: "Note trimestrielle",
  CUSTOM: "Sur-mesure",
};

// Templates pré-configurés : quels blocs sont inclus pour chaque type stratégique
export const TEMPLATE_BLOCKS: Record<string, string[]> = {
  EXECUTIVE_SUMMARY: ["kpi.revenue", "kpi.margin", "kpi.treasury", "kpi.backlog", "text.summary", "text.actions"],
  MONTHLY_DASHBOARD: [
    "kpi.revenue", "kpi.margin", "kpi.treasury", "kpi.backlog", "kpi.activeSites", "kpi.headcount",
    "chart.revenue_trend", "chart.cashflow", "chart.objectives",
    "table.top_sites", "table.subsidiaries", "text.summary",
  ],
  ANNUAL_GROUP: [
    "kpi.revenue", "kpi.margin", "kpi.headcount", "kpi.activeSites",
    "chart.revenue_trend", "chart.objectives",
    "table.top_sites", "table.subsidiaries", "text.summary", "text.actions",
  ],
  QUARTERLY_NOTE: ["kpi.revenue", "kpi.margin", "kpi.treasury", "chart.revenue_trend", "table.subsidiaries", "text.summary"],
  CUSTOM: [],
};
