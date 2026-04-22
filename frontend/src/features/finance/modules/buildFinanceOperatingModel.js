import { buildFinanceAuditTrail } from "@/features/finance/modules/auditTrail/buildFinanceAuditTrail";
import { financeIntegrationFlows } from "@/features/finance/modules/integrationGraph";
import { financeModuleRegistry } from "@/features/finance/modules/registry";

function toNumber(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function sumBy(items = [], field = "amount") {
  return items.reduce((sum, item) => sum + toNumber(item?.[field]), 0);
}

function maxDate(values = []) {
  return values
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => right - left)[0] || null;
}

function buildDecisionSignals({
  dashboard = {},
  overdueInvoices = [],
  profitability = [],
  payrollRuns = [],
  budgets = [],
}) {
  const dashboardKpis = dashboard?.kpis || {};
  const atRiskProjects = profitability.filter((item) => toNumber(item.margin) < 0 || toNumber(item.budget_consumed_percent) > 85).length;
  const draftBudgets = budgets.filter((item) => item.status === "draft").length;
  const payrollAmount = sumBy(payrollRuns, "net_amount") || sumBy(payrollRuns, "total_net") || sumBy(payrollRuns, "net_to_pay");

  return [
    {
      id: "treasury_alert",
      label: "Tension de tresorerie",
      severity: toNumber(dashboardKpis.treasury_accounts_in_alert) > 0 ? "warning" : "info",
      value: toNumber(dashboardKpis.treasury_accounts_in_alert),
      unit: "compte(s)",
    },
    {
      id: "overdue_btp",
      label: "Retards de paiement BTP",
      severity: overdueInvoices.length > 0 ? "warning" : "info",
      value: overdueInvoices.length,
      unit: "facture(s)",
    },
    {
      id: "project_margin_risk",
      label: "Chantiers a risque",
      severity: atRiskProjects > 0 ? "warning" : "info",
      value: atRiskProjects,
      unit: "chantier(s)",
    },
    {
      id: "budget_revision",
      label: "Budgets a arbitrer",
      severity: draftBudgets > 0 ? "warning" : "info",
      value: draftBudgets,
      unit: "version(s)",
    },
    {
      id: "payroll_cash_need",
      label: "Besoin de cash paie",
      severity: payrollAmount > 0 ? "info" : "neutral",
      value: payrollAmount,
      unit: "XAF",
    },
  ];
}

function filterFlows(moduleId) {
  return financeIntegrationFlows.filter((flow) => flow.from === moduleId || flow.to === moduleId || flow.from === "all");
}

function buildModuleSnapshot(moduleId, context) {
  const {
    summary = {},
    dashboard = {},
    cashFlow = {},
    taxSummary = {},
    accounts = [],
    journals = [],
    treasuryAccounts = [],
    budgets = [],
    expenses = [],
    revenues = [],
    invoices = [],
    payments = [],
    projects = [],
    profitability = [],
    overdueInvoices = [],
    payrollEmployees = [],
    payrollRuns = [],
    payrollPeriods = [],
    leaveRequests = [],
    projectReports = [],
    historyEntries = [],
    decisionSignals = [],
  } = context;

  const totals = summary?.totals || {};
  const dashboardKpis = dashboard?.kpis || {};

  if (moduleId === "accounting_reporting") {
    return {
      counts: {
        accounts: accounts.length,
        journals: journals.length,
        entries: summary?.counts?.entries || 0,
      },
      kpis: {
        cashBalance: toNumber(dashboardKpis.cash_balance || totals.cash_balance),
        invoiced: toNumber(totals.invoiced),
        collected: toNumber(totals.collected),
        netVat: toNumber(taxSummary?.summary?.net_vat_payable),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "budgeting") {
    return {
      counts: {
        versions: budgets.length,
        drafts: budgets.filter((item) => item.status === "draft").length,
        projects: profitability.length,
      },
      kpis: {
        approvedAmount: sumBy(budgets.filter((item) => item.status === "approved"), "total_budget"),
        pendingAmount: sumBy(budgets.filter((item) => item.status === "draft"), "total_budget"),
        atRiskProjects: profitability.filter((item) => toNumber(item.budget_consumed_percent) > 85).length,
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "treasury") {
    const incoming = payments.filter((item) => item.payment_direction !== "outgoing");
    const outgoing = payments.filter((item) => item.payment_direction === "outgoing");
    return {
      counts: {
        accounts: treasuryAccounts.length,
        incomingPayments: incoming.length,
        outgoingPayments: outgoing.length,
      },
      kpis: {
        cashBalance: toNumber(dashboardKpis.cash_balance || totals.cash_balance),
        incomingAmount: sumBy(incoming, "amount"),
        outgoingAmount: sumBy(outgoing, "amount"),
        overdueReceivables: sumBy(overdueInvoices, "amount_due"),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "payroll_planning") {
    const payrollBase = payrollEmployees.reduce((sum, item) => sum + toNumber(item.base_salary), 0);
    return {
      counts: {
        employees: payrollEmployees.length,
        periods: payrollPeriods.length,
        runs: payrollRuns.length,
        leaveRequests: leaveRequests.length,
      },
      kpis: {
        monthlyBase: payrollBase,
        runAmount: sumBy(payrollRuns, "net_amount") || sumBy(payrollRuns, "total_net") || sumBy(payrollRuns, "net_to_pay"),
        pendingLeaves: leaveRequests.filter((item) => ["submitted", "in_review", "processing"].includes(item.status)).length,
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "analytics_decision") {
    return {
      counts: {
        signals: decisionSignals.length,
        alerts: (dashboard?.alerts || []).length,
      },
      kpis: {
        criticalSignals: decisionSignals.filter((item) => item.severity === "warning" || item.severity === "danger").length,
        margin: toNumber(totals.margin),
        outstanding: toNumber(totals.outstanding),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "audit_trail") {
    return {
      counts: {
        events: historyEntries.length,
        entities: new Set(historyEntries.map((item) => `${item.entityType}:${item.entityId}`)).size,
      },
      kpis: {
        latestEventAt: maxDate(historyEntries.map((item) => item.occurredAt)),
      },
      historyCount: historyEntries.length,
    };
  }

  if (moduleId === "project_cost_control") {
    return {
      counts: {
        projects: projects.length,
        profitabilityRows: profitability.length,
        reports: projectReports.length,
      },
      kpis: {
        expenses: sumBy(expenses, "amount"),
        revenues: sumBy(revenues, "amount"),
        margin: profitability.reduce((sum, item) => sum + toNumber(item.margin), 0),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "payment_delays_btp") {
    const overdueCount = overdueInvoices.length;
    return {
      counts: {
        invoices: invoices.length,
        overdueInvoices: overdueCount,
      },
      kpis: {
        outstanding: invoices.reduce((sum, item) => sum + toNumber(item.amount_due), 0),
        overdueAmount: sumBy(overdueInvoices, "amount_due"),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  if (moduleId === "site_reporting") {
    return {
      counts: {
        reports: projectReports.length,
        projects: new Set(projectReports.map((item) => item.project_id).filter(Boolean)).size,
      },
      kpis: {
        latestReportAt: maxDate(projectReports.map((item) => item.report_date || item.updated_at || item.created_at)),
        personnelReported: projectReports.reduce((sum, item) => sum + toNumber(item.personnel_present), 0),
      },
      historyCount: historyEntries.filter((item) => item.moduleId === moduleId).length,
    };
  }

  return {
    counts: {},
    kpis: {},
    historyCount: 0,
  };
}

export function buildFinanceOperatingModel({
  scopeLabel = "Tous les chantiers",
  summary = {},
  dashboard = {},
  cashFlow = {},
  taxSummary = {},
  accounts = [],
  journals = [],
  treasuryAccounts = [],
  budgets = [],
  expenses = [],
  revenues = [],
  invoices = [],
  payments = [],
  projects = [],
  profitability = [],
  overdueInvoices = [],
  notifications = [],
  payrollStatus = null,
  payrollEmployees = [],
  payrollRuns = [],
  payrollPeriods = [],
  leaveRequests = [],
  projectReports = [],
  changeOrders = [],
} = {}) {
  const historyEntries = buildFinanceAuditTrail({
    budgets,
    expenses,
    revenues,
    invoices,
    payments,
    payrollRuns,
    projectReports,
    notifications,
  });

  const decisionSignals = buildDecisionSignals({
    dashboard,
    overdueInvoices,
    profitability,
    payrollRuns,
    budgets,
  });

  const context = {
    scopeLabel,
    summary,
    dashboard,
    cashFlow,
    taxSummary,
    accounts,
    journals,
    treasuryAccounts,
    budgets,
    expenses,
    revenues,
    invoices,
    payments,
    projects,
    profitability,
    overdueInvoices,
    notifications,
    payrollStatus,
    payrollEmployees,
    payrollRuns,
    payrollPeriods,
    leaveRequests,
    projectReports,
    changeOrders,
    historyEntries,
    decisionSignals,
  };

  return {
    generatedAt: new Date().toISOString(),
    scopeLabel,
    modules: financeModuleRegistry.map((module) => ({
      ...module,
      snapshot: buildModuleSnapshot(module.id, context),
      relatedFlows: filterFlows(module.id),
    })),
    flows: financeIntegrationFlows,
    history: {
      totalEvents: historyEntries.length,
      latestEvents: historyEntries.slice(0, 20),
    },
    decisionSignals,
  };
}
