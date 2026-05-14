import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";

// EMP : EMPLOYEE (bureau) + WORKER (ouvriers) connectés peuvent consulter
// LEUR espace personnel. Cette garde reste sur les deux rôles tant que
// /api/ouv/* n'a pas dupliqué les endpoints équivalents (Bloc 1 Ouvrier).
// L'UI /employe est en revanche restreinte aux EMPLOYEE uniquement.
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
