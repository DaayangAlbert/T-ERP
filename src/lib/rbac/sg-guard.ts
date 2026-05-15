import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";

export type SgPower =
  | "canManageCorporateGovernance"
  | "canManageMarketContracts"
  | "canManageLegalCases"
  | "canManageOfficialCorrespondence"
  | "canReadAllDashboards";

/**
 * Garde commune des routes /api/sg.
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts).
 * SECRETARY_GENERAL / SG = FULL · DG / ARCHIVIST = READ.
 *
 * Le `requiredPower` vérifie en plus un flag granulaire (uniquement appliqué
 * au SECRETARY_GENERAL — le DG et TENANT_ADMIN passent outre car ils ont
 * un accès direction global).
 *
 *   const guard = await guardSg();                        // rôle seulement
 *   const guard = await guardSg("canManageLegalCases");   // rôle + pouvoir
 */
export async function guardSg(requiredPower?: SgPower) {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const access = getAccess(session.role as Role, MODULES.SG);
  if (access.level === "NONE") {
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

  return { session, access };
}

/**
 * Variante stricte de `guardSg` pour les routes de mutation
 * (POST/PATCH/DELETE). Refuse les rôles dont l'accès SG est `READ`
 * — typiquement le DG en drill-down ou l'ARCHIVIST.
 *
 *   const guard = await guardSgMutation("canManageLegalCases");
 *   // → 403 pour un DG (READ uniquement)
 */
export async function guardSgMutation(requiredPower?: SgPower) {
  const guard = await guardSg(requiredPower);
  if (guard instanceof NextResponse) return guard;
  if (!guard.access.canEdit) {
    return NextResponse.json(
      { error: "Action en lecture seule pour ce profil" },
      { status: 403 },
    );
  }
  return guard;
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
