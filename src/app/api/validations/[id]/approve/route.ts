import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { approveSchema } from "@/schemas/validation";
import { approveCurrentStep, appendComment, type Workflow } from "@/lib/validation-workflow";
import { ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { comment } = approveSchema.parse(await req.json().catch(() => ({})));

    const validation = await prisma.validation.findFirst({
      where: { id: params.id, tenantId: session.tenantId, status: ValidationStatus.PENDING },
    });
    if (!validation) return NextResponse.json({ error: "Validation introuvable ou clôturée" }, { status: 404 });

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

    const decidedBy = { id: user.id, name: `${user.firstName} ${user.lastName}` };
    const { workflow, next } = approveCurrentStep(validation.workflow as unknown as Workflow, decidedBy, comment);

    const isFinal = next === null;
    const newComments = appendComment(validation.comments, {
      type: "DECISION",
      authorId: user.id,
      authorName: decidedBy.name,
      message: isFinal ? `Validation finale${comment ? " — " + comment : ""}` : `Approuvé étape ${validation.currentStep}${comment ? " — " + comment : ""}`,
    });

    const updated = await prisma.validation.update({
      where: { id: validation.id },
      data: {
        workflow: workflow as unknown as object,
        comments: newComments as unknown as object,
        status: isFinal ? ValidationStatus.APPROVED : ValidationStatus.PENDING,
        currentStep: next?.key ?? null,
        currentApproverId: isFinal ? null : (validation.currentApproverId ?? user.id),
        decidedById: isFinal ? user.id : null,
        decisionAt: isFinal ? new Date() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: user.id,
        action: "validation.approve",
        entityType: "Validation",
        entityId: validation.id,
        metadata: { reference: validation.reference, isFinal, comment },
      },
    });

    return NextResponse.json({ id: updated.id, status: updated.status, isFinal });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/validations/:id/approve]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
