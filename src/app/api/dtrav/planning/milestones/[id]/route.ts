import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

async function loadMilestone(id: string) {
  return prisma.siteMilestone.findUnique({
    where: { id },
    include: { planning: { select: { siteId: true } } },
  });
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
