import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";

// EMP : seul l'employé/ouvrier connecté peut consulter SON espace personnel.
// Les autres rôles (DG, DAF, RH, etc.) n'ont aucune raison de naviguer dans
// l'espace EMP d'un autre utilisateur — c'est une donnée RGPD/sociale stricte.
const EMP_ROLES: Role[] = [Role.EMPLOYEE, Role.WORKER];

export function guardEmp() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!EMP_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return { session };
}

/**
 * Vérifie que `targetUserId` correspond bien à l'utilisateur connecté.
 * Si non, renvoie un 403 — un ouvrier ne peut JAMAIS consulter les données
 * personnelles d'un autre (bulletin, congé, pointage, profil).
 */
export function guardEmpOwnership(targetUserId: string) {
  const guard = guardEmp();
  if (guard instanceof NextResponse) return guard;
  if (guard.session.sub !== targetUserId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return guard;
}
