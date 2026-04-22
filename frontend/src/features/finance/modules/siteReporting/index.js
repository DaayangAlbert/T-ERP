export const siteReportingModule = {
  id: "site_reporting",
  label: "Reporting de chantier",
  storeKey: "financeModules.siteReporting",
  description:
    "Collecte les remontees terrain, incidents, personnel present, production et couts constates pour ajuster budget, marge et cash.",
  sourceFeatures: ["projects", "finance", "payroll"],
  sourceEndpoints: ["/projects/:id/reports", "/projects/:id/workspace", "/finance/expenses", "/payroll/leave-requests"],
  sourceData: ["projectReports", "expenses", "payrollRuns", "leaveRequests", "projects"],
  outputs: ["field_cost_feedback", "incident_cost_signals", "labor_presence", "project_adjustment_requests"],
  feeds: ["project_cost_control", "budgeting", "analytics_decision", "audit_trail"],
  interactionPoints: [
    "rapport journalier chantier",
    "ajustement des couts terrain",
    "reevaluation du budget",
    "boucle de retour vers la DAF",
  ],
};
