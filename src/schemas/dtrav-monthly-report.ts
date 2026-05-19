import { z } from "zod";

export const DTRAV_REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const STATUS_LABEL: Record<(typeof DTRAV_REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

export const createDtravMonthlyReportSchema = z.object({
  period: z.string().min(1),
  periodLabel: z.string().max(120).optional().nullable(),
});

export const updateDtravMonthlyReportSchema = z.object({
  period: z.string().optional(),
  periodLabel: z.string().max(120).optional().nullable(),

  revenueProducedXAF: z.coerce.string().optional(),
  revenueDeliveredXAF: z.coerce.string().optional(),
  marginPercent: z.coerce.number().min(-100).max(100).optional(),
  sitesDelivered: z.coerce.number().int().min(0).optional(),

  receivablesXAF: z.coerce.string().optional(),
  overdueReceivablesXAF: z.coerce.string().optional(),
  dso: z.coerce.number().int().min(0).optional(),
  decompteIssuedCount: z.coerce.number().int().min(0).optional(),
  decompteIssuedXAF: z.coerce.string().optional(),

  amendmentsCount: z.coerce.number().int().min(0).optional(),
  penaltiesAppliedXAF: z.coerce.string().optional(),
  litigationsOpen: z.coerce.number().int().min(0).optional(),

  cdtCount: z.coerce.number().int().min(0).optional(),
  cdtReportsValidated: z.coerce.number().int().min(0).optional(),
  cdtUnderperforming: z.coerce.number().int().min(0).optional(),

  workforceTotal: z.coerce.number().int().min(0).optional(),
  workforceOvertimeHours: z.coerce.number().min(0).optional(),
  workforceCostXAF: z.coerce.string().optional(),

  executiveSummary: z.string().max(6000).optional().nullable(),
  productionAnalysis: z.string().max(6000).optional().nullable(),
  collectionsAnalysis: z.string().max(6000).optional().nullable(),
  contractualSituation: z.string().max(6000).optional().nullable(),
  cdtPerformance: z.string().max(6000).optional().nullable(),
  workforceAnalysis: z.string().max(6000).optional().nullable(),
  majorIssues: z.string().max(6000).optional().nullable(),
  arbitragesRequested: z.string().max(6000).optional().nullable(),
  nextMonthStrategy: z.string().max(6000).optional().nullable(),
});

export const rejectDtravMonthlyReportSchema = z.object({
  reason: z.string().min(5).max(2000),
});
