export const accountingReportingModule = {
  id: "accounting_reporting",
  label: "Comptabilite et reporting",
  storeKey: "financeModules.accountingReporting",
  description:
    "Centralise les comptes, journaux, ecritures, etats financiers et tableaux de flux pour produire la vision comptable officielle.",
  sourceFeatures: ["finance"],
  sourceEndpoints: [
    "/finance/accounts",
    "/finance/journals",
    "/finance/summary",
    "/finance/reports/cash-flow",
    "/finance/reports/tax-summary",
  ],
  sourceData: ["accounts", "journals", "summary", "cashFlow", "taxSummary", "payments", "revenues", "expenses", "invoices"],
  outputs: ["journal_general", "balance", "etat_resultat", "flux_tresorerie", "position_fiscale"],
  feeds: ["budgeting", "treasury", "analytics_decision", "audit_trail", "project_cost_control"],
  interactionPoints: [
    "cloture comptable mensuelle",
    "generation des etats financiers",
    "rapprochement avec la tresorerie",
    "revision des ecritures de chantier",
  ],
};
