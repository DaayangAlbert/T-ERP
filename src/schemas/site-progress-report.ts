import { z } from "zod";

/**
 * Schemas Zod du wizard "Rapport d'avancement chantier" (5 étapes).
 *
 * Étape 1 — Période & contexte (type, période, % avancement physique)
 * Étape 2 — Réalisations & retards (achievements, delays, photos)
 * Étape 3 — Financier & RH (valeur produite, effectif, heures sup, facturation)
 * Étape 4 — HSE & blocages (incidents, jours sans accident, issues, support)
 * Étape 5 — Pièces jointes & priorités (documentIds, priorités prochaine période)
 */

export const REPORT_TYPE = ["WEEKLY", "MONTHLY", "AD_HOC"] as const;
export const REPORT_STATUS = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"] as const;

export const REPORT_TYPE_LABEL: Record<(typeof REPORT_TYPE)[number], string> = {
  WEEKLY: "Hebdomadaire",
  MONTHLY: "Mensuel",
  AD_HOC: "Ad hoc",
};

export const REPORT_STATUS_LABEL: Record<(typeof REPORT_STATUS)[number], string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  REJECTED: "Refusé",
};

// ------------ Étape 1 ------------
export const reportStep1Schema = z.object({
  siteId: z.string().min(1, "Chantier requis"),
  reportType: z.enum(REPORT_TYPE),
  period: z.string().min(1, "Période requise"), // ISO date string
  periodLabel: z.string().max(80).optional().nullable(),
  physicalProgressPercent: z.coerce.number().min(0).max(100),
  previousProgressPercent: z.coerce.number().min(0).max(100).optional().nullable(),
});

// ------------ Étape 2 ------------
export const reportStep2Schema = z.object({
  mainAchievements: z.string().max(4000).optional().nullable(),
  delaysIdentified: z.string().max(4000).optional().nullable(),
  photos: z.array(z.string().url().or(z.string().startsWith("/"))).max(20).optional(),
});

// ------------ Étape 3 ------------
export const reportStep3Schema = z.object({
  valueProducedXAF: z.coerce.number().int().nonnegative().default(0),
  valueProducedCumulXAF: z.coerce.number().int().nonnegative().default(0),
  avgWorkforce: z.coerce.number().int().nonnegative().default(0),
  maxWorkforce: z.coerce.number().int().nonnegative().default(0),
  overtimeHoursTotal: z.coerce.number().nonnegative().default(0),
  billingStatus: z.string().max(2000).optional().nullable(),
});

// ------------ Étape 4 ------------
export const reportStep4Schema = z.object({
  hseIncidentsCount: z.coerce.number().int().nonnegative().default(0),
  daysWithoutAccident: z.coerce.number().int().nonnegative().default(0),
  issuesEncountered: z.string().max(4000).optional().nullable(),
  supportNeeded: z.string().max(2000).optional().nullable(),
});

// ------------ Étape 5 ------------
export const reportStep5Schema = z.object({
  attachmentDocumentIds: z.array(z.string()).max(30).optional(),
  nextPeriodPriorities: z.string().max(4000).optional().nullable(),
});

// Création (étape 1 obligatoire)
export const createReportSchema = reportStep1Schema;

// Update : tous les champs optionnels, on accepte un objet vide
export const updateReportSchema = reportStep1Schema
  .partial()
  .merge(reportStep2Schema.partial())
  .merge(reportStep3Schema.partial())
  .merge(reportStep4Schema.partial())
  .merge(reportStep5Schema.partial());

// Submit : on contrôle juste qu'il existe (les défauts couvrent les chiffres)
export const submitReportSchema = z.object({
  confirm: z.literal(true),
});

// Validate/Reject (DTrav)
export const validateReportSchema = z.object({
  decision: z.enum(["VALIDATE", "REJECT"]),
  rejectionReason: z.string().max(2000).optional().nullable(),
}).refine((v) => v.decision === "VALIDATE" || (v.rejectionReason && v.rejectionReason.trim().length > 0), {
  message: "Motif de refus requis",
  path: ["rejectionReason"],
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type ValidateReportInput = z.infer<typeof validateReportSchema>;
