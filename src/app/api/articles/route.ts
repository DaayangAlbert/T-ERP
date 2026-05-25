import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role, ArticleCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// Catalogue articles partagé. Lecture large ; création réservée au magasinier
// et au chargé des achats (+ DAF / admin).
const VIEW_ROLES: Role[] = [
  Role.PURCHASING_OFFICER, Role.WAREHOUSE, Role.DAF, Role.DG, Role.TENANT_ADMIN,
  Role.SITE_MANAGER, Role.WORKS_MANAGER, Role.LOGISTICS,
];
const MANAGE_ROLES: Role[] = [Role.WAREHOUSE, Role.PURCHASING_OFFICER, Role.DAF, Role.TENANT_ADMIN];

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  CEMENT_CONCRETE: "Ciment & béton",
  STEEL_REBAR: "Acier / ferraillage",
  AGGREGATES: "Agrégats",
  FORMWORK: "Coffrage",
  FUEL: "Carburant",
  CONSUMABLES: "Consommables",
  TOOLS: "Outillage",
  PPE: "EPI / sécurité",
  OTHER: "Autre",
};

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!VIEW_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const scopeIds = await getTenantScopeIds(session.tenantId);
  const search = new URL(req.url).searchParams.get("search")?.trim();
  const items = await prisma.article.findMany({
    where: {
      tenantId: { in: scopeIds },
      active: true,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] } : {}),
    },
    select: { id: true, code: true, name: true, category: true, unit: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 1000,
  });
  return NextResponse.json({
    items: items.map((a) => ({ ...a, categoryLabel: CATEGORY_LABELS[a.category] })),
    canManage: MANAGE_ROLES.includes(session.role as Role),
  });
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.nativeEnum(ArticleCategory),
  unit: z.string().min(1).max(20),
  code: z.string().max(40).optional(),
});

async function nextCode(tenantId: string): Promise<string> {
  const existing = await prisma.article.findMany({
    where: { tenantId, code: { startsWith: "ART-" } },
    select: { code: true },
  });
  let max = 0;
  for (const { code } of existing) {
    const m = code.match(/^ART-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `ART-${String(max + 1).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé magasinier / chargé des achats" }, { status: 403 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const code = data.code?.trim() || (await nextCode(session.tenantId));
    const exists = await prisma.article.findFirst({ where: { tenantId: session.tenantId, code }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "Ce code article existe déjà" }, { status: 409 });

    const created = await prisma.article.create({
      data: { tenantId: session.tenantId, code, name: data.name.trim(), category: data.category, unit: data.unit.trim() },
      select: { id: true, code: true, name: true, category: true, unit: true },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "article.create",
        entityType: "Article",
        entityId: created.id,
        metadata: { code, name: created.name, category: created.category },
      },
    });
    return NextResponse.json({ ...created, categoryLabel: CATEGORY_LABELS[created.category] });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    console.error("[POST /api/articles]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
