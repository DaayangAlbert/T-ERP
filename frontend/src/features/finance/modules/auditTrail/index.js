export const auditTrailModule = {
  id: "audit_trail",
  label: "Historique complet",
  storeKey: "financeModules.auditTrail",
  description:
    "Trace les operations et modifications de tous les domaines pour fiabiliser les controles, l'audit et l'analyse causale.",
  sourceFeatures: ["finance", "payroll", "projects"],
  sourceEndpoints: ["derived"],
  sourceData: ["budgets", "expenses", "revenues", "invoices", "payments", "payrollRuns", "projectReports", "notifications", "cashMovements"],
  outputs: ["timeline", "entity_history", "change_feed", "audit_exports"],
  feeds: ["accounting_reporting", "budgeting", "treasury", "analytics_decision", "project_cost_control", "payment_delays_btp"],
  interactionPoints: [
    "historique des modifications",
    "preuve d'audit",
    "explication des ecarts",
    "suivi des corrections terrain",
  ],
};
