import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  position: z.string().min(1).max(120).optional(),
  company: z.string().min(1).max(120).optional(),
  location: z.string().max(120).nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().max(2000).nullable().optional(),
});

async function assertOwn(userId: string, id: string) {
  const exp = await prisma.candidateExperience.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!exp) return "not_found" as const;
  if (exp.userId !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const own = await assertOwn(session.sub, params.id);
  if (own === "not_found")
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (own === "forbidden")
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const updated = await prisma.candidateExperience.update({
    where: { id: params.id },
    data: {
      ...(d.position !== undefined && { position: d.position }),
      ...(d.company !== undefined && { company: d.company }),
      ...(d.location !== undefined && { location: d.location }),
      ...(d.startDate !== undefined && { startDate: new Date(d.startDate) }),
      ...(d.endDate !== undefined && {
        endDate: d.endDate ? new Date(d.endDate) : null,
      }),
      ...(d.isCurrent !== undefined && { isCurrent: d.isCurrent }),
      ...(d.description !== undefined && { description: d.description }),
    },
  });

  return NextResponse.json({
    experience: {
      ...updated,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const own = await assertOwn(session.sub, params.id);
  if (own === "not_found")
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (own === "forbidden")
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  await prisma.candidateExperience.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
