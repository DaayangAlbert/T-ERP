import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

async function loadMilestone(id: string) {
  return prisma.siteMilestone.findUnique({
    where: { id },
    include: { planning: { select: { siteId: true } } },
  });
}

const patchSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  description: z.string().min(2).max(200).optional(),
  contractDueDate: z.string().min(8).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const m = await loadMilestone(params.id);
  if (!m) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(m.planning.siteId);
  if (guard instanceof NextResponse) return guard;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  await prisma.siteMilestone.update({
    where: { id: m.id },
    data: {
      code: d.code?.trim() ?? m.code,
      description: d.description?.trim() ?? m.description,
      contractDueDate: d.contractDueDate ? new Date(d.contractDueDate) : m.contractDueDate,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const m = await loadMilestone(params.id);
  if (!m) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(m.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  await prisma.siteMilestone.delete({ where: { id: m.id } });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.milestone.delete",
      entityType: "SiteMilestone",
      entityId: m.id,
      metadata: { code: m.code },
    },
  });

  return NextResponse.json({ ok: true });
}
