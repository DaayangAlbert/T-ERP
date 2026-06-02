import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

const schema = z.object({
  name: z.string().min(2).max(200),
  plannedStart: z.string().min(8),
  plannedEnd: z.string().min(8),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const phase = await prisma.sitePhase.findUnique({
    where: { id: params.id },
    include: { planning: { select: { siteId: true } } },
  });
  if (!phase) return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const start = new Date(parsed.data.plannedStart);
  const end = new Date(parsed.data.plannedEnd);
  if (end <= start) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  const created = await prisma.siteTask.create({
    data: {
      phaseId: phase.id,
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
      action: "dtrav.task.create",
      entityType: "SiteTask",
      entityId: created.id,
      metadata: { phaseId: phase.id, name: parsed.data.name },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
