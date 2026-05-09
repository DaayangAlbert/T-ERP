import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createTrainingSchema } from "@/schemas/hr";
import { TrainingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as TrainingStatus | null;

  const where: Record<string, unknown> = { tenantId: session.tenantId };
  if (status) where.status = status;

  const items = await prisma.training.findMany({
    where,
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 200,
    include: { user: { select: { firstName: true, lastName: true, position: true } } },
  });

  return NextResponse.json({
    items: items.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      provider: t.provider,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      cost: t.cost?.toString() ?? null,
      status: t.status,
      certificateUrl: t.certificateUrl,
      expiresAt: t.expiresAt?.toISOString() ?? null,
      user: { name: `${t.user.firstName} ${t.user.lastName}`, position: t.user.position },
    })),
    summary: {
      planned: items.filter((t) => t.status === "PLANNED").length,
      inProgress: items.filter((t) => t.status === "IN_PROGRESS").length,
      completed: items.filter((t) => t.status === "COMPLETED").length,
      totalCost: items.reduce((s, t) => s + (t.cost ?? 0n), 0n).toString(),
    },
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createTrainingSchema.parse(await req.json());
    const created = await prisma.training.create({
      data: {
        tenantId: session.tenantId,
        userId: data.userId,
        title: data.title,
        category: data.category,
        provider: data.provider,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        cost: data.cost ? BigInt(data.cost) : null,
        status: data.status,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
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
