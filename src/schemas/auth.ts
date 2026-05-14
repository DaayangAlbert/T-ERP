import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, "Mot de passe requis"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// OUV — auth téléphone + PIN 6 chiffres (Bloc 0 Ouvrier)
// Téléphone normalisé en E.164 ou format CM local "+237 6 78 24 18 92" /
// "237678241892" / "6 78 24 18 92" — on normalise dans l'API avant lookup.
export const ouvLoginSchema = z.object({
  phone: z.string().min(8, "Téléphone requis").max(20),
  pin: z.string().regex(/^\d{6}$/, "PIN à 6 chiffres requis"),
});
export type OuvLoginInput = z.infer<typeof ouvLoginSchema>;

export const registerCandidateSchema = z.object({
  fullName: z.string().min(2, "Nom complet requis").max(120),
  email: z.string().email("Email invalide"),
  phone: z.string().regex(/^\+?[0-9 ()-]{6,20}$/, "Téléphone invalide").optional().or(z.literal("")),
  password: z.string().min(8, "Au moins 8 caractères"),
  desiredJob: z.string().max(120).optional().or(z.literal("")),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGU" }) }),
});
export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;

export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export const registerCompanySchema = z.object({
  companyName: z.string().min(2, "Raison sociale requise").max(120),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(SLUG_REGEX, "Sous-domaine : a-z, 0-9 et tirets seulement"),
  taxId: z.string().min(4, "N° contribuable requis").max(40),
  cnpsId: z.string().max(40).optional().or(z.literal("")),
  fullName: z.string().min(2, "Nom complet requis").max(120),
  position: z.string().max(120).optional().or(z.literal("")),
  email: z.string().email("Email professionnel invalide"),
  password: z.string().min(8, "Au moins 8 caractères"),
  plan: z.enum(["STARTER", "STANDARD", "BUSINESS", "ENTERPRISE"]).default("STARTER"),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Vous devez accepter les CGV" }) }),
});
export type RegisterCompanyInput = z.infer<typeof registerCompanySchema>;
