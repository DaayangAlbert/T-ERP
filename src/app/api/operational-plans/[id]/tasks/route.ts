import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOperationalPlanWrite } from "@/lib/rbac/operational-plan-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(200),
  plannedStart: z.string().min(8),
  plannedEnd: z.string().min(8),
  assignedTeamId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const plan = await prisma.operationalPlan.findUnique({
    where: { id: params.id },
    select: { id: true, siteId: true, periodStart: true, periodEnd: true },
  });
  if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

  const guard = await guardOperationalPlanWrite(plan.siteId);
  if (guard instanceof NextResponse) return guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const start = new Date(parsed.data.plannedStart);
  const end = new Date(parsed.data.plannedEnd);
  if (end <= start) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  const created = await prisma.operationalTask.create({
    data: {
      planId: plan.id,
      name: parsed.data.name.trim(),
      plannedStart: start,
      plannedEnd: end,
      assignedTeamId: parsed.data.assignedTeamId?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
