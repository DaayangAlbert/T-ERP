import { z } from "zod";
import { Role } from "@prisma/client";

/**
 * Helper d'intégrité multi-tenant : valide qu'un user candidat à la création
 * est correctement rattaché à une entreprise + un rôle.
 *
 * Règle métier (miroir de la CHECK constraint DB
 * `users_tenant_required_for_employees`) :
 *   - Tout user DOIT avoir un `tenantId`
 *   - SAUF si role === CANDIDATE (chercheurs d'emploi externes)
 *   - SAUF si role === SUPER_ADMIN (admin SaaS transverse)
 *
 * Usage :
 *   const data = userCreationSchema.parse(body);
 *   await prisma.user.create({ data });  // garanti par la contrainte
 */
export const userCreationSchema = z
  .object({
    email: z.string().email(),
    role: z.nativeEnum(Role),
    tenantId: z.string().cuid().nullable(),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    position: z.string().max(120).nullable().optional(),
  })
  .refine(
    (d) =>
      d.tenantId !== null ||
      d.role === Role.CANDIDATE ||
      d.role === Role.SUPER_ADMIN,
    {
      path: ["tenantId"],
      message:
        "tenantId obligatoire (sauf pour CANDIDATE et SUPER_ADMIN). Tout employé doit être lié à une entreprise.",
    },
  )
  .refine(
    (d) =>
      d.role === Role.CANDIDATE ||
      d.role === Role.SUPER_ADMIN ||
      (d.position !== null && d.position !== undefined && d.position.trim().length > 0),
    {
      path: ["position"],
      message:
        "position (libellé du poste) obligatoire pour tout employé. Ex: 'Directeur Général', 'Chef de chantier'.",
    },
  );
export type UserCreationInput = z.infer<typeof userCreationSchema>;

/**
 * Vérifie qu'un user existant respecte la contrainte multi-tenant.
 * Renvoie `null` si OK, sinon le message d'erreur.
 */
export function checkUserIntegrity(user: { tenantId: string | null; role: Role; position?: string | null }): string | null {
  if (user.role === Role.CANDIDATE || user.role === Role.SUPER_ADMIN) return null;
  if (!user.tenantId) {
    return "User non-CANDIDATE/SUPER_ADMIN sans tenantId — viole la contrainte multi-tenant";
  }
  return null;
}

export const updateProfileSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[0-9 ()-]{6,20}$/, "Téléphone invalide")
    .optional()
    .or(z.literal("")),
  avatarUrl: z
    .string()
    .max(2_000_000, "Image trop volumineuse")
    .refine(
      (value) => value === "" || value.startsWith("data:image/") || /^https?:\/\//.test(value),
      "URL ou image invalide"
    )
    .optional()
    .nullable(),
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
