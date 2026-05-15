import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccess } from "@/lib/rbac/access-matrix";
import { MODULES } from "@/lib/rbac/modules";

/**
 * Garde commune des routes candidat. Autorisation déléguée à la matrice
 * centrale (access-matrix.ts). Seul Role.CANDIDATE a CAND = OWN ; tous
 * les autres sont NONE.
 *
 * Spécificité : un candidat n'a pas de tenantId (compte externe à toute
 * entreprise). On ne vérifie donc QUE session + niveau d'accès matrice.
 */
export async function guardCandidate() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const access = getAccess(session.role as Role, MODULES.CAND);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès réservé aux candidats" }, { status: 403 });
  }
  return { session, access };
}
