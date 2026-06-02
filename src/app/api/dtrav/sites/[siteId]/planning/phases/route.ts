import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(160),
  plannedStart: z.string().min(8),
  plannedEnd: z.string().min(8),
});

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const planning = await prisma.sitePlanning.findUnique({ where: { siteId: params.siteId } });
  if (!planning) return NextResponse.json({ error: "Planning non initialisé" }, { status: 404 });

  const start = new Date(parsed.data.plannedStart);
  const end = new Date(parsed.data.plannedEnd);
  if (end <= start) {
    return NextResponse.json({ error: "La date de fin doit être après le début" }, { status: 400 });
  }

  const last = await prisma.sitePhase.findFirst({
    where: { planningId: planning.id },
    orderBy: { orderIndex: "desc" },
    select: { orderIndex: true },
  });
  const orderIndex = (last?.orderIndex ?? -1) + 1;

  const created = await prisma.sitePhase.create({
    data: {
      planningId: planning.id,
      orderIndex,
      name: parsed.data.name.trim(),
      plannedStart: start,
      plannedEnd: end,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.phase.create",
      entityType: "SitePhase",
      entityId: created.id,
      metadata: { siteId: params.siteId, name: parsed.data.name },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
