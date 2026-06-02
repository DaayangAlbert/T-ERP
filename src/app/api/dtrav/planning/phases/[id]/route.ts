import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { PhaseStatus } from "@prisma/client";

const schema = z.object({
  name: z.string().min(2).max(160).optional(),
  plannedStart: z.string().min(8).optional(),
  plannedEnd: z.string().min(8).optional(),
  progressPercent: z.coerce.number().min(0).max(100).optional(),
  status: z.nativeEnum(PhaseStatus).optional(),
});

async function loadPhase(id: string) {
  return prisma.sitePhase.findUnique({
    where: { id },
    include: { planning: { select: { siteId: true } } },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const phase = await loadPhase(params.id);
  if (!phase) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const nextStart = d.plannedStart ? new Date(d.plannedStart) : phase.plannedStart;
  const nextEnd = d.plannedEnd ? new Date(d.plannedEnd) : phase.plannedEnd;
  if (nextEnd <= nextStart) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }
  const nextProgress = d.progressPercent ?? phase.progressPercent;

  const before = { progressPercent: phase.progressPercent, status: phase.status, name: phase.name };
  const updated = await prisma.sitePhase.update({
    where: { id: phase.id },
    data: {
      name: d.name?.trim() ?? phase.name,
      plannedStart: nextStart,
      plannedEnd: nextEnd,
      progressPercent: nextProgress,
      status: d.status ?? phase.status,
      actualEnd: nextProgress >= 100 && !phase.actualEnd ? new Date() : phase.actualEnd,
      actualStart: !phase.actualStart && nextProgress > 0 ? new Date() : phase.actualStart,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.phase.update",
      entityType: "SitePhase",
      entityId: phase.id,
      metadata: { before, after: { progressPercent: updated.progressPercent, status: updated.status, name: updated.name } },
    },
  });

  return NextResponse.json({
    progressPercent: updated.progressPercent,
    status: updated.status,
    name: updated.name,
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const phase = await loadPhase(params.id);
  if (!phase) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  await prisma.sitePhase.delete({ where: { id: phase.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.phase.delete",
      entityType: "SitePhase",
      entityId: phase.id,
      metadata: { name: phase.name },
    },
  });

  return NextResponse.json({ ok: true });
}
