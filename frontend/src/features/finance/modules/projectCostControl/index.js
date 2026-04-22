export const projectCostControlModule = {
  id: "project_cost_control",
  label: "Gestion des chantiers",
  storeKey: "financeModules.projectCostControl",
  description:
    "Suit les couts main-d'oeuvre, materiel, sous-traitance, revenus, marge et derivees par chantier avec lien direct vers les finances.",
  sourceFeatures: ["projects", "finance", "payroll"],
  sourceEndpoints: ["/finance/reports/project-profitability", "/projects/:id/workspace", "/finance/expenses", "/finance/revenues", "/finance/invoices", "/payroll/runs"],
  sourceData: ["projects", "profitability", "expenses", "revenues", "invoices", "payments", "payrollRuns", "projectReports"],
  outputs: ["project_margin", "cost_breakdown", "labor_costs", "material_costs", "project_variances"],
  feeds: ["budgeting", "analytics_decision", "payment_delays_btp", "site_reporting", "audit_trail"],
  interactionPoints: [
    "revue chantier hebdomadaire",
    "marge par projet",
    "suivi cout reel vs budget",
    "remontee des couts terrain",
  ],
};
