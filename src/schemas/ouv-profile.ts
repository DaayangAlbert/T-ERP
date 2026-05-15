import { z } from "zod";

// Champs modifiables par l'ouvrier lui-même (cf spec fn 1.8).
// Tout autre changement (salaire, qualif, contrat) passe par RH.
export const profileUpdateSchema = z.object({
  phoneMobile: z
    .string()
    .min(8, "Téléphone requis")
    .max(20, "Trop long")
    .optional(),
  address: z.string().min(2).max(300).optional(),
  emergencyContactName: z.string().min(2).max(120).optional(),
  emergencyContactPhone: z.string().min(8).max(20).optional(),
  preferredLanguage: z.enum(["fr-CM", "en-CM"]).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Changement de PIN : ancien PIN + nouveau (+ confirmation côté UI).
export const changePinSchema = z.object({
  currentPin: z.string().regex(/^\d{6}$/, "PIN actuel à 6 chiffres"),
  newPin: z.string().regex(/^\d{6}$/, "Nouveau PIN à 6 chiffres"),
});
export type ChangePinInput = z.infer<typeof changePinSchema>;

// Demande remplacement EPI : type + raison
export const epiReplacementSchema = z.object({
  epiId: z.string().cuid(),
  reason: z.string().min(5, "Précise la raison (≥ 5 caractères)").max(300),
});
export type EpiReplacementInput = z.infer<typeof epiReplacementSchema>;

// Demande outil : nom + catégorie + motif + permanent ou pas
export const toolRequestSchema = z.object({
  toolName: z.string().min(2, "Nom de l'outil requis").max(120),
  toolCategory: z.string().max(80).optional(),
  reason: z.string().min(5, "Précise pourquoi (≥ 5 caractères)").max(300),
  isPermanent: z.boolean().optional(),
});
export type ToolRequestInput = z.infer<typeof toolRequestSchema>;
