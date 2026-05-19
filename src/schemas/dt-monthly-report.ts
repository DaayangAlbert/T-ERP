import { z } from "zod";

export const DT_REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const STATUS_LABEL: Record<(typeof DT_REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const siteSnapshotSchema = z.object({
  siteId: z.string().min(1),
  physicalProgressPercent: z.coerce.number().min(0).max(100),
  financialProgressPercent: z.coerce.number().min(0).max(100),
  marginPercent: z.coerce.number().min(-100).max(100),
  revenueMonthXAF: z.coerce.string(),
  hseIncidentsCount: z.coerce.number().int().min(0),
  ncOpenCount: z.coerce.number().int().min(0),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createMonthlyReportSchema = z.object({
  period: z.string().min(1, "Mois de référence requis"),
  periodLabel: z.string().max(120).optional().nullable(),
});

export const updateMonthlyReportSchema = z.object({
  period: z.string().optional(),
  periodLabel: z.string().max(120).optional().nullable(),
  sitesActiveCount: z.coerce.number().int().min(0).optional(),
  sitesCompletedCount: z.coerce.number().int().min(0).optional(),
  sitesAtRiskCount: z.coerce.number().int().min(0).optional(),
  avgPhysicalProgress: z.coerce.number().min(0).max(100).optional(),
  avgFinancialProgress: z.coerce.number().min(0).max(100).optional(),
  totalRevenueXAF: z.coerce.string().optional(),
  totalSpentXAF: z.coerce.string().optional(),
  portfolioMarginPercent: z.coerce.number().min(-100).max(100).optional(),
  hseTotalIncidents: z.coerce.number().int().min(0).optional(),
  hseTf1: z.coerce.number().min(0).optional(),
  hseAuditsConducted: z.coerce.number().int().min(0).optional(),
  hseNcOpen: z.coerce.number().int().min(0).optional(),
  subcontractorsActive: z.coerce.number().int().min(0).optional(),
  subcontractorsAtRisk: z.coerce.number().int().min(0).optional(),
  executiveSummary: z.string().max(6000).optional().nullable(),
  financialAnalysis: z.string().max(6000).optional().nullable(),
  qhseAnalysis: z.string().max(6000).optional().nullable(),
  subcontractingAnalysis: z.string().max(6000).optional().nullable(),
  majorRisks: z.string().max(6000).optional().nullable(),
  technicalDecisions: z.string().max(6000).optional().nullable(),
  recommendations: z.string().max(6000).optional().nullable(),
  nextMonthOutlook: z.string().max(6000).optional().nullable(),
  sites: z.array(siteSnapshotSchema).optional(),
});

export const rejectMonthlyReportSchema = z.object({
  reason: z.string().min(5).max(2000),
});

export type CreateMonthlyReportInput = z.infer<typeof createMonthlyReportSchema>;
export type UpdateMonthlyReportInput = z.infer<typeof updateMonthlyReportSchema>;
export type DtSiteSnapshotInput = z.infer<typeof siteSnapshotSchema>;
