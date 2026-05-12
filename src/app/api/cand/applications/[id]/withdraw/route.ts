import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().max(240).nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, stage: true, jobOfferId: true },
  });
  if (!app)
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  if (app.userId !== session.sub)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  if (["HIRED", "REJECTED", "WITHDRAWN"].includes(app.stage))
    return NextResponse.json(
      { error: "Cette candidature ne peut plus être retirée" },
      { status: 400 },
    );

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await prisma.application.update({
    where: { id: params.id },
    data: {
      stage: "WITHDRAWN",
      withdrawnAt: new Date(),
      withdrawnReason: parsed.data.reason ?? null,
      lastStageChangeAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
