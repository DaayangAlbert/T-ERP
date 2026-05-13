import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSg } from "@/lib/rbac/sg-guard";
import { ApprovalStatus, GedAuditAction } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StartRenewalSchema = z.object({
  newExpiresAt: z.string().datetime(),
  newApprovalNumber: z.string().min(3).max(60).optional(),
  documentUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardSg("canManageCorporateGovernance");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = StartRenewalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.professionalApproval.findFirst({
    where: { id: params.id, tenantId },
    select: { id: true, approvalName: true, approvalNumber: true, expiresAt: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Agrément introuvable" }, { status: 404 });
  }

  const newExpiry = new Date(parsed.data.newExpiresAt);
  if (newExpiry.getTime() <= Date.now()) {
    return NextResponse.json({ error: "La nouvelle date d'expiration doit être future" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.professionalApproval.update({
      where: { id: existing.id },
      data: {
        status: ApprovalStatus.RENEWED,
        issuedAt: new Date(),
        expiresAt: newExpiry,
        approvalNumber: parsed.data.newApprovalNumber ?? existing.approvalNumber,
        documentUrl: parsed.data.documentUrl ?? null,
        renewalReminderSent: false,
      },
    });
    await tx.gedAuditEvent.create({
      data: {
        tenantId,
        actorId: session.sub,
        action: GedAuditAction.WORKFLOW_DECISION,
        metadata: {
          kind: "APPROVAL_RENEWAL_STARTED",
          approvalId: existing.id,
          approvalName: existing.approvalName,
          previousExpiry: existing.expiresAt.toISOString(),
          newExpiry: newExpiry.toISOString(),
          notes: parsed.data.notes ?? null,
        },
      },
    });
  });

  return NextResponse.json({ ok: true, newExpiresAt: newExpiry.toISOString() });
}
