import { z } from "zod";

export const updateProfileSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{6,20}$/, "Téléphone invalide")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "Au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
