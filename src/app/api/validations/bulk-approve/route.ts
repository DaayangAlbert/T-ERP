import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { bulkApproveSchema } from "@/schemas/validation";
import { approveCurrentStep, appendComment, type Workflow } from "@/lib/validation-workflow";
import { ValidationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const { ids, comment } = bulkApproveSchema.parse(await req.json());

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    const decidedBy = { id: user.id, name: `${user.firstName} ${user.lastName}` };

    const validations = await prisma.validation.findMany({
      where: {
        id: { in: ids },
        tenantId: session.tenantId,
        status: ValidationStatus.PENDING,
      },
    });

    let approved = 0;
    let advanced = 0;

    for (const v of validations) {
      const { workflow, next } = approveCurrentStep(v.workflow as unknown as Workflow, decidedBy, comment);
      const isFinal = next === null;
      const newComments = appendComment(v.comments, {
        type: "DECISION",
        authorId: user.id,
        authorName: decidedBy.name,
        message: isFinal ? `Validé en lot${comment ? " — " + comment : ""}` : `Approuvé étape ${v.currentStep} (lot)`,
      });
      await prisma.validation.update({
        where: { id: v.id },
        data: {
          workflow: workflow as unknown as object,
          comments: newComments as unknown as object,
          status: isFinal ? ValidationStatus.APPROVED : ValidationStatus.PENDING,
          currentStep: next?.key ?? null,
          decidedById: isFinal ? user.id : null,
          decisionAt: isFinal ? new Date() : null,
        },
      });
      if (isFinal) approved++;
      else advanced++;
    }

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: user.id,
        action: "validation.bulk_approve",
        entityType: "Validation",
        metadata: { count: validations.length, approved, advanced, ids: validations.map((v) => v.id) },
      },
    });

    return NextResponse.json({ ok: true, approved, advanced, total: validations.length });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST /api/validations/bulk-approve]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
