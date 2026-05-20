import { z } from "zod";
import { ContractType, JobStatus, InterviewMode, InterviewDecision } from "@prisma/client";

// Montant FCFA (BigInt) transporté en string de chiffres, optionnel.
const optionalAmount = z
  .string()
  .regex(/^\d+$/, "Montant invalide")
  .optional()
  .nullable()
  .or(z.literal(""));

// Listes (missions, profil, avantages) : tableau de lignes non vides.
const lines = z.array(z.string().min(1)).optional();

export const createJobOfferSchema = z.object({
  title: z.string().min(2).max(160),
  department: z.string().max(120).optional().or(z.literal("")),
  contractType: z.nativeEnum(ContractType),
  category: z.string().min(1).max(80),
  positions: z.coerce.number().int().min(1).max(999).default(1),
  region: z.string().max(80).optional().or(z.literal("")),
  experienceMin: z.coerce.number().int().min(0).max(50).optional().nullable(),
  salaryMin: optionalAmount,
  salaryMax: optionalAmount,
  summary: z.string().max(400).optional().or(z.literal("")),
  description: z.string().min(10),
  requirements: z.string().min(5),
  missions: lines,
  profileItems: lines,
  benefits: lines,
  siteId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  // DRAFT (par défaut) ou PUBLISHED directement.
  status: z.enum([JobStatus.DRAFT, JobStatus.PUBLISHED]).default(JobStatus.DRAFT),
});

export const updateJobOfferSchema = createJobOfferSchema.partial().extend({
  // Permet aussi les transitions CLOSED / ARCHIVED depuis l'édition / actions.
  status: z.nativeEnum(JobStatus).optional(),
});

export type CreateJobOfferInput = z.infer<typeof createJobOfferSchema>;
export type UpdateJobOfferInput = z.infer<typeof updateJobOfferSchema>;

// ─── Entretiens ────────────────────────────────────────────────────────────

export const scheduleInterviewSchema = z.object({
  scheduledAt: z.string().min(1, "Date requise"),
  duration: z.coerce.number().int().min(15).max(480).default(60),
  mode: z.nativeEnum(InterviewMode).default(InterviewMode.ONSITE),
  location: z.string().max(240).optional().or(z.literal("")),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.string().optional(),
  duration: z.coerce.number().int().min(15).max(480).optional(),
  mode: z.nativeEnum(InterviewMode).optional(),
  location: z.string().max(240).optional().nullable(),
  completed: z.boolean().optional(),
  feedback: z.string().max(2000).optional().nullable(),
  score: z.coerce.number().int().min(1).max(5).optional().nullable(),
  decision: z.nativeEnum(InterviewDecision).optional().nullable(),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;

/** slugify simple (titre → url). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
