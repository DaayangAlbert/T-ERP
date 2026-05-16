import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Bloc 0 Comptable — résolution du périmètre chantiers d'un utilisateur.
 *
 * Renvoie :
 *   - `null`  → accès global (cadres dirigeants OU Comptable Direction)
 *   - `string[]` → liste fermée des chantiers accessibles
 *
 * À utiliser dans toutes les API filtrées par chantier :
 *
 *     const allowed = await getAccessibleSiteIds(session.sub);
 *     const where = allowed === null
 *       ? { tenantId }
 *       : { tenantId, siteId: { in: allowed } };
 */
const GLOBAL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.DG,
  Role.DAF,
  Role.SECRETARY_GENERAL,
  Role.HR,
  Role.TECH_DIRECTOR,
  Role.TENANT_ADMIN,
];

export async function getAccessibleSiteIds(userId: string): Promise<string[] | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, assignedSiteIds: true },
  });
  if (!user) throw new Error("Utilisateur introuvable");

  if (GLOBAL_ROLES.includes(user.role)) return null;

  // Comptable Direction : array vide → accès global comptable
  if (user.role === Role.ACCOUNTANT && user.assignedSiteIds.length === 0) {
    return null;
  }

  return user.assignedSiteIds;
}

/**
 * Helper pour bâtir un filtre Prisma cohérent : injecte `siteId: { in: ... }`
 * uniquement quand l'utilisateur est limité.
 */
export function siteFilterClause(allowed: string[] | null): Record<string, unknown> {
  return allowed === null ? {} : { siteId: { in: allowed } };
}

/**
 * Vérifie qu'un siteId donné est dans le périmètre. Renvoie true si autorisé,
 * false sinon. Utile pour les actions ponctuelles (POST/PATCH).
 */
export function isSiteAllowed(allowed: string[] | null, siteId: string | null | undefined): boolean {
  if (allowed === null) return true;
  if (!siteId) return false; // un utilisateur restreint doit toujours rattacher l'opération à un de ses chantiers
  return allowed.includes(siteId);
}

/**
 * Renvoie le libellé du périmètre pour les bandeaux UI :
 * - vue Direction : "Vue globale · X chantiers consolidés"
 * - vue Chantier  : "Périmètre limité · N chantiers"
 */
export function describeScope(allowed: string[] | null, totalSitesCount: number): string {
  if (allowed === null) {
    return `Vue globale · ${totalSitesCount} chantier${totalSitesCount > 1 ? "s" : ""} consolidé${totalSitesCount > 1 ? "s" : ""}`;
  }
  return `Périmètre limité · ${allowed.length} chantier${allowed.length > 1 ? "s" : ""}`;
}
