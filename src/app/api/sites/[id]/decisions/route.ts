import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const createDecisionSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(5).max(2000),
});

const DG_ROLES: Role[] = [Role.DG, Role.TECH_DIRECTOR, Role.WORKS_DIRECTOR];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const scopeIds = await getTenantScopeIds(session.tenantId);
  const site = await prisma.site.findFirst({
    where: { id: params.id, tenantId: { in: scopeIds } },
    select: { id: true },
  });
  if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const decisions = await prisma.siteDecision.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: "desc" },
  });

  // Récupérer les noms d'auteurs
  const authorIds = Array.from(new Set(decisions.map((d) => d.authorId)));
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const byId = new Map(authors.map((a) => [a.id, a]));

  return NextResponse.json({
    items: decisions.map((d) => ({
      id: d.id,
      title: d.title,
      body: d.body,
      author: byId.get(d.authorId)
        ? { name: `${byId.get(d.authorId)!.firstName} ${byId.get(d.authorId)!.lastName}`, role: byId.get(d.authorId)!.role }
        : { name: "—", role: null },
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DG_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé à la direction" }, { status: 403 });
  }

  try {
    const data = createDecisionSchema.parse(await req.json());
    const scopeIds = await getTenantScopeIds(session.tenantId);
    const site = await prisma.site.findFirst({
      where: { id: params.id, tenantId: { in: scopeIds } },
      select: { id: true },
    });
    if (!site) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const created = await prisma.siteDecision.create({
      data: {
        siteId: site.id,
        authorId: session.sub,
        title: data.title,
        body: data.body,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "site.decision.create",
        entityType: "Site",
        entityId: site.id,
        metadata: { decisionId: created.id, title: data.title },
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
