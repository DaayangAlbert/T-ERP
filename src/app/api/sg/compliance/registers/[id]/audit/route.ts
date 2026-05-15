import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSgMutation } from "@/lib/rbac/sg-guard";
import { GedAuditAction, RegisterStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AuditSchema = z.object({
  newStatus: z.enum(["UP_TO_DATE", "TO_UPDATE", "OVERDUE"]),
  notes: z.string().max(1000).optional(),
  nextReviewInDays: z.number().int().min(7).max(365).default(90),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSgMutation("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = AuditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.regulatoryRegister.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, registerType: true, name: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Registre introuvable" }, { status: 404 });
  }

  const nextDate = new Date(Date.now() + parsed.data.nextReviewInDays * 86_400_000);
  await prisma.$transaction(async (tx) => {
    await tx.regulatoryRegister.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.newStatus as RegisterStatus,
        nextReviewDate: nextDate,
      },
    });
    await tx.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: session.sub,
        action: GedAuditAction.WORKFLOW_DECISION,
        metadata: {
          kind: "COMPLIANCE_REGISTER_AUDIT",
          registerId: existing.id,
          registerType: existing.registerType,
          previousStatus: existing.status,
          newStatus: parsed.data.newStatus,
          nextReviewDate: nextDate.toISOString(),
          notes: parsed.data.notes ?? null,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, nextReviewDate: nextDate.toISOString() });
}
