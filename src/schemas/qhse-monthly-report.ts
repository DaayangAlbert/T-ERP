import { z } from "zod";

export const QHSE_REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const STATUS_LABEL: Record<(typeof QHSE_REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

export const createQhseMonthlyReportSchema = z.object({
  period: z.string().min(1),
  periodLabel: z.string().max(120).optional().nullable(),
});

export const updateQhseMonthlyReportSchema = z.object({
  period: z.string().optional(),
  periodLabel: z.string().max(120).optional().nullable(),

  totalHoursWorked: z.coerce.string().optional(),
  totalIncidents: z.coerce.number().int().min(0).optional(),
  lostTimeIncidents: z.coerce.number().int().min(0).optional(),
  noLostTimeIncidents: z.coerce.number().int().min(0).optional(),
  daysLost: z.coerce.number().int().min(0).optional(),
  tf1: z.coerce.number().min(0).optional(),
  tg: z.coerce.number().min(0).optional(),
  daysWithoutAccident: z.coerce.number().int().min(0).optional(),

  cutsCount: z.coerce.number().int().min(0).optional(),
  fallsCount: z.coerce.number().int().min(0).optional(),
  electricalCount: z.coerce.number().int().min(0).optional(),
  chemicalCount: z.coerce.number().int().min(0).optional(),
  vehiclesCount: z.coerce.number().int().min(0).optional(),
  otherCount: z.coerce.number().int().min(0).optional(),

  internalAudits: z.coerce.number().int().min(0).optional(),
  externalAudits: z.coerce.number().int().min(0).optional(),
  inspectionsCount: z.coerce.number().int().min(0).optional(),
  observationsCount: z.coerce.number().int().min(0).optional(),

  ncOpened: z.coerce.number().int().min(0).optional(),
  ncClosed: z.coerce.number().int().min(0).optional(),
  ncCritical: z.coerce.number().int().min(0).optional(),
  ncOverdue: z.coerce.number().int().min(0).optional(),

  safetyTrainings: z.coerce.number().int().min(0).optional(),
  trainingHours: z.coerce.number().min(0).optional(),
  personsTrained: z.coerce.number().int().min(0).optional(),

  epiDistributed: z.coerce.number().int().min(0).optional(),
  epiCheckCompliance: z.coerce.number().min(0).max(100).optional(),

  executiveSummary: z.string().max(6000).optional().nullable(),
  incidentsAnalysis: z.string().max(6000).optional().nullable(),
  auditFindings: z.string().max(6000).optional().nullable(),
  ncAnalysis: z.string().max(6000).optional().nullable(),
  trainingsAnalysis: z.string().max(6000).optional().nullable(),
  epiAnalysis: z.string().max(6000).optional().nullable(),
  actionPlans: z.string().max(6000).optional().nullable(),
  trendsAnalysis: z.string().max(6000).optional().nullable(),
  chsctRecommendations: z.string().max(6000).optional().nullable(),
});

export const rejectQhseMonthlyReportSchema = z.object({
  reason: z.string().min(5).max(2000),
});
