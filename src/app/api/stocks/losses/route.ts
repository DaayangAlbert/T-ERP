import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createLossSchema } from "@/schemas/stocks";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.loss.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { occurredAt: "desc" },
  });

  const totalValue = items.reduce((s, l) => s + l.value, 0n);
  const totalIndemnification = items.reduce((s, l) => s + (l.indemnification ?? 0n), 0n);

  return NextResponse.json({
    items: items.map((l) => ({
      id: l.id,
      type: l.type,
      itemDescription: l.itemDescription,
      value: l.value.toString(),
      siteId: l.siteId,
      occurredAt: l.occurredAt.toISOString(),
      declaredToInsurance: l.declaredToInsurance,
      declaredAt: l.declaredAt?.toISOString() ?? null,
      indemnification: l.indemnification?.toString() ?? null,
      correctiveActions: l.correctiveActions,
    })),
    summary: {
      total: items.length,
      totalValue: totalValue.toString(),
      totalIndemnification: totalIndemnification.toString(),
      netLoss: (totalValue - totalIndemnification).toString(),
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createLossSchema.parse(await req.json());
    const created = await prisma.loss.create({
      data: {
        tenantId: session.tenantId,
        type: data.type,
        itemDescription: data.itemDescription,
        value: BigInt(data.value),
        siteId: data.siteId ?? null,
        occurredAt: new Date(data.occurredAt),
        declaredToInsurance: data.declaredToInsurance,
        declaredAt: data.declaredToInsurance ? new Date() : null,
        indemnification: data.indemnification ? BigInt(data.indemnification) : null,
        correctiveActions: data.correctiveActions,
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
