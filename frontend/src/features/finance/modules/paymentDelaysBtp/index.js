export const paymentDelaysBtpModule = {
  id: "payment_delays_btp",
  label: "Suivi des delais de paiement BTP",
  storeKey: "financeModules.paymentDelaysBtp",
  description:
    "Gere les echeanciers BTP, les retards clients, les delais fournisseurs, les relances, decomptes et effets de paiement sur la tresorerie.",
  sourceFeatures: ["finance", "projects"],
  sourceEndpoints: ["/finance/invoices", "/finance/reports/overdue-invoices", "/projects/:id/workspace"],
  sourceData: ["invoices", "payments", "overdueInvoices", "changeOrders", "projectReports", "notifications"],
  outputs: ["aging_balance", "delay_watchlist", "recovery_plan", "btp_payment_calendar"],
  feeds: ["treasury", "analytics_decision", "project_cost_control", "audit_trail"],
  interactionPoints: [
    "relance client",
    "planning des decomptes",
    "projection d'encaissement chantier",
    "priorisation des paiements fournisseurs",
  ],
};
