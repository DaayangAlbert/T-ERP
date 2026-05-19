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
  // 1) Performance financière
  revenueMonthXAF: bigint;
  revenueYtdXAF: bigint;
  expensesMonthXAF: bigint;
  grossMarginXAF: bigint;
  grossMarginPercent: number;
  netMarginXAF: bigint;
  netMarginPercent: number;
  ebitdaXAF: bigint;
  ebitdaPercent: number;

  // 2) Trésorerie
  cashBalanceXAF: bigint;
  cashVariationXAF: bigint;
  creditLinesUsedXAF: bigint;
  creditLinesAvailableXAF: bigint;
  capacityAutofinancingXAF: bigint;

  // 3) Créances clients
  accountsReceivableXAF: bigint;
  overdueReceivablesXAF: bigint;
  doubtfulReceivablesXAF: bigint;
  dso: number;

  // 4) Dettes fournisseurs
  accountsPayableXAF: bigint;
  overduePayablesXAF: bigint;
  dpo: number;

  // 5) Structure financière
  workingCapitalNeedXAF: bigint;
  capexMonthXAF: bigint;

  // 6) Paie
  payrollMassMonthXAF: bigint;
  payrollHeadcount: number;
  payrollVsRevenuePercent: number;

  // 7) Fiscal
  vatCollectedXAF: bigint;
  vatDeductibleXAF: bigint;
  vatDueXAF: bigint;
  corporateTaxProvisionXAF: bigint;

  /** Liste des champs qui ont été remplis (pour feedback UI). */
  filledFields: string[];
  /** Sources consolidées (label tenant + nombre d'enregistrements). */
  sources: {
    tenantIds: string[];
    billings: number;
    invoices: number;
    payslips: number;
    banks: number;
    fixedAssets: number;
    previousMonthFound: boolean;
  };
}

/** Taux IS Cameroun (entreprise standard 2026). */
const CORPORATE_TAX_RATE = 0.30;
/** Seuil "créance douteuse" = échue depuis plus de 90 jours. */
const DOUBTFUL_RECEIVABLE_DAYS = 90;

export async function computeDafKpis(tenantId: string, period: Date): Promise<DafKpis> {
  const scopeIds = await resolveScope(tenantId);
  const periodStart = startOfMonth(period);
  const periodEnd = startOfNextMonth(period);
  const yearStart = startOfYear(period);
  const previousMonthStart = new Date(
    Date.UTC(period.getUTCFullYear(), period.getUTCMonth() - 1, 1),
  );
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - DOUBTFUL_RECEIVABLE_DAYS * 86_400_000);
  const monthLabel = `${periodStart.getUTCFullYear()}-${String(periodStart.getUTCMonth() + 1).padStart(2, "0")}`;

  // ── ProgressBilling : CA + TVA collectée ──────────────────────────────
  const billingsMonth = await prisma.progressBilling.findMany({
    where: { tenantId: { in: scopeIds }, period: monthLabel },
    select: { amountHt: true, vatAmount: true, status: true, netToReceive: true, dueDate: true, paidAmount: true },
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
    select: { netToReceive: true, paidAmount: true, dueDate: true, status: true },
  });

  const revenueMonthXAF = billingsMonth.reduce((s, b) => s + b.amountHt, 0n);
  const revenueYtdXAF = billingsYtd.reduce((s, b) => s + b.amountHt, 0n);
  const vatCollectedXAF = billingsMonth.reduce((s, b) => s + (b.vatAmount ?? 0n), 0n);
  const accountsReceivableXAF = allOpenBillings.reduce(
    (s, b) => s + b.netToReceive - (b.paidAmount ?? 0n),
    0n,
  );
  const overdueReceivablesXAF = allOpenBillings
    .filter((b) => b.dueDate < now)
    .reduce((s, b) => s + b.netToReceive - (b.paidAmount ?? 0n), 0n);
  // Créances douteuses = échues > 90j OU explicitement en litige (DISPUTED)
  const doubtfulReceivablesXAF = allOpenBillings
    .filter((b) => b.status === "DISPUTED" || b.dueDate < ninetyDaysAgo)
    .reduce((s, b) => s + b.netToReceive - (b.paidAmount ?? 0n), 0n);

  // ── SupplierInvoice : charges + dettes + TVA déductible ───────────────
  const invoicesMonth = await prisma.supplierInvoice.findMany({
    where: { tenantId: { in: scopeIds }, invoiceDate: { gte: periodStart, lt: periodEnd } },
    select: { amountHt: true, amountTtc: true, vatAmount: true, status: true },
  });
  const allOpenInvoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId: { in: scopeIds },
      status: { notIn: ["PAID", "REJECTED"] },
    },
    select: { amountTtc: true, dueDate: true },
  });

  const expensesMonthXAF = invoicesMonth.reduce((s, i) => s + i.amountHt, 0n);
  const vatDeductibleXAF = invoicesMonth.reduce((s, i) => s + (i.vatAmount ?? 0n), 0n);
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

  // ── Variation trésorerie depuis le rapport précédent ──────────────────
  const previousReport = await prisma.dafMonthlyFinancialReport.findFirst({
    where: { tenantId, period: previousMonthStart, status: { in: ["VALIDATED", "SUBMITTED"] } },
    select: { cashBalanceXAF: true },
  });
  const cashVariationXAF = previousReport
    ? cashBalanceXAF - previousReport.cashBalanceXAF
    : 0n;

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

  // ── FixedAsset : CAPEX du mois (acquisitions) ─────────────────────────
  const newAssets = await prisma.fixedAsset.findMany({
    where: {
      tenantId: { in: scopeIds },
      acquisitionDate: { gte: periodStart, lt: periodEnd },
    },
    select: { grossValue: true },
  });
  const capexMonthXAF = newAssets.reduce((s, a) => s + a.grossValue, 0n);

  // ── KPIs dérivés ──────────────────────────────────────────────────────
  const grossMarginXAF = revenueMonthXAF - expensesMonthXAF;
  const grossMarginPercent =
    revenueMonthXAF > 0n
      ? Number(((grossMarginXAF * 10000n) / revenueMonthXAF)) / 100
      : 0;
  // Marge nette = marge brute − masse salariale (approximation simplifiée)
  const netMarginXAF = grossMarginXAF - payrollMassMonthXAF;
  const netMarginPercent =
    revenueMonthXAF > 0n
      ? Number(((netMarginXAF * 10000n) / revenueMonthXAF)) / 100
      : 0;
  // EBITDA ≈ marge brute − masse salariale (sans amortissements/intérêts)
  const ebitdaXAF = netMarginXAF;
  const ebitdaPercent = netMarginPercent;
  // Capacité d'autofinancement ≈ marge nette (approximation simplifiée)
  const capacityAutofinancingXAF = netMarginXAF > 0n ? netMarginXAF : 0n;
  // BFR = encours clients − dettes fournisseurs (formule simplifiée, sans stocks)
  const workingCapitalNeedXAF = accountsReceivableXAF - accountsPayableXAF;
  // IS provisionné = taux IS × marge brute (approximation, > 0)
  const corporateTaxProvisionXAF =
    grossMarginXAF > 0n
      ? BigInt(Math.round(Number(grossMarginXAF) * CORPORATE_TAX_RATE))
      : 0n;
  // TVA due = max(0, collectée − déductible)
  const vatDueXAF =
    vatCollectedXAF > vatDeductibleXAF ? vatCollectedXAF - vatDeductibleXAF : 0n;

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
  if (grossMarginXAF !== 0n) filledFields.push("Marge brute");
  if (netMarginXAF !== 0n) filledFields.push("Marge nette / EBITDA");
  if (banks.length > 0) filledFields.push("Trésorerie");
  if (previousReport) filledFields.push("Variation trésorerie");
  if (capacityAutofinancingXAF > 0n) filledFields.push("CAF");
  if (accountsReceivableXAF > 0n) filledFields.push("Créances clients");
  if (overdueReceivablesXAF > 0n) filledFields.push("Créances échues");
  if (doubtfulReceivablesXAF > 0n) filledFields.push("Créances douteuses");
  if (accountsPayableXAF > 0n) filledFields.push("Dettes fournisseurs");
  if (overduePayablesXAF > 0n) filledFields.push("Dettes échues");
  if (workingCapitalNeedXAF !== 0n) filledFields.push("BFR");
  if (capexMonthXAF > 0n) filledFields.push("CAPEX");
  if (payrollMassMonthXAF > 0n) filledFields.push("Masse salariale");
  if (vatCollectedXAF > 0n) filledFields.push("TVA collectée");
  if (vatDeductibleXAF > 0n) filledFields.push("TVA déductible");
  if (vatDueXAF > 0n) filledFields.push("TVA due");
  if (corporateTaxProvisionXAF > 0n) filledFields.push("IS provisionné");

  return {
    revenueMonthXAF,
    revenueYtdXAF,
    expensesMonthXAF,
    grossMarginXAF,
    grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
    netMarginXAF,
    netMarginPercent: Math.round(netMarginPercent * 10) / 10,
    ebitdaXAF,
    ebitdaPercent: Math.round(ebitdaPercent * 10) / 10,

    cashBalanceXAF,
    cashVariationXAF,
    creditLinesUsedXAF,
    creditLinesAvailableXAF,
    capacityAutofinancingXAF,

    accountsReceivableXAF,
    overdueReceivablesXAF,
    doubtfulReceivablesXAF,
    dso: Math.round(dso * 10) / 10,

    accountsPayableXAF,
    overduePayablesXAF,
    dpo: Math.round(dpo * 10) / 10,

    workingCapitalNeedXAF,
    capexMonthXAF,

    payrollMassMonthXAF,
    payrollHeadcount,
    payrollVsRevenuePercent: Math.round(payrollVsRevenuePercent * 10) / 10,

    vatCollectedXAF,
    vatDeductibleXAF,
    vatDueXAF,
    corporateTaxProvisionXAF,

    filledFields,
    sources: {
      tenantIds: scopeIds,
      billings: billingsMonth.length,
      invoices: invoicesMonth.length,
      payslips: payslips.length,
      banks: banks.length,
      fixedAssets: newAssets.length,
      previousMonthFound: Boolean(previousReport),
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
