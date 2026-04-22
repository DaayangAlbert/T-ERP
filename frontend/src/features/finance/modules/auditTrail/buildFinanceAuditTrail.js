function toNumber(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function sortByDateDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.occurredAt || 0).getTime();
    const rightTime = new Date(right.occurredAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function resolveAction(createdAt, updatedAt, fallbackAction) {
  if (createdAt && updatedAt) {
    const createdTime = new Date(createdAt).getTime();
    const updatedTime = new Date(updatedAt).getTime();
    if (Number.isFinite(createdTime) && Number.isFinite(updatedTime) && updatedTime - createdTime > 1000) {
      return "updated";
    }
  }
  return fallbackAction;
}

function normalizeEvent({
  moduleId,
  entityType,
  entityId,
  action,
  occurredAt,
  amount = 0,
  currency = "XAF",
  projectId = null,
  status = "",
  summary,
  origin = "finance",
}) {
  return {
    id: `${moduleId}:${entityType}:${entityId}:${action}:${occurredAt || "na"}`,
    moduleId,
    entityType,
    entityId,
    action,
    occurredAt,
    amount: toNumber(amount),
    currency,
    projectId,
    status,
    summary,
    origin,
  };
}

function normalizeBudgetEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "budgeting",
      entityType: "budget",
      entityId: item.id,
      action: resolveAction(item.created_at, item.updated_at, "budget_recorded"),
      occurredAt: item.updated_at || item.created_at || item.approved_at || item.created_on,
      amount: item.total_budget,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.status,
      summary: item.version_label || `Budget ${item.id}`,
    }),
  );
}

function normalizeExpenseEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "project_cost_control",
      entityType: "expense",
      entityId: item.id,
      action: resolveAction(item.created_at, item.updated_at, "expense_recorded"),
      occurredAt: item.updated_at || item.created_at || item.expense_date,
      amount: item.amount,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.approval_status || item.payment_status,
      summary: item.expense_number || item.category || `Depense ${item.id}`,
    }),
  );
}

function normalizeRevenueEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "project_cost_control",
      entityType: "revenue",
      entityId: item.id,
      action: resolveAction(item.created_at, item.updated_at, "revenue_recorded"),
      occurredAt: item.updated_at || item.created_at || item.revenue_date,
      amount: item.amount,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.collection_status,
      summary: item.revenue_number || item.revenue_type || `Recette ${item.id}`,
    }),
  );
}

function normalizeInvoiceEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "payment_delays_btp",
      entityType: "invoice",
      entityId: item.id,
      action: resolveAction(item.created_at, item.updated_at, "invoice_recorded"),
      occurredAt: item.updated_at || item.created_at || item.issued_on || item.due_on,
      amount: item.amount_total || item.amount_due,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.effective_status || item.status,
      summary: item.invoice_number || `Facture ${item.id}`,
    }),
  );
}

function normalizePaymentEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: item.payment_direction === "outgoing" ? "treasury" : "accounting_reporting",
      entityType: "payment",
      entityId: item.id,
      action: item.payment_direction === "outgoing" ? "cash_out" : "cash_in",
      occurredAt: item.payment_date || item.updated_at || item.created_at,
      amount: item.amount,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.payment_direction,
      summary: item.reference || item.label || `Paiement ${item.id}`,
    }),
  );
}

function normalizePayrollRunEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "payroll_planning",
      entityType: "payroll_run",
      entityId: item.id || item.reference,
      action: resolveAction(item.created_at, item.updated_at, "payroll_run"),
      occurredAt: item.updated_at || item.created_at || item.payment_date || item.period_end,
      amount: item.net_amount || item.total_net || item.total_amount || item.net_to_pay,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.status,
      summary: item.reference || item.run_reference || item.label || `Run paie ${item.id}`,
      origin: "payroll",
    }),
  );
}

function normalizeProjectReportEvents(items = []) {
  return items.map((item) =>
    normalizeEvent({
      moduleId: "site_reporting",
      entityType: "project_report",
      entityId: item.id,
      action: resolveAction(item.created_at, item.updated_at, "site_reported"),
      occurredAt: item.updated_at || item.created_at || item.report_date,
      amount: item.reported_cost || item.actual_cost || 0,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.report_type,
      summary: item.summary || item.activities_summary || `Rapport ${item.id}`,
      origin: "projects",
    }),
  );
}

function normalizeNotificationEvents(items = []) {
  return items.map((item, index) =>
    normalizeEvent({
      moduleId: "analytics_decision",
      entityType: "notification",
      entityId: item.id || index,
      action: "alert_emitted",
      occurredAt: item.updated_at || item.created_at || item.date || item.issued_at,
      amount: item.amount || item.value || 0,
      currency: item.currency || "XAF",
      projectId: item.project_id,
      status: item.level || item.code,
      summary: item.message || item.title || `Alerte ${index + 1}`,
    }),
  );
}

export function buildFinanceAuditTrail({
  budgets = [],
  expenses = [],
  revenues = [],
  invoices = [],
  payments = [],
  payrollRuns = [],
  projectReports = [],
  notifications = [],
} = {}) {
  return sortByDateDesc([
    ...normalizeBudgetEvents(budgets),
    ...normalizeExpenseEvents(expenses),
    ...normalizeRevenueEvents(revenues),
    ...normalizeInvoiceEvents(invoices),
    ...normalizePaymentEvents(payments),
    ...normalizePayrollRunEvents(payrollRuns),
    ...normalizeProjectReportEvents(projectReports),
    ...normalizeNotificationEvents(notifications),
  ]);
}
