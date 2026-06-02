import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

const schema = z.object({
  name: z.string().min(2).max(200).optional(),
  plannedStart: z.string().min(8).optional(),
  plannedEnd: z.string().min(8).optional(),
  progressPercent: z.coerce.number().min(0).max(100).optional(),
});

async function loadTask(id: string) {
  return prisma.siteTask.findUnique({
    where: { id },
    include: { phase: { select: { planning: { select: { siteId: true } } } } },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const task = await loadTask(params.id);
  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(task.phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const nextStart = d.plannedStart ? new Date(d.plannedStart) : task.plannedStart;
  const nextEnd = d.plannedEnd ? new Date(d.plannedEnd) : task.plannedEnd;
  if (nextEnd <= nextStart) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  await prisma.siteTask.update({
    where: { id: task.id },
    data: {
      name: d.name?.trim() ?? task.name,
      plannedStart: nextStart,
      plannedEnd: nextEnd,
      progressPercent: d.progressPercent ?? task.progressPercent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const task = await loadTask(params.id);
  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(task.phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;

  await prisma.siteTask.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
