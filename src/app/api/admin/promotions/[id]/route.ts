import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, PromotionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const decisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const parsed = decisionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation", issues: parsed.error.flatten() }, { status: 400 });
  }

  const promotion = await prisma.rolePromotionRequest.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!promotion) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (promotion.status !== PromotionStatus.PENDING) {
    return NextResponse.json({ error: "Demande déjà résolue" }, { status: 409 });
  }

  if (!promotion.validatorRoles.includes(session.role as Role)) {
    return NextResponse.json({ error: "Vous n'êtes pas validateur de cette demande" }, { status: 403 });
  }

  const validations = (promotion.validations as Array<Record<string, unknown>>) ?? [];
  if (validations.find((v) => v.validatorId === session.sub)) {
    return NextResponse.json({ error: "Vous avez déjà validé cette demande" }, { status: 409 });
  }

  validations.push({
    validatorId: session.sub,
    validatorRole: session.role,
    validatedAt: new Date().toISOString(),
    decision: parsed.data.decision,
    comment: parsed.data.comment ?? null,
  });

  const allValidated = promotion.validatorRoles.every((role) =>
    validations.some((v) => v.validatorRole === role && v.decision === "APPROVE")
  );
  const anyRejected = validations.some((v) => v.decision === "REJECT");

  let newStatus: PromotionStatus = PromotionStatus.PENDING;
  if (anyRejected) newStatus = PromotionStatus.REJECTED;
  else if (allValidated) newStatus = PromotionStatus.APPROVED;

  await prisma.rolePromotionRequest.update({
    where: { id: promotion.id },
    data: {
      validations: validations as unknown as object[],
      status: newStatus,
      resolvedAt: newStatus === PromotionStatus.PENDING ? null : new Date(),
    },
  });

  // Si la promotion est approuvée → applique le changement sur le user cible
  if (newStatus === PromotionStatus.APPROVED) {
    await prisma.user.update({
      where: { id: promotion.targetUserId },
      data: {
        role: promotion.toRole,
        assignedSiteIds: promotion.requestedSiteIds,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: parsed.data.decision === "APPROVE" ? "promotion.approve" : "promotion.reject",
      entityType: "RolePromotionRequest",
      entityId: promotion.id,
      metadata: { decision: parsed.data.decision, finalStatus: newStatus, comment: parsed.data.comment },
    },
  });

  return NextResponse.json({ status: newStatus, validations });
}
