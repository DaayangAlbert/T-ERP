import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardGed } from "@/lib/rbac/ged-guard";
import { GedAuditAction, Role, WorkflowStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(3).max(2000),
});

// Annulation manuelle — réservée ARCHIVIST + DG.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardGed();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;
  const tenantId = session.tenantId!;
  const userId = session.sub;

  if (session.role !== Role.ARCHIVIST && session.role !== Role.DG && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Annulation réservée ARCHIVIST / DG" }, { status: 403 });
  }

  const wf = await prisma.documentWorkflowInstance.findFirst({
    where: { id: params.id, document: { tenantId } },
    select: { id: true, status: true, reference: true },
  });
  if (!wf) {
    return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 });
  }
  if (wf.status === WorkflowStatus.COMPLETED || wf.status === WorkflowStatus.CANCELLED || wf.status === WorkflowStatus.REJECTED) {
    return NextResponse.json({ error: "Workflow déjà terminé" }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await prisma.$transaction([
      prisma.documentWorkflowInstance.update({
        where: { id: wf.id },
        data: { status: WorkflowStatus.CANCELLED, completedAt: new Date() },
      }),
      prisma.gedAuditEvent.create({
        data: {
          tenantId,
          actorId: userId,
          action: GedAuditAction.MODIFICATION,
          metadata: { kind: "CANCEL", workflowId: wf.id, reference: wf.reference, reason: data.reason },
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Erreur de validation" }, { status: 400 });
  }
}
