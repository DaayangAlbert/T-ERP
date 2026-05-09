import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { createAgendaEventSchema } from "@/schemas/profile";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = { userId: session.sub };
  if (from || to) {
    where.startAt = {};
    if (from) (where.startAt as Record<string, Date>).gte = new Date(from);
    if (to) (where.startAt as Record<string, Date>).lte = new Date(to);
  }

  const items = await prisma.agendaEvent.findMany({
    where,
    orderBy: { startAt: "asc" },
    take: 200,
  });

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      location: e.location,
      type: e.type,
      externalId: e.externalId,
    })),
  });
}

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = createAgendaEventSchema.parse(await req.json());
    const created = await prisma.agendaEvent.create({
      data: {
        userId: session.sub,
        title: data.title,
        description: data.description,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        location: data.location,
        type: data.type,
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
