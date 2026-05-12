import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  diploma: z.string().min(1).max(120).optional(),
  institution: z.string().min(1).max(120).optional(),
  year: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 7)
    .optional(),
  description: z.string().max(1000).nullable().optional(),
});

async function assertOwn(userId: string, id: string) {
  const f = await prisma.candidateFormation.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!f) return "not_found" as const;
  if (f.userId !== userId) return "forbidden" as const;
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

  const updated = await prisma.candidateFormation.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ formation: updated });
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

  await prisma.candidateFormation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
