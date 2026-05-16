import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";
import { PhaseStatus } from "@prisma/client";

const schema = z.object({
  progressPercent: z.coerce.number().min(0).max(100).optional(),
  status: z.nativeEnum(PhaseStatus).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const phase = await prisma.sitePhase.findUnique({
    where: { id: params.id },
    include: { planning: { select: { siteId: true } } },
  });
  if (!phase) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const guard = await guardDtravSiteMutation(phase.planning.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const before = { progressPercent: phase.progressPercent, status: phase.status };
  const updated = await prisma.sitePhase.update({
    where: { id: phase.id },
    data: {
      progressPercent: parsed.data.progressPercent ?? phase.progressPercent,
      status: parsed.data.status ?? phase.status,
      actualEnd:
        (parsed.data.progressPercent ?? phase.progressPercent) >= 100 && !phase.actualEnd
          ? new Date()
          : phase.actualEnd,
      actualStart:
        !phase.actualStart && (parsed.data.progressPercent ?? phase.progressPercent) > 0
          ? new Date()
          : phase.actualStart,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.phase.update",
      entityType: "SitePhase",
      entityId: phase.id,
      metadata: { before, after: { progressPercent: updated.progressPercent, status: updated.status } },
    },
  });

  return NextResponse.json({ progressPercent: updated.progressPercent, status: updated.status });
}
