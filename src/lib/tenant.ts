import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Tenant } from "@prisma/client";

export function getTenantSlugFromHeaders(): string | null {
  const slug = headers().get("x-tenant-slug");
  return slug && slug.length > 0 ? slug : null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getTenantFromHeaders(): Promise<Tenant | null> {
  const slug = getTenantSlugFromHeaders();
  if (!slug) return null;
  return getTenantBySlug(slug);
}

/**
 * Phase 2 / fn 1.2 — résolution du scope de données.
 *
 * Quand un utilisateur appartient à un tenant marqué `isGroup`, ses requêtes
 * doivent inclure les enfants (filiales) en plus de la mère. Pour les tenants
 * standalone, on retourne juste l'id du tenant.
 *
 * Renvoie une liste d'ids tenant à utiliser dans { tenantId: { in: ids } }.
 */
export async function getTenantScopeIds(tenantId: string): Promise<string[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      isGroup: true,
      children: { select: { id: true } },
    },
  });
  if (!tenant) return [];
  if (!tenant.isGroup || tenant.children.length === 0) return [tenant.id];
  return [tenant.id, ...tenant.children.map((c) => c.id)];
}
