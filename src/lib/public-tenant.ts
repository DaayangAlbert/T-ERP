import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Résout le tenant courant pour les routes publiques `/recrutement/*`.
 *
 * Source de vérité : header `x-tenant-slug` posé par le middleware
 * (qui le déduit du sous-domaine en prod, du cookie/queryparam en dev).
 *
 * Retourne null si aucun slug n'est résolu — l'appelant doit gérer le 404.
 */
export async function resolvePublicTenant() {
  const h = headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return null;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryColor: true,
      logoUrl: true,
      sector: true,
    },
  });
  return tenant;
}
