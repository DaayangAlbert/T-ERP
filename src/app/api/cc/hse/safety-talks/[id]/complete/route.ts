import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCcSiteMutation } from "@/lib/rbac/cc-guard";

const schema = z.object({
  attendeesCount: z.coerce.number().int().nonnegative(),
  attendeesIds: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCcSiteMutation();
  if (guard instanceof NextResponse) return guard;
  const { session, siteId } = guard;

  const talk = await prisma.hseSafetyTalk.findFirst({
    where: {
      id: params.id,
      siteId,
      site: { tenantId: session.tenantId! },
    },
  });
  if (!talk) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.hseSafetyTalk.update({
    where: { id: talk.id },
    data: {
      completedAt: new Date(),
      completedById: session.sub,
      attendeesCount: parsed.data.attendeesCount,
      attendeesIds: parsed.data.attendeesIds,
    },
  });

  return NextResponse.json({ ok: true });
}
