import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Détermine le lien à pointer dans une notification liée à un suivi de
 * paiement (PaymentTrack / Receivable) selon le rôle du destinataire.
 *
 * - DAF / TENANT_ADMIN  → `/direction-financiere/recouvrement`
 *   (vue d'ensemble : tous les dossiers, tableau de bord recouvrement)
 * - Autres rôles assignés au suivi (ACCOUNTANT, SECRETARY_GENERAL, etc.)
 *   → `/suivi-paiement`
 *   (vue personnelle : uniquement les dossiers dont je suis responsable)
 *
 * Le `/direction-financiere/recouvrement` n'est accessible qu'au DAF —
 * y envoyer un comptable assigné causerait une redirection vers le
 * dashboard et un comportement déroutant.
 */
export function paymentTrackLinkForRole(role: Role): string {
  if (role === Role.DAF || role === Role.TENANT_ADMIN) {
    return "/direction-financiere/recouvrement";
  }
  return "/suivi-paiement";
}

/**
 * Variante asynchrone : prend un userId, lit le rôle en BDD, retourne le
 * lien adapté. Fallback `/suivi-paiement` si l'utilisateur est introuvable
 * (cas peu probable mais on évite de casser la création de notification).
 */
export async function paymentTrackLinkForUser(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return "/suivi-paiement";
  return paymentTrackLinkForRole(user.role);
}
