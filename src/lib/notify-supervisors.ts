import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Notifie tous les utilisateurs d'un tenant ayant l'un des rôles
 * indiqués, en créant un Notification par superviseur. Permet de router
 * automatiquement les demandes émises depuis l'espace OUV (avance,
 * congés, signalement HSE) vers les profils RH / DAF / chefs concernés.
 *
 * - Cherche d'abord les superviseurs dans le tenant de l'événement.
 * - Si aucun trouvé (cas filiale BTP sans DRH local), élargit au tenant
 *   parent (siège du groupe).
 *
 * Retourne le nombre de notifications créées.
 */
export async function notifySupervisors(params: {
  tenantId: string;
  roles: Role[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<number> {
  const { tenantId, roles, type, title, body, link } = params;

  let supervisors = await prisma.user.findMany({
    where: { tenantId, role: { in: roles }, status: "ACTIVE" },
    select: { id: true },
  });

  // Fallback : tenant parent (siège du groupe BatimCAM SA)
  if (supervisors.length === 0) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { parentId: true },
    });
    if (tenant?.parentId) {
      supervisors = await prisma.user.findMany({
        where: { tenantId: tenant.parentId, role: { in: roles }, status: "ACTIVE" },
        select: { id: true },
      });
    }
  }

  if (supervisors.length === 0) return 0;

  await prisma.notification.createMany({
    data: supervisors.map((s) => ({
      userId: s.id,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    })),
  });

  return supervisors.length;
}
