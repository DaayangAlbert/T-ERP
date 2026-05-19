/**
 * Service de pré-remplissage des KPIs des rapports mensuels DAF/DT
 * depuis les sources de données réelles (ProgressBilling, SupplierInvoice,
 * BankAccount, Payslip, Site, HseIncidentReport).
 *
 * Particularité multi-tenant : si le tenant est une holding (parentId null
 * ET qu'il a des enfants), les KPIs consolident la holding + ses filiales.
 * Sinon ils ne prennent que le tenant lui-même.
 */
import { prisma } from "@/lib/prisma";

/** Renvoie [holdingId, ...childIds] si le tenant est une holding, sinon [tenantId]. */
async function resolveScope(tenantId: string): Promise<string[]> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, parentId: true, children: { select: { id: true } } },
  });
  if (!t) return [tenantId];
  if (t.parentId !== null) return [t.id]; // c'est une filiale → scope local
  if (t.children.length === 0) return [t.id]; // holding sans enfants → local
  return [t.id, ...t.children.map((c) => c.id)];
}

function startOfMonth(period: Date): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), 1));
}
function startOfNextMonth(period: Date): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
}
function startOfYear(period: Date): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), 0, 1));
}
function daysInMonth(period: Date): number {
  return new Date(period.getUTCFullYear(), period.getUTCMonth() + 1, 0).getUTCDate();
}

export interface DafKpis {
  revenueMonthXAF: bigint;
  revenueYtdXAF: bigint;
  expensesMonthXAF: bigint;
  grossMarginXAF: bigint;
  grossMarginPercent: number;

  cashBalanceXAF: bigint;
  creditLinesUsedXAF: bigint;
  creditLinesAvailableXAF: bigint;

  accountsReceivableXAF: bigint;
  overdueReceivablesXAF: bigint;
  dso: number;

  accountsPayableXAF: bigint;
  overduePayablesXAF: bigint;
  dpo: number;

  payrollMassMonthXAF: bigint;
  payrollHeadcount: number;
  payrollVsRevenuePercent: number;

  /** Liste des champs qui ont été remplis (pour feedback UI). */
  filledFields: string[];
  /** Sources consolidées (label tenant + nombre d'enregistrements). */
  sources: { tenantIds: string[]; billings: number; invoices: number; payslips: number; banks: number };
}

export async function computeDafKpis(tenantId: string, period: Date): Promise<DafKpis> {
  const scopeIds = await resolveScope(tenantId);
  const periodStart = startOfMonth(period);
  const periodEnd = startOfNextMonth(period);
  const yearStart = startOfYear(period);
  const now = new Date();
  const monthLabel = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;

  // ── ProgressBilling : CA produit (côté client) ─────────────────────────
  const billingsMonth = await prisma.progressBilling.findMany({
    where: { tenantId: { in: scopeIds }, period: monthLabel },
    select: { amountHt: true, status: true, netToReceive: true, dueDate: true, paidAmount: true },
  });
  const billingsYtd = await prisma.progressBilling.findMany({
    where: {
      tenantId: { in: scopeIds },
      createdAt: { gte: yearStart, lt: periodEnd },
    },
    select: { amountHt: true },
  });
  const allOpenBillings = await prisma.progressBilling.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: { notIn: ["PAID"] },
    },
    select: { netToReceive: true, paidAmount: true, dueDate: true },
  });

  const revenueMonthXAF = billingsMonth.reduce((s, b) => s + b.amountHt, 0n);
  const revenueYtdXAF = billingsYtd.reduce((s, b) => s + b.amountHt, 0n);
  const accountsReceivableXAF = allOpenBillings.reduce(
    (s, b) => s + b.netToReceive - (b.paidAmount ?? 0n),
    0n,
  );
  const overdueReceivablesXAF = allOpenBillings
    .filter((b) => b.dueDate < now)
    .reduce((s, b) => s + b.netToReceive - (b.paidAmount ?? 0n), 0n);

  // ── SupplierInvoice : charges + dettes fournisseurs ───────────────────
  const invoicesMonth = await prisma.supplierInvoice.findMany({
    where: { tenantId: { in: scopeIds }, invoiceDate: { gte: periodStart, lt: periodEnd } },
    select: { amountHt: true, amountTtc: true, status: true },
  });
  const allOpenInvoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: { notIn: ["PAID", "REJECTED"] },
    },
    select: { amountTtc: true, dueDate: true },
  });

  const expensesMonthXAF = invoicesMonth.reduce((s, i) => s + i.amountHt, 0n);
  const accountsPayableXAF = allOpenInvoices.reduce((s, i) => s + i.amountTtc, 0n);
  const overduePayablesXAF = allOpenInvoices
    .filter((i) => i.dueDate < now)
    .reduce((s, i) => s + i.amountTtc, 0n);

  // ── BankAccount : trésorerie + lignes de crédit ───────────────────────
  const banks = await prisma.bankAccount.findMany({
    where: { tenantId: { in: scopeIds } },
    select: { balance: true, creditLineGranted: true, creditLineUsed: true },
  });
  const cashBalanceXAF = banks.reduce((s, b) => s + b.balance, 0n);
  const creditLinesUsedXAF = banks.reduce((s, b) => s + b.creditLineUsed, 0n);
  const creditLinesAvailableXAF = banks.reduce(
    (s, b) => s + (b.creditLineGranted - b.creditLineUsed),
    0n,
  );

  // ── Payslip : masse salariale + effectifs ─────────────────────────────
  const payslips = await prisma.payslip.findMany({
    where: { tenantId: { in: scopeIds }, period: { gte: periodStart, lt: periodEnd } },
    select: { userId: true, grossAmount: true, employerCharges: true },
  });
  const payrollMassMonthXAF = payslips.reduce(
    (s, p) => s + p.grossAmount + p.employerCharges,
    0n,
  );
  const payrollHeadcount = new Set(payslips.map((p) => p.userId)).size;

  // ── KPIs dérivés ──────────────────────────────────────────────────────
  const grossMarginXAF = revenueMonthXAF - expensesMonthXAF;
  const grossMarginPercent =
    revenueMonthXAF > 0n
      ? Number(((grossMarginXAF * 10000n) / revenueMonthXAF)) / 100
      : 0;
  const dim = daysInMonth(period);
  const dso =
    revenueMonthXAF > 0n
      ? (Number(accountsReceivableXAF) / Number(revenueMonthXAF)) * dim
      : 0;
  const dpo =
    expensesMonthXAF > 0n
      ? (Number(accountsPayableXAF) / Number(expensesMonthXAF)) * dim
      : 0;
  const payrollVsRevenuePercent =
    revenueMonthXAF > 0n
      ? Number((payrollMassMonthXAF * 10000n) / revenueMonthXAF) / 100
      : 0;

  const filledFields: string[] = [];
  if (revenueMonthXAF > 0n) filledFields.push("CA mois");
  if (revenueYtdXAF > 0n) filledFields.push("CA YTD");
  if (expensesMonthXAF > 0n) filledFields.push("Charges mois");
  if (cashBalanceXAF > 0n || banks.length > 0) filledFields.push("Trésorerie");
  if (accountsReceivableXAF > 0n) filledFields.push("Créances clients");
  if (overdueReceivablesXAF > 0n) filledFields.push("Créances échues");
  if (accountsPayableXAF > 0n) filledFields.push("Dettes fournisseurs");
  if (overduePayablesXAF > 0n) filledFields.push("Dettes échues");
  if (payrollMassMonthXAF > 0n) filledFields.push("Masse salariale");

  return {
    revenueMonthXAF,
    revenueYtdXAF,
    expensesMonthXAF,
    grossMarginXAF,
    grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,

    cashBalanceXAF,
    creditLinesUsedXAF,
    creditLinesAvailableXAF,

    accountsReceivableXAF,
    overdueReceivablesXAF,
    dso: Math.round(dso * 10) / 10,

    accountsPayableXAF,
    overduePayablesXAF,
    dpo: Math.round(dpo * 10) / 10,

    payrollMassMonthXAF,
    payrollHeadcount,
    payrollVsRevenuePercent: Math.round(payrollVsRevenuePercent * 10) / 10,

    filledFields,
    sources: {
      tenantIds: scopeIds,
      billings: billingsMonth.length,
      invoices: invoicesMonth.length,
      payslips: payslips.length,
      banks: banks.length,
    },
  };
}

export interface DtKpis {
  sitesActiveCount: number;
  sitesCompletedCount: number;
  sitesAtRiskCount: number;
  avgPhysicalProgress: number;
  avgFinancialProgress: number;
  totalRevenueXAF: bigint;
  totalSpentXAF: bigint;
  portfolioMarginPercent: number;
  hseTotalIncidents: number;
  hseNcOpen: number;

  filledFields: string[];
  sources: { tenantIds: string[]; sites: number; billings: number; incidents: number };
}

export async function computeDtKpis(tenantId: string, period: Date): Promise<DtKpis> {
  const scopeIds = await resolveScope(tenantId);
  const periodStart = startOfMonth(period);
  const periodEnd = startOfNextMonth(period);
  const monthLabel = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;

  const sites = await prisma.site.findMany({
    where: { tenantId: { in: scopeIds } },
    select: {
      id: true,
      status: true,
      progress: true,
      physicalProgress: true,
      financialProgress: true,
      margin: true,
      marginTarget: true,
      actualEndDate: true,
      budget: true,
      actualSpentAmount: true,
    },
  });

  const activeSites = sites.filter((s) => s.status === "ACTIVE");
  const completedThisMonth = sites.filter(
    (s) =>
      s.status === "COMPLETED" &&
      s.actualEndDate &&
      s.actualEndDate >= periodStart &&
      s.actualEndDate < periodEnd,
  );
  const sitesAtRisk = activeSites.filter(
    (s) =>
      s.margin < (s.marginTarget ?? 0) - 5 ||
      (s.physicalProgress ?? s.progress) < 30,
  );

  const avgPhysicalProgress =
    activeSites.length > 0
      ? activeSites.reduce((s, x) => s + (x.physicalProgress ?? x.progress ?? 0), 0) /
        activeSites.length
      : 0;
  const avgFinancialProgress =
    activeSites.length > 0
      ? activeSites.reduce((s, x) => s + (x.financialProgress ?? 0), 0) / activeSites.length
      : 0;
  const portfolioMarginPercent =
    activeSites.length > 0
      ? activeSites.reduce((s, x) => s + (x.margin ?? 0), 0) / activeSites.length
      : 0;

  // CA portefeuille du mois = SUM(ProgressBilling) sur les sites des tenants scope
  const billings = await prisma.progressBilling.findMany({
    where: { tenantId: { in: scopeIds }, period: monthLabel },
    select: { amountHt: true },
  });
  const totalRevenueXAF = billings.reduce((s, b) => s + b.amountHt, 0n);

  // Coût total = somme dépenses chantiers depuis Site.actualSpentAmount (snapshot global)
  const totalSpentXAF = sites.reduce((s, x) => s + (x.actualSpentAmount ?? 0n), 0n);

  const incidents = await prisma.hseIncidentReport.findMany({
    where: {
      tenantId: { in: scopeIds },
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    select: { status: true },
  });
  const hseTotalIncidents = incidents.length;
  const hseNcOpen = incidents.filter((i) => i.status !== "CLOSED").length;

  const filledFields: string[] = [];
  if (activeSites.length > 0) {
    filledFields.push(
      "Chantiers actifs",
      "Avancement physique moyen",
      "Marge portefeuille",
    );
  }
  if (completedThisMonth.length > 0) filledFields.push("Chantiers terminés");
  if (sitesAtRisk.length > 0) filledFields.push("Chantiers à risque");
  if (totalRevenueXAF > 0n) filledFields.push("CA portefeuille");
  if (hseTotalIncidents > 0) filledFields.push("Incidents HSE");

  return {
    sitesActiveCount: activeSites.length,
    sitesCompletedCount: completedThisMonth.length,
    sitesAtRiskCount: sitesAtRisk.length,
    avgPhysicalProgress: Math.round(avgPhysicalProgress * 10) / 10,
    avgFinancialProgress: Math.round(avgFinancialProgress * 10) / 10,
    totalRevenueXAF,
    totalSpentXAF,
    portfolioMarginPercent: Math.round(portfolioMarginPercent * 10) / 10,
    hseTotalIncidents,
    hseNcOpen,

    filledFields,
    sources: {
      tenantIds: scopeIds,
      sites: sites.length,
      billings: billings.length,
      incidents: incidents.length,
    },
  };
}
