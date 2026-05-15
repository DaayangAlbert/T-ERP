import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { z } from "zod";

export const dynamic = "force-dynamic";

const EventSchema = z.object({
  eventType: z.string().min(2).max(60),
  eventDate: z.string().datetime().optional(),
  description: z.string().min(3).max(2000),
  documentUrl: z.string().url().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageLegalCases");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = EventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const c = await prisma.legalCase.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true },
  });
  if (!c) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  const ev = await prisma.legalCaseEvent.create({
    data: {
      caseId: c.id,
      eventType: parsed.data.eventType,
      eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : new Date(),
      description: parsed.data.description,
      documentUrl: parsed.data.documentUrl ?? null,
    },
    select: { id: true, eventDate: true },
  });

  return NextResponse.json({ id: ev.id, eventDate: ev.eventDate.toISOString() }, { status: 201 });
}
