import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getCurrentSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const GED_ROLES: Role[] = [Role.ARCHIVIST, Role.DG, Role.TENANT_ADMIN];

/**
 * Garde commune des routes /api/ged. Vérifie le rôle ARCHIVIST (ou DG en
 * lecture, TENANT_ADMIN pour maintenance) et renvoie la session.
 *
 * Usage :
 *   const guard = await guardGed();
 *   if (guard instanceof NextResponse) return guard;
 *   const { session } = guard;
 */
export async function guardGed() {
  const session = getCurrentSession();
  if (!session?.tenantId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!GED_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé · réservé GED" }, { status: 403 });
  }
  return { session };
}

/**
 * Préfixes de classifications interdits à l'ARCHIVIST même avec
 * canReadAllDocuments=true. Conforme à la note du profil :
 * « SAUF documents les plus confidentiels (paie individuelle BS_,
 *   contentieux RH) ».
 */
const ARCHIVIST_BLOCKED_PREFIXES = ["BS_", "DRH_CTX"]; // BS_ = bulletin de salaire, DRH_CTX = contentieux RH

/**
 * Vérifie si un utilisateur ARCHIVIST peut lire un document précis.
 *
 * Règle : `canReadAllDocuments=true` accorde un accès transverse à tous les
 * documents du tenant SAUF :
 *   - les bulletins de paie individuels (préfixe BS_)
 *   - les dossiers contentieux RH (préfixe DRH_CTX)
 *
 * Pour les autres rôles, retourne false (utiliser le filtrage classique
 * par assignedSiteIds / périmètre métier).
 */
export async function canArchivistReadDocument(
  userId: string,
  documentId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, canReadAllDocuments: true, tenantId: true },
  });

  if (!user) return { allowed: false, reason: "Utilisateur introuvable" };
  if (user.role !== Role.ARCHIVIST || !user.canReadAllDocuments) {
    return { allowed: false, reason: "Flag canReadAllDocuments requis" };
  }

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      tenantId: true,
      classification: { select: { prefix: true } },
    },
  });

  if (!doc) return { allowed: false, reason: "Document introuvable" };
  if (doc.tenantId !== user.tenantId) {
    return { allowed: false, reason: "Document hors tenant" };
  }

  const prefix = doc.classification?.prefix;
  if (prefix && ARCHIVIST_BLOCKED_PREFIXES.includes(prefix)) {
    return {
      allowed: false,
      reason: `Accès restreint : préfixe ${prefix} hors périmètre ARCHIVIST`,
    };
  }

  return { allowed: true };
}

/**
 * Liste des préfixes interdits — exposée pour usage côté filtres SQL
 * (ex: exclure ces docs dans une recherche full-text).
 */
export function getArchivistBlockedPrefixes(): readonly string[] {
  return ARCHIVIST_BLOCKED_PREFIXES;
}
