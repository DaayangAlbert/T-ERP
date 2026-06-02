import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardDtravSiteMutation } from "@/lib/rbac/dtrav-guard";

const schema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().min(2).max(200),
  contractDueDate: z.string().min(8),
});

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const guard = await guardDtravSiteMutation(params.siteId);
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const planning = await prisma.sitePlanning.findUnique({ where: { siteId: params.siteId } });
  if (!planning) return NextResponse.json({ error: "Planning non initialisé" }, { status: 404 });

  const created = await prisma.siteMilestone.create({
    data: {
      planningId: planning.id,
      code: parsed.data.code.trim(),
      description: parsed.data.description.trim(),
      contractDueDate: new Date(parsed.data.contractDueDate),
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId!,
      userId: session.sub,
      action: "dtrav.milestone.create",
      entityType: "SiteMilestone",
      entityId: created.id,
      metadata: { siteId: params.siteId, code: parsed.data.code },
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
