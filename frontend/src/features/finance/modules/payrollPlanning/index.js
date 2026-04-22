export const payrollPlanningModule = {
  id: "payroll_planning",
  label: "Salaires et paie",
  storeKey: "financeModules.payrollPlanning",
  description:
    "Relie la masse salariale, les runs de paie, les absences et les charges sociales aux previsions budgetaires et a la tresorerie.",
  sourceFeatures: ["payroll", "finance", "projects"],
  sourceEndpoints: ["/payroll/status", "/payroll/employees", "/payroll/periods", "/payroll/runs", "/payroll/leave-requests"],
  sourceData: ["payrollStatus", "payrollEmployees", "payrollPeriods", "payrollRuns", "leaveRequests", "siteReports"],
  outputs: ["payroll_forecast", "payroll_actuals", "salary_cash_requirements", "absence_impacts"],
  feeds: ["budgeting", "treasury", "analytics_decision", "project_cost_control", "audit_trail"],
  interactionPoints: [
    "prevision de masse salariale",
    "cycle mensuel de paie",
    "impact budget chantier",
    "projection de tresorerie paie",
  ],
};
