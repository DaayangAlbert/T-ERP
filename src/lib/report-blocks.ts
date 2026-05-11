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
  // DAF Bloc 3 / fn 3.2 — Blocs financiers DAF
  { key: "kpi.dso", label: "DSO (jours)", category: "KPI", description: "Délai moyen d'encaissement clients" },
  { key: "kpi.bfr", label: "BFR", category: "KPI", description: "Besoin en fonds de roulement" },
  { key: "kpi.netResult", label: "Résultat net YTD", category: "KPI", description: "Cumul depuis le 1er janvier" },
  { key: "kpi.payrollMass", label: "Masse salariale chargée", category: "KPI", description: "Total mensuel" },
  { key: "chart.banks", label: "Soldes bancaires multi-banques", category: "CHART", description: "Histogramme par banque" },
  { key: "chart.aging_balance", label: "Balance âgée", category: "CHART", description: "Créances par tranche d'âge" },
  { key: "table.pnl", label: "Compte de résultat", category: "TABLE", description: "P&L synthétique du mois" },
  { key: "table.balance", label: "Bilan synthétique", category: "TABLE", description: "Actif/passif au format DAF" },
  { key: "table.tax_deadlines", label: "Échéances fiscales", category: "TABLE", description: "Calendrier DGI/CNPS" },
  // RH Bloc 2 / fn 2.2 — Blocs RH
  { key: "kpi.totalHeadcount", label: "Effectif total", category: "KPI", description: "Tous statuts confondus" },
  { key: "kpi.turnover", label: "Taux de turnover", category: "KPI", description: "Départs / effectif moyen" },
  { key: "kpi.absenteeism", label: "Taux d'absentéisme", category: "KPI", description: "Jours d'absence / théoriques" },
  { key: "kpi.genderRatio", label: "Ratio femmes / hommes", category: "KPI", description: "Effectif F / H total" },
  { key: "chart.headcount_trend", label: "Évolution des effectifs", category: "CHART", description: "12 mois glissants" },
  { key: "chart.category_breakdown", label: "Répartition par catégorie", category: "CHART", description: "Cadres / ETAM / OQ / OS / Journaliers" },
  { key: "chart.recruitment_funnel", label: "Entonnoir recrutement", category: "CHART", description: "Reçues → Embauchées" },
  { key: "table.pending_leaves", label: "Demandes de congés en attente", category: "TABLE", description: "Filtrées N1 RH" },
  { key: "table.expiring_certs", label: "Certifications expirant 60j", category: "TABLE", description: "Recyclages à programmer" },
  { key: "table.disciplinary_active", label: "Procédures disciplinaires actives", category: "TABLE", description: "Toutes étapes" },
];

export const REPORT_TYPE_LABEL: Record<string, string> = {
  EXECUTIVE_SUMMARY: "Synthèse exécutive",
  MONTHLY_DASHBOARD: "Tableau de bord mensuel",
  ANNUAL_GROUP: "Bilan annuel groupe",
  QUARTERLY_NOTE: "Note trimestrielle",
  CUSTOM: "Sur-mesure",
  DAF_TREASURY_WEEKLY: "Tréso hebdo DAF",
  DAF_FINANCIAL_MONTHLY: "Synthèse financière DAF",
  DAF_BANKING_QUARTERLY: "Reporting bancaire DAF",
  DAF_CAC_QUARTERLY: "Reporting CAC",
  DAF_DSF_PREP: "Préparation DSF",
  RH_MONTHLY: "Rapport mensuel RH",
  RH_SOCIAL_ANNUAL: "Bilan social annuel",
  RH_GENDER_EQUALITY: "Rapport égalité H/F",
  RH_WEEKLY_DASHBOARD: "TDB RH hebdomadaire",
  RH_RECRUITMENT_QUARTERLY: "Stats recrutement T",
  RH_SOCIAL_INDICATORS: "Indicateurs sociaux",
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
  DAF_TREASURY_WEEKLY: ["kpi.treasury", "kpi.dso", "kpi.bfr", "chart.banks", "chart.cashflow", "text.summary"],
  DAF_FINANCIAL_MONTHLY: ["kpi.revenue", "kpi.netResult", "kpi.bfr", "kpi.treasury", "table.pnl", "chart.cashflow", "text.summary"],
  DAF_BANKING_QUARTERLY: ["kpi.treasury", "kpi.bfr", "chart.banks", "table.balance", "table.pnl", "text.summary"],
  DAF_CAC_QUARTERLY: ["kpi.revenue", "kpi.netResult", "table.pnl", "table.balance", "table.tax_deadlines", "text.summary", "text.actions"],
  DAF_DSF_PREP: ["table.pnl", "table.balance", "kpi.payrollMass", "table.tax_deadlines", "text.summary"],
  RH_MONTHLY: ["kpi.totalHeadcount", "kpi.turnover", "kpi.absenteeism", "chart.headcount_trend", "table.pending_leaves", "text.summary"],
  RH_SOCIAL_ANNUAL: ["kpi.totalHeadcount", "kpi.payrollMass", "kpi.turnover", "kpi.absenteeism", "chart.category_breakdown", "chart.headcount_trend", "text.summary", "text.actions"],
  RH_GENDER_EQUALITY: ["kpi.totalHeadcount", "kpi.genderRatio", "chart.category_breakdown", "text.summary", "text.actions"],
  RH_WEEKLY_DASHBOARD: ["kpi.totalHeadcount", "kpi.absenteeism", "table.pending_leaves", "table.expiring_certs", "text.summary"],
  RH_RECRUITMENT_QUARTERLY: ["chart.recruitment_funnel", "kpi.totalHeadcount", "text.summary"],
  RH_SOCIAL_INDICATORS: ["kpi.turnover", "kpi.absenteeism", "kpi.genderRatio", "chart.category_breakdown", "table.disciplinary_active", "text.summary"],
};
