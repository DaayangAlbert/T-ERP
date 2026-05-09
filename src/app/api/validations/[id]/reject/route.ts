import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { rejectSchema } from "@/schemas/validation";
import { rejectCurrentStep, appendComment, type Workflow } from "@/lib/validation-workflow";
import { ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { reason } = rejectSchema.parse(await req.json());

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
    const workflow = rejectCurrentStep(validation.workflow as unknown as Workflow, decidedBy, reason);
    const newComments = appendComment(validation.comments, {
      type: "DECISION",
      authorId: user.id,
      authorName: decidedBy.name,
      message: `Rejeté — ${reason}`,
    });

    await prisma.validation.update({
      where: { id: validation.id },
      data: {
        workflow: workflow as unknown as object,
        comments: newComments as unknown as object,
        status: ValidationStatus.REJECTED,
        decidedById: user.id,
        decisionAt: new Date(),
        decisionReason: reason,
        currentApproverId: null,
        currentStep: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: user.id,
        action: "validation.reject",
        entityType: "Validation",
        entityId: validation.id,
        metadata: { reference: validation.reference, reason },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/validations/:id/reject]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
