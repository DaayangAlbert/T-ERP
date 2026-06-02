import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOperationalPlanWrite } from "@/lib/rbac/operational-plan-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(200).optional(),
  plannedStart: z.string().min(8).optional(),
  plannedEnd: z.string().min(8).optional(),
  progressPercent: z.coerce.number().min(0).max(100).optional(),
  assignedTeamId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

async function loadTask(id: string) {
  return prisma.operationalTask.findUnique({
    where: { id },
    include: { plan: { select: { siteId: true } } },
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const task = await loadTask(params.id);
  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanWrite(task.plan.siteId);
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

  await prisma.operationalTask.update({
    where: { id: task.id },
    data: {
      name: d.name?.trim() ?? task.name,
      plannedStart: nextStart,
      plannedEnd: nextEnd,
      progressPercent: d.progressPercent ?? task.progressPercent,
      assignedTeamId: d.assignedTeamId !== undefined ? d.assignedTeamId?.trim() || null : task.assignedTeamId,
      notes: d.notes !== undefined ? d.notes?.trim() || null : task.notes,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const task = await loadTask(params.id);
  if (!task) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanWrite(task.plan.siteId);
  if (guard instanceof NextResponse) return guard;

  await prisma.operationalTask.delete({ where: { id: task.id } });
  return NextResponse.json({ ok: true });
}
