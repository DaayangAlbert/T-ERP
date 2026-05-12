import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  diploma: z.string().min(1).max(120),
  institution: z.string().min(1).max(120),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 7),
  description: z.string().max(1000).nullable().optional(),
});

export async function POST(req: Request) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const maxOrder = await prisma.candidateFormation.aggregate({
    where: { userId: session.sub },
    _max: { order: true },
  });

  const created = await prisma.candidateFormation.create({
    data: {
      userId: session.sub,
      diploma: parsed.data.diploma,
      institution: parsed.data.institution,
      year: parsed.data.year,
      description: parsed.data.description ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({ formation: created });
}
