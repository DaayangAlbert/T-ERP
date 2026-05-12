import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * Résout le tenant courant pour les routes publiques `/recrutement/*`.
 *
 * Source de vérité : header `x-tenant-slug` posé par le middleware
 * (qui le déduit du sous-domaine en prod, du cookie/queryparam en dev).
 *
 * Fallback dev : si pas de slug, on prend "batimcam" pour faire tourner la démo.
 */
export async function resolvePublicTenant() {
  const h = headers();
  const slug = h.get("x-tenant-slug") || "batimcam";
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
