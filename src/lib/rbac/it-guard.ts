import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";

/**
 * Garde commune des routes IT.
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts).
 * TENANT_ADMIN = FULL · SUPER_ADMIN = READ (audit plateforme).
 *
 * Le flag optionnel reste vérifié séparément (pouvoir granulaire, indépendant
 * du niveau d'accès au module). Un TENANT_ADMIN peut être restreint sur
 * certaines actions via les canManage*.
 *
 *   const guard = await guardIt();                  // rôle seulement
 *   const guard = await guardIt("canManageUsers");  // rôle + flag spécifique
 */
export async function guardIt(
  requiredFlag?: "canManageUsers" | "canManageRoles" | "canManageTenantSettings" | "canManageIntegrations" | "canViewTechnicalLogs"
) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const access = getAccess(session.role as Role, MODULES.IT);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé · réservé IT" }, { status: 403 });
  }

  if (requiredFlag) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        canManageUsers: true,
        canManageRoles: true,
        canManageTenantSettings: true,
        canManageIntegrations: true,
        canViewTechnicalLogs: true,
      },
    });
    if (!user || !user[requiredFlag]) {
      return NextResponse.json({ error: `Pouvoir manquant : ${requiredFlag}` }, { status: 403 });
    }
  }

  return { session, access };
}

const PROTECTED_ROLES: Role[] = [Role.DG, Role.SUPER_ADMIN, Role.TENANT_ADMIN];

/**
 * Renvoie true si la modification du `targetUser` par l'IT_ADMIN est interdite
 * (DG ne peut être désactivé, IT_ADMIN ne peut pas se promouvoir DG, etc.).
 */
export async function isProtectedTarget(targetUserId: string): Promise<{ blocked: boolean; reason?: string }> {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });
  if (!target) return { blocked: true, reason: "Utilisateur introuvable" };
  if (PROTECTED_ROLES.includes(target.role)) {
    return { blocked: true, reason: `Action sur compte ${target.role} interdite — workflow DG requis` };
  }
  return { blocked: false };
}
