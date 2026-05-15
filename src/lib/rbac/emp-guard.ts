import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";

/**
 * Garde de l'espace EMP (espace personnel).
 *
 * Autorisation déléguée à la matrice centrale (access-matrix.ts). EMPLOYEE
 * + WORKER y ont un accès OWN, ainsi que tous les rôles direction (DG, DAF,
 * HR, etc.) pour leur PROPRE espace personnel.
 *
 * RGPD : `guardEmpOwnership(targetUserId)` doit être systématiquement
 * utilisée sur les routes manipulant un userId — personne (même DG) ne
 * consulte les données d'un autre utilisateur via /api/emp/*.
 *
 * Note : WORKER reste accepté ici tant que /api/ouv/* ne couvre pas tous
 * les endpoints (rétro-compat avec le Bloc 0 OUV).
 */
export function guardEmp() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const access = getAccess(session.role as Role, MODULES.EMP);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return { session, access };
}

/**
 * Vérifie que `targetUserId` correspond bien à l'utilisateur connecté.
 * Si non, renvoie un 403 — personne ne consulte les données personnelles
 * d'un autre via /api/emp/*.
 */
export function guardEmpOwnership(targetUserId: string) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  if (guard.session.sub !== targetUserId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return guard;
}
