import { NextResponse } from "next/server";
import { z } from "zod";
import { OperationalPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guardOperationalPlanRead, guardOperationalPlanWrite } from "@/lib/rbac/operational-plan-guard";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().max(160).optional().nullable(),
  objective: z.string().max(4000).optional().nullable(),
  periodStart: z.string().min(8).optional(),
  periodEnd: z.string().min(8).optional(),
  status: z.nativeEnum(OperationalPlanStatus).optional(),
});

async function loadPlan(id: string) {
  return prisma.operationalPlan.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { plannedStart: "asc" } },
      author: { select: { firstName: true, lastName: true, role: true } },
      site: { select: { id: true, code: true, name: true, client: true, region: true, moaName: true } },
    },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const plan = await loadPlan(params.id);
  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanRead(plan.siteId);
  if (guard instanceof NextResponse) return guard;

  return NextResponse.json({
    id: plan.id,
    horizon: plan.horizon,
    periodStart: plan.periodStart.toISOString(),
    periodEnd: plan.periodEnd.toISOString(),
    title: plan.title,
    objective: plan.objective,
    status: plan.status,
    author: `${plan.author.firstName} ${plan.author.lastName}`.trim(),
    authorRole: plan.author.role,
    site: plan.site,
    tasks: plan.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      plannedStart: t.plannedStart.toISOString(),
      plannedEnd: t.plannedEnd.toISOString(),
      progressPercent: t.progressPercent,
      assignedTeamId: t.assignedTeamId,
      notes: t.notes,
    })),
    canEdit: guard.canEdit,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const plan = await loadPlan(params.id);
  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanWrite(plan.siteId);
  if (guard instanceof NextResponse) return guard;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const nextStart = d.periodStart ? new Date(d.periodStart) : plan.periodStart;
  const nextEnd = d.periodEnd ? new Date(d.periodEnd) : plan.periodEnd;
  if (nextEnd <= nextStart) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  const updated = await prisma.operationalPlan.update({
    where: { id: plan.id },
    data: {
      title: d.title !== undefined ? d.title?.trim() || null : plan.title,
      objective: d.objective !== undefined ? d.objective?.trim() || null : plan.objective,
      periodStart: nextStart,
      periodEnd: nextEnd,
      status: d.status ?? plan.status,
    },
  });

  return NextResponse.json({ ok: true, status: updated.status });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const plan = await loadPlan(params.id);
  if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanWrite(plan.siteId);
  if (guard instanceof NextResponse) return guard;

  await prisma.operationalPlan.delete({ where: { id: plan.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: guard.session.tenantId!,
      userId: guard.session.sub,
      action: "operational-plan.delete",
      entityType: "OperationalPlan",
      entityId: plan.id,
      metadata: { siteId: plan.siteId, horizon: plan.horizon },
    },
  });

  return NextResponse.json({ ok: true });
}
