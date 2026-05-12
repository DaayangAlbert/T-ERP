import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const createSchema = z
  .object({
    position: z.string().min(1).max(120),
    company: z.string().min(1).max(120),
    location: z.string().max(120).nullable().optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable().optional(),
    isCurrent: z.boolean().optional(),
    description: z.string().max(2000).nullable().optional(),
  })
  .refine((d) => !(d.endDate && d.isCurrent), {
    message: "Une expérience en cours ne peut pas avoir de date de fin",
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

  const maxOrder = await prisma.candidateExperience.aggregate({
    where: { userId: session.sub },
    _max: { order: true },
  });

  const created = await prisma.candidateExperience.create({
    data: {
      userId: session.sub,
      position: parsed.data.position,
      company: parsed.data.company,
      location: parsed.data.location ?? null,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      isCurrent: parsed.data.isCurrent ?? false,
      description: parsed.data.description ?? null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  return NextResponse.json({
    experience: {
      ...created,
      startDate: created.startDate.toISOString(),
      endDate: created.endDate?.toISOString() ?? null,
    },
  });
}
