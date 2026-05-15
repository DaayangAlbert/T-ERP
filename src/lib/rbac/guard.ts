/**
 * Garde générique d'API : check session + autorisation matrice.
 *
 * Tous les guards spécifiques (`*-guard.ts`) s'appuient sur cette fonction
 * pour la vérification de base. Ils ajoutent ensuite leur logique métier
 * (filtre périmètre site, ownership RGPD, flags de pouvoir).
 *
 * Patron d'usage côté handler :
 *
 *   const guard = guardModule(MODULES.DAF);
 *   if (guard instanceof NextResponse) return guard;
 *   const { session, access } = guard;
 *   // access.canEdit, access.canValidate, access.level === "FULL" | "READ" …
 *
 * Cohérent avec la matrice : un DG (READ sur DAF) passe le guard mais
 * `access.canEdit === false` → la route doit vérifier avant tout POST/PATCH.
 */
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { getAccess, type Access } from "@/lib/rbac/access-matrix";
import { type Module } from "@/lib/rbac/modules";

export interface ModuleGuardResult {
  session: NonNullable<ReturnType<typeof getCurrentSession>>;
  access: Access;
}

export function guardModule(module: Module): ModuleGuardResult | NextResponse {
  const session = getCurrentSession();
  if (!session?.tenantId && module !== "CAND" && module !== "PLATFORM") {
    // PLATFORM (super-admin) et CAND (candidat) ont tenantId nullable.
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const access = getAccess(session.role as Role, module);
  if (access.level === "NONE") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return { session, access };
}

/**
 * Variante stricte : refuse les niveaux READ. À utiliser sur les routes
 * de mutation qui ne doivent pas tolérer les drill-down lecture seule.
 *
 *   const guard = guardModuleMutation(MODULES.DAF);
 *   // → 403 pour un DG (qui n'a que READ)
 */
export function guardModuleMutation(module: Module): ModuleGuardResult | NextResponse {
  const result = guardModule(module);
  if (result instanceof NextResponse) return result;
  if (!result.access.canEdit) {
    return NextResponse.json(
      { error: "Action en lecture seule pour ce profil" },
      { status: 403 }
    );
  }
  return result;
}
