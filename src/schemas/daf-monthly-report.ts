import { z } from "zod";

export const DAF_REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const STATUS_LABEL: Record<(typeof DAF_REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

export const createDafMonthlyReportSchema = z.object({
  period: z.string().min(1, "Mois de référence requis"),
  periodLabel: z.string().max(120).optional().nullable(),
});

export const updateDafMonthlyReportSchema = z.object({
  period: z.string().optional(),
  periodLabel: z.string().max(120).optional().nullable(),

  // 1) Performance financière
  revenueMonthXAF: z.coerce.string().optional(),
  revenueYtdXAF: z.coerce.string().optional(),
  revenueBudgetMonthXAF: z.coerce.string().optional(),
  expensesMonthXAF: z.coerce.string().optional(),
  grossMarginXAF: z.coerce.string().optional(),
  grossMarginPercent: z.coerce.number().min(-100).max(100).optional(),
  netMarginXAF: z.coerce.string().optional(),
  netMarginPercent: z.coerce.number().min(-100).max(100).optional(),
  ebitdaXAF: z.coerce.string().optional(),
  ebitdaPercent: z.coerce.number().min(-100).max(100).optional(),

  // 2) Trésorerie
  cashBalanceXAF: z.coerce.string().optional(),
  cashVariationXAF: z.coerce.string().optional(),
  creditLinesUsedXAF: z.coerce.string().optional(),
  creditLinesAvailableXAF: z.coerce.string().optional(),
  capacityAutofinancingXAF: z.coerce.string().optional(),

  // 3) Créances clients
  accountsReceivableXAF: z.coerce.string().optional(),
  overdueReceivablesXAF: z.coerce.string().optional(),
  doubtfulReceivablesXAF: z.coerce.string().optional(),
  dso: z.coerce.number().min(0).optional(),

  // 4) Dettes fournisseurs
  accountsPayableXAF: z.coerce.string().optional(),
  overduePayablesXAF: z.coerce.string().optional(),
  dpo: z.coerce.number().min(0).optional(),

  // 5) Structure financière
  workingCapitalNeedXAF: z.coerce.string().optional(),
  financialDebtLtXAF: z.coerce.string().optional(),
  financialDebtStXAF: z.coerce.string().optional(),
  gearingPercent: z.coerce.number().min(-1000).max(1000).optional(),
  capexMonthXAF: z.coerce.string().optional(),

  // 6) Paie
  payrollMassMonthXAF: z.coerce.string().optional(),
  payrollHeadcount: z.coerce.number().int().min(0).optional(),
  payrollVsRevenuePercent: z.coerce.number().min(0).max(1000).optional(),

  // 7) Fiscal
  vatCollectedXAF: z.coerce.string().optional(),
  vatDeductibleXAF: z.coerce.string().optional(),
  vatDueXAF: z.coerce.string().optional(),
  corporateTaxProvisionXAF: z.coerce.string().optional(),
  socialChargesUpToDate: z.coerce.boolean().optional(),
  fiscalDeadlinesNext30d: z.coerce.number().int().min(0).optional(),

  // Narratifs
  executiveSummary: z.string().max(6000).optional().nullable(),
  performanceAnalysis: z.string().max(6000).optional().nullable(),
  cashFlowAnalysis: z.string().max(6000).optional().nullable(),
  receivablesAnalysis: z.string().max(6000).optional().nullable(),
  payablesAnalysis: z.string().max(6000).optional().nullable(),
  fiscalAnalysis: z.string().max(6000).optional().nullable(),
  financialRisks: z.string().max(6000).optional().nullable(),
  financialDecisions: z.string().max(6000).optional().nullable(),
  recommendations: z.string().max(6000).optional().nullable(),
  nextMonthOutlook: z.string().max(6000).optional().nullable(),
});

export const rejectDafMonthlyReportSchema = z.object({
  reason: z.string().min(5).max(2000),
});

export type CreateDafMonthlyReportInput = z.infer<typeof createDafMonthlyReportSchema>;
export type UpdateDafMonthlyReportInput = z.infer<typeof updateDafMonthlyReportSchema>;
