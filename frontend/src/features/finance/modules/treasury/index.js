export const treasuryModule = {
  id: "treasury",
  label: "Tresorerie",
  storeKey: "financeModules.treasury",
  description:
    "Pilote les comptes de tresorerie, les disponibilites, les flux entrants et sortants, ainsi que le calendrier des encaissements et decaissements.",
  sourceFeatures: ["finance", "payroll"],
  sourceEndpoints: ["/finance/treasury-accounts", "/finance/payments", "/finance/reports/cash-flow", "/payroll/runs"],
  sourceData: ["treasuryAccounts", "payments", "cashFlow", "overdueInvoices", "expenses", "revenues", "payrollRuns"],
  outputs: ["cash_position", "cash_forecast", "payment_calendar", "liquidity_alerts"],
  feeds: ["accounting_reporting", "budgeting", "analytics_decision", "audit_trail", "payment_delays_btp"],
  interactionPoints: [
    "planification des reglements",
    "pilotage des encaissements clients",
    "integration des decaissements paie",
    "suivi de liquidite chantier",
  ],
};
