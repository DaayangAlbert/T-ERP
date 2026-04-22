export const budgetingModule = {
  id: "budgeting",
  label: "Gestion budgetaire",
  storeKey: "financeModules.budgeting",
  description:
    "Suit les enveloppes, revisions, versions budgetaires, ecarts reel/previsionnel et arbitrages avec rattachement chantier et paie.",
  sourceFeatures: ["finance", "projects", "payroll"],
  sourceEndpoints: ["/finance/budgets", "/finance/reports/project-profitability", "/projects/:id/budgets", "/payroll/periods", "/payroll/runs"],
  sourceData: ["budgets", "profitability", "projectBudgets", "payrollRuns", "payrollPeriods", "siteReports"],
  outputs: ["budget_versions", "budget_variances", "forecast_landings", "salary_envelopes", "project_budget_alerts"],
  feeds: ["treasury", "analytics_decision", "project_cost_control", "site_reporting", "audit_trail"],
  interactionPoints: [
    "prevision mensuelle",
    "atterrissage budgetaire",
    "revision des couts paie",
    "ajustement budget chantier",
  ],
};
