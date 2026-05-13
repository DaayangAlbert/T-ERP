import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const SG_ROLES: Role[] = [Role.SECRETARY_GENERAL, Role.DG, Role.TENANT_ADMIN];

export type SgPower =
  | "canManageCorporateGovernance"
  | "canManageMarketContracts"
  | "canManageLegalCases"
  | "canManageOfficialCorrespondence"
  | "canReadAllDashboards";

/**
 * Garde commune des routes /api/sg. Vérifie le rôle SECRETARY_GENERAL
 * (ou DG en lecture, TENANT_ADMIN pour maintenance) et optionnellement
 * un pouvoir spécial.
 *
 * Usage :
 *   const guard = await guardSg();                        // rôle seulement
 *   const guard = await guardSg("canManageLegalCases");   // rôle + pouvoir
 *   if (guard instanceof NextResponse) return guard;
 *   const { session } = guard;
 */
export async function guardSg(requiredPower?: SgPower) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!SG_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé · réservé Secrétaire Général" }, { status: 403 });
  }

  // Le DG bypass les flags (toute direction confondue) ; TENANT_ADMIN aussi.
  // Seul SECRETARY_GENERAL doit avoir le flag spécifique pour modifier.
  if (requiredPower && session.role === Role.SECRETARY_GENERAL) {
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        canManageCorporateGovernance: true,
        canManageMarketContracts: true,
        canManageLegalCases: true,
        canManageOfficialCorrespondence: true,
        canReadAllDashboards: true,
      },
    });
    if (!user || !user[requiredPower]) {
      return NextResponse.json(
        { error: `Pouvoir manquant : ${requiredPower}` },
        { status: 403 },
      );
    }
  }

  return { session };
}

/**
 * Vérifie si le SG peut consulter en lecture les dashboards d'autres
 * directions (DAF, DT, RH...). Renvoie true si le flag est posé.
 * Le DG / TENANT_ADMIN bypass.
 */
export async function canSgReadAllDashboards(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, canReadAllDashboards: true },
  });
  if (!user) return false;
  if (user.role === Role.DG || user.role === Role.TENANT_ADMIN) return true;
  if (user.role === Role.SECRETARY_GENERAL) return user.canReadAllDashboards;
  return false;
}
