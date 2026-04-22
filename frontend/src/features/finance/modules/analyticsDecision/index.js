export const analyticsDecisionModule = {
  id: "analytics_decision",
  label: "Analyse financiere et decision",
  storeKey: "financeModules.analyticsDecision",
  description:
    "Agrège les signaux venant de tous les domaines pour produire les alertes, scenarios, arbitrages et recommandations de pilotage.",
  sourceFeatures: ["finance", "payroll", "projects"],
  sourceEndpoints: [
    "/finance/reports/dashboard",
    "/finance/reports/project-profitability",
    "/finance/reports/cash-flow",
    "/payroll/runs",
    "/projects/:id/workspace",
  ],
  sourceData: ["dashboard", "summary", "profitability", "cashFlow", "budgets", "payments", "projectReports", "payrollRuns"],
  outputs: ["decision_signals", "scenario_inputs", "risk_alerts", "steering_kpis"],
  feeds: ["all"],
  interactionPoints: [
    "comite de direction",
    "pilotage DAF",
    "priorisation des paiements",
    "reallocation budgetaire",
  ],
};
