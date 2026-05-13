import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { verifyAdminJwt, type AdminJwtPayload } from "@/lib/admin-auth";
import { getAdminCookie } from "@/lib/admin-cookies";

/**
 * Retourne la session Super-Admin si présente et valide.
 * Ne fait PAS de check d'IP whitelisting ici (à faire en V2 avec un
 * mécanisme de récupération d'IP côté serveur fiable).
 */
export function getAdminSession(): AdminJwtPayload | null {
  const token = getAdminCookie();
  if (!token) return null;
  try {
    return verifyAdminJwt(token);
  } catch {
    return null;
  }
}

export function requireAdminSession(): AdminJwtPayload {
  const session = getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * Garde API pour routes /api/admin/*. Renvoie soit { session }, soit
 * un NextResponse 401/403 à propager.
 */
export type AdminGuardResult =
  | { ok: true; session: AdminJwtPayload }
  | { ok: false; response: NextResponse };

export function guardAdminApi(): AdminGuardResult {
  const session = getAdminSession();
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

export function guardAdminPermission(
  session: AdminJwtPayload,
  required: "CTO" | "any",
): boolean {
  if (required === "any") return true;
  return session.role === "CTO";
}
