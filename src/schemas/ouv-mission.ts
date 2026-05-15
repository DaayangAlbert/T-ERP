import { z } from "zod";

// Acceptation : pas de body (juste action). On laisse un schéma vide pour
// uniformiser les call sites côté hook.
export const missionAcceptSchema = z.object({}).optional();

export const missionRaiseQuestionsSchema = z.object({
  questions: z.string().min(5, "Précise tes questions (≥ 5 caractères)").max(1000),
});
export type MissionRaiseQuestionsInput = z.infer<typeof missionRaiseQuestionsSchema>;

export const missionProgressSchema = z.object({
  percent: z.number().int().min(0).max(100),
  // Photo optionnelle dataURL webp ; le serveur stocke directement.
  photo: z.string().max(1_400_000).optional(),
  note: z.string().max(500).optional(),
});
export type MissionProgressInput = z.infer<typeof missionProgressSchema>;

export const missionCompleteSchema = z.object({
  notes: z.string().max(1000).optional(),
});
export type MissionCompleteInput = z.infer<typeof missionCompleteSchema>;
