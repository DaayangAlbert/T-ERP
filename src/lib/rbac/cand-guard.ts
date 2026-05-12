import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";

/**
 * Garde commune des routes candidat. Vérifie que l'utilisateur a le rôle CANDIDATE
 * et empêche tout autre rôle d'accéder à /api/cand/*.
 */
export async function guardCandidate() {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.CANDIDATE) {
    return NextResponse.json({ error: "Accès réservé aux candidats" }, { status: 403 });
  }
  return { session };
}
