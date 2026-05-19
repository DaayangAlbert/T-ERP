import { prisma } from "@/lib/prisma";
import { isEmailLike, normalizePhone } from "@/lib/phone-normalize";

export type LookupResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "ambiguous" };

/**
 * Résout un utilisateur à partir d'un identifiant email OU téléphone.
 *
 * - Si l'input contient "@", recherche par email unique.
 * - Sinon, normalise le téléphone (chiffres uniquement avec préfixe pays
 *   Cameroun 237 si absent) puis :
 *   1. Pré-filtre SQL par les 8 derniers chiffres via `contains`
 *   2. Filtre exact en JS sur la normalisation
 *
 * Si plusieurs comptes matchent le téléphone (cas rare : numéro partagé
 * famille / parents-enfants), renvoie `ambiguous` — l'utilisateur doit
 * utiliser son email.
 *
 * Le paramètre `roleScope` permet de restreindre aux candidats (CANDIDATE)
 * ou employés (tout sauf CANDIDATE).
 */
export async function lookupUserByIdentifier(
  identifier: string,
  roleScope?: "candidate" | "employee",
): Promise<LookupResult> {
  const trimmed = identifier.trim();
  if (isEmailLike(trimmed)) {
    const user = await prisma.user.findUnique({
      where: { email: trimmed.toLowerCase() },
      select: { id: true, role: true },
    });
    if (!user) return { ok: false, reason: "not_found" };
    if (roleScope === "candidate" && user.role !== "CANDIDATE")
      return { ok: false, reason: "not_found" };
    if (roleScope === "employee" && user.role === "CANDIDATE")
      return { ok: false, reason: "not_found" };
    return { ok: true, userId: user.id };
  }

  const normalized = normalizePhone(trimmed);
  if (normalized.length < 9) return { ok: false, reason: "not_found" };

  // Phone en DB stocké avec espaces ("+237 6 93 41 77 30") → pas de
  // pré-filtre SQL `contains` possible sans champ normalisé indexé.
  // Solution MVP : charger tous les users avec phone non null (limite 500)
  // et filtrer en mémoire après normalisation. À migrer vers un champ
  // `phoneNormalized` indexé quand on dépasse quelques milliers d'users.
  const candidates = await prisma.user.findMany({
    where: {
      OR: [{ phone: { not: null } }, { phoneMobile: { not: null } }],
      ...(roleScope === "candidate"
        ? { role: "CANDIDATE" }
        : roleScope === "employee"
          ? { role: { not: "CANDIDATE" } }
          : {}),
    },
    select: { id: true, phone: true, phoneMobile: true },
    take: 500,
  });

  const matched = candidates.filter((u) => {
    return (
      normalizePhone(u.phone) === normalized ||
      normalizePhone(u.phoneMobile) === normalized
    );
  });

  if (matched.length === 0) return { ok: false, reason: "not_found" };
  if (matched.length > 1) return { ok: false, reason: "ambiguous" };
  return { ok: true, userId: matched[0].id };
}
