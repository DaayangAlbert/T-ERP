import { z } from "zod";

export const CDT_REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const STATUS_LABEL: Record<(typeof CDT_REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

const siteSnapshotSchema = z.object({
  siteId: z.string().min(1),
  physicalProgressPercent: z.coerce.number().min(0).max(100),
  financialProgressPercent: z.coerce.number().min(0).max(100),
  valueProducedXAF: z.coerce.string(), // bigint as string
  avgWorkforce: z.coerce.number().int().min(0),
  hseIncidentsCount: z.coerce.number().int().min(0),
  milestonesAchieved: z.string().max(2000).optional().nullable(),
  milestonesAtRisk: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createWeeklyReportSchema = z.object({
  weekStart: z.string().min(1, "Début de semaine requis"),
  weekEnd: z.string().min(1, "Fin de semaine requise"),
  weekLabel: z.string().max(120).optional().nullable(),
});

export const updateWeeklyReportSchema = z.object({
  weekStart: z.string().optional(),
  weekEnd: z.string().optional(),
  weekLabel: z.string().max(120).optional().nullable(),
  workingDays: z.coerce.number().int().min(0).max(7).optional(),
  weatherDays: z.coerce.number().int().min(0).max(7).optional(),
  subcontractorsPresent: z.coerce.number().int().min(0).optional(),
  globalSummary: z.string().max(4000).optional().nullable(),
  keyAchievements: z.string().max(4000).optional().nullable(),
  transverseIssues: z.string().max(4000).optional().nullable(),
  scheduleSlippages: z.string().max(4000).optional().nullable(),
  arbitrationsNeeded: z.string().max(4000).optional().nullable(),
  nextWeekPlan: z.string().max(4000).optional().nullable(),
  sites: z.array(siteSnapshotSchema).optional(),
});

export const rejectWeeklyReportSchema = z.object({
  reason: z.string().min(5, "Motif requis (min 5 caractères)").max(2000),
});

export type CreateWeeklyReportInput = z.infer<typeof createWeeklyReportSchema>;
export type UpdateWeeklyReportInput = z.infer<typeof updateWeeklyReportSchema>;
export type SiteSnapshotInput = z.infer<typeof siteSnapshotSchema>;
