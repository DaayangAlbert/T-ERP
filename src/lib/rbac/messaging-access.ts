import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Règles d'accès messagerie T-ERP (Phase 2).
 *
 * Cadres : peuvent DM n'importe qui dans le tenant + créer des groupes.
 * Non-cadres (EMPLOYEE, WORKER, LOGISTICS, WAREHOUSE, ARCHIVIST) :
 *   - DM autorisé uniquement avec leur(s) chef(s) hiérarchique(s) :
 *       1. Manager(s) de leur(s) site(s) (Site.managerId pour tous les
 *          sites listés dans User.assignedSiteIds)
 *       2. DRH du tenant (rôle HR)
 *       3. teamLeader(s) (User.teamLeader=true) de leur département
 *   - Création de groupe interdite (peuvent être ajoutés à un groupe par
 *     un cadre et y écrire librement).
 *
 * Les groupes sont déjà filtrés par participation (table
 * ConversationParticipant) — donc l'accès au contenu d'un groupe ne
 * nécessite pas de check RBAC supplémentaire ; ce qu'on contrôle ici,
 * c'est qui peut initier un DM et qui peut créer un groupe.
 */

/** Rôles considérés comme "cadres" — droits messagerie élargis. */
export const CADRE_ROLES: ReadonlySet<Role> = new Set<Role>([
  Role.OWNER,
  Role.DG,
  Role.DAF,
  Role.HR,
  Role.SECRETARY_GENERAL,
  Role.TECH_DIRECTOR,
  Role.WORKS_DIRECTOR,
  Role.WORKS_MANAGER,
  Role.SITE_MANAGER,
  Role.ACCOUNTANT,
  Role.TENANT_ADMIN,
]);

export function isCadre(role: Role): boolean {
  return CADRE_ROLES.has(role);
}

/** Seuls les cadres peuvent créer des groupes. */
export function canCreateGroup(role: Role): boolean {
  return isCadre(role);
}

/**
 * Retourne la liste des IDs des utilisateurs avec qui un utilisateur
 * NON-cadre peut initier une conversation (DM).
 *
 * Pour un cadre, ne pas appeler cette fonction — utiliser directement la
 * liste complète du tenant.
 */
export async function getAllowedDmTargetIds(userId: string): Promise<Set<string>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      tenantId: true,
      department: true,
      assignedSiteIds: true,
    },
  });

  if (!user || !user.tenantId) return new Set();

  const allowed = new Set<string>();

  // 1. Managers des sites assignés
  if (user.assignedSiteIds.length > 0) {
    const sites = await prisma.site.findMany({
      where: {
        id: { in: user.assignedSiteIds },
        tenantId: user.tenantId,
        managerId: { not: null },
      },
      select: { managerId: true },
    });
    for (const s of sites) {
      if (s.managerId) allowed.add(s.managerId);
    }
  }

  // 2. DRH du tenant (tous les utilisateurs ayant le rôle HR)
  const hrUsers = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: Role.HR, status: "ACTIVE" },
    select: { id: true },
  });
  for (const u of hrUsers) allowed.add(u.id);

  // 3. teamLeaders du même département
  if (user.department) {
    const leaders = await prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
        department: user.department,
        teamLeader: true,
        status: "ACTIVE",
        id: { not: userId },
      },
      select: { id: true },
    });
    for (const u of leaders) allowed.add(u.id);
  }

  // L'utilisateur ne peut jamais s'écrire à lui-même.
  allowed.delete(userId);

  return allowed;
}

/**
 * Vérifie qu'un utilisateur `from` peut initier un DM avec `to`.
 *
 * - Si `from` est cadre → autorisé pour tout utilisateur du même tenant.
 * - Sinon → `to` doit faire partie de getAllowedDmTargetIds(from).
 *
 * Cette fonction NE valide PAS l'appartenance au même tenant — c'est la
 * responsabilité de l'appelant (déjà fait dans POST /api/conversations).
 */
export async function canInitiateDm(
  fromUserId: string,
  fromUserRole: Role,
  toUserId: string
): Promise<boolean> {
  if (fromUserId === toUserId) return false;
  if (isCadre(fromUserRole)) return true;
  const allowed = await getAllowedDmTargetIds(fromUserId);
  return allowed.has(toUserId);
}
