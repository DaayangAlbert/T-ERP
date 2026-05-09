import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createDelegationSchema } from "@/schemas/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const items = await prisma.delegation.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      fromUser: { select: { firstName: true, lastName: true, role: true } },
      toUser: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  return NextResponse.json({
    items: items.map((d) => ({
      id: d.id,
      from: { name: `${d.fromUser.firstName} ${d.fromUser.lastName}`, role: d.fromUser.role },
      to: { name: `${d.toUser.firstName} ${d.toUser.lastName}`, role: d.toUser.role },
      types: d.types,
      maxAmount: d.maxAmount?.toString() ?? null,
      startDate: d.startDate.toISOString(),
      endDate: d.endDate?.toISOString() ?? null,
      active: d.active,
      reason: d.reason,
      createdAt: d.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createDelegationSchema.parse(await req.json());

    const created = await prisma.delegation.create({
      data: {
        tenantId: session.tenantId,
        fromUserId: session.sub,
        toUserId: data.toUserId,
        types: data.types,
        maxAmount: data.maxAmount ? BigInt(data.maxAmount) : null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        active: true,
        reason: data.reason,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/validations/delegations]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
