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
