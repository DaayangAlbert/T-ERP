import { prisma } from "@/lib/prisma";

const RESERVED = new Set([
  "app", "admin", "api", "www", "mail", "ftp", "static", "assets", "cdn",
  "docs", "blog", "support", "help", "auth", "login", "register", "dashboard",
  "terp", "system", "test", "staging", "prod", "demo",
]);

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function ensureUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  if (!slug || RESERVED.has(slug)) {
    throw new Error(`Slug "${slug || base}" non autorisé`);
  }
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (!existing) return slug;

  for (let i = 2; i < 100; i++) {
    const candidate = `${slug}-${i}`.slice(0, 32);
    const taken = await prisma.tenant.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  throw new Error("Impossible de générer un sous-domaine unique");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}
