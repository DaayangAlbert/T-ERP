import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";

// OUV : seul l'ouvrier (WORKER) connecté peut consulter SON espace personnel
// mobile-first. Les autres rôles n'ont aucune raison de naviguer dans /ouv/*
// d'un autre utilisateur — données RGPD/sociales strictes (Bloc 0 Ouvrier).
const OUV_ROLES: Role[] = [Role.WORKER];

export function guardOuv() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!OUV_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return { session };
}

/**
 * Vérifie que `targetUserId` correspond bien à l'ouvrier connecté. Un ouvrier
 * ne peut JAMAIS consulter les données personnelles d'un autre (bulletin, congé,
 * pointage, mission, HSE, EPI, profil).
 */
export function guardOuvOwnership(targetUserId: string) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  if (guard.session.sub !== targetUserId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return guard;
}
