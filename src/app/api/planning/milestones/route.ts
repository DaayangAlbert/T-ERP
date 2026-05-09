import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { getTenantScopeIds } from "@/lib/tenant";
import { createMilestoneSchema } from "@/schemas/planning";
import { MilestoneType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as MilestoneType | null;
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  const scopeIds = await getTenantScopeIds(session.tenantId);

  const where: Record<string, unknown> = { tenantId: { in: scopeIds } };
  if (type) where.type = type;
  if (fromParam || toParam) {
    where.date = {};
    if (fromParam) (where.date as Record<string, Date>).gte = new Date(fromParam);
    if (toParam) (where.date as Record<string, Date>).lte = new Date(toParam);
  }

  const items = await prisma.milestone.findMany({
    where,
    orderBy: { date: "asc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      date: m.date.toISOString(),
      siteId: m.siteId,
      critical: m.critical,
      status: m.status,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createMilestoneSchema.parse(await req.json());
    const created = await prisma.milestone.create({
      data: {
        tenantId: session.tenantId,
        type: data.type,
        title: data.title,
        date: new Date(data.date),
        siteId: data.siteId ?? null,
        critical: data.critical,
        notes: data.notes,
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
