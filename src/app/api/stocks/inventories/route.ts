import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createInventorySchema } from "@/schemas/stocks";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.inventory.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      siteId: i.siteId,
      period: i.period,
      itemsCount: i.itemsCount,
      gapsCount: i.gapsCount,
      gapsValue: i.gapsValue.toString(),
      status: i.status,
      dgValidated: i.dgValidated,
      startDate: i.startDate.toISOString(),
      endDate: i.endDate?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createInventorySchema.parse(await req.json());
    const created = await prisma.inventory.create({
      data: {
        tenantId: session.tenantId,
        siteId: data.siteId ?? null,
        period: data.period,
        startDate: new Date(data.startDate),
        status: "PLANNED",
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
