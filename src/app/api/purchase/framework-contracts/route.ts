import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createFrameworkContractSchema } from "@/schemas/purchase";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.frameworkContract.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { endDate: "asc" },
    include: { supplier: { select: { name: true, category: true } } },
  });

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      reference: c.reference,
      subject: c.subject,
      maxAmount: c.maxAmount.toString(),
      usedAmount: c.usedAmount.toString(),
      remaining: (c.maxAmount - c.usedAmount).toString(),
      usagePct: c.maxAmount > 0n ? Number((c.usedAmount * 100n) / c.maxAmount) : 0,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      conditions: c.conditions,
      status: c.status,
      supplier: c.supplier,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createFrameworkContractSchema.parse(await req.json());
    const created = await prisma.frameworkContract.create({
      data: {
        tenantId: session.tenantId,
        supplierId: data.supplierId,
        reference: data.reference,
        subject: data.subject,
        maxAmount: BigInt(data.maxAmount),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        conditions: (data.conditions ?? {}) as object,
        status: data.status,
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
