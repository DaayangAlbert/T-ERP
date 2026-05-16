import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { SiteMilestoneStatus } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ms = await prisma.siteMilestone.findUnique({
    where: { id: params.id },
    include: { planning: { select: { siteId: true } } },
  });
  if (!ms) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(ms.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const today = new Date();
  const late = today > ms.contractDueDate;

  await prisma.siteMilestone.update({
    where: { id: ms.id },
    data: {
      status: late ? SiteMilestoneStatus.LATE : SiteMilestoneStatus.REACHED,
      actualDate: today,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.milestone.reach",
      entityType: "SiteMilestone",
      entityId: ms.id,
      metadata: { code: ms.code, late },
    },
  });

  return NextResponse.json({ ok: true, late });
}
