import { NextResponse } from "next/server";
import { guardModule } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";

/**
 * Garde de l'espace OUV (PWA ouvrier).
 *
 * Délègue l'autorisation à la matrice centrale (access-matrix.ts).
 * Seul Role.WORKER a OUV = OWN ; tous les autres sont NONE.
 */
export function guardOuv() {
  return guardModule(MODULES.OUV);
}

/**
 * Vérifie que `targetUserId` correspond bien à l'ouvrier connecté. Un ouvrier
 * ne peut JAMAIS consulter les données personnelles d'un autre (bulletin, congé,
 * pointage, mission, HSE, EPI, profil). RGPD strict.
 */
export function guardOuvOwnership(targetUserId: string) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  if (guard.session.sub !== targetUserId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return guard;
}
