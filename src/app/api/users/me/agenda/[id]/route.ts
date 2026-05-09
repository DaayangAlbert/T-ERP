import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateAgendaEventSchema } from "@/schemas/profile";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const data = updateAgendaEventSchema.parse(await req.json());
    const event = await prisma.agendaEvent.findFirst({
      where: { id: params.id, userId: session.sub },
    });
    if (!event) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.agendaEvent.update({
      where: { id: event.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.startAt !== undefined && { startAt: new Date(data.startAt) }),
        ...(data.endAt !== undefined && { endAt: new Date(data.endAt) }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.type !== undefined && { type: data.type }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const event = await prisma.agendaEvent.findFirst({
    where: { id: params.id, userId: session.sub },
  });
  if (!event) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.agendaEvent.delete({ where: { id: event.id } });
  return NextResponse.json({ ok: true });
}
