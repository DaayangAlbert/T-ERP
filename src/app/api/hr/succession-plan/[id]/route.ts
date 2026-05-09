import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateSuccessionSchema } from "@/schemas/hr";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG, Role.HR];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG / RH" }, { status: 403 });
  }

  try {
    const data = updateSuccessionSchema.parse(await req.json());
    const plan = await prisma.successionPlan.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!plan) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.successionPlan.update({
      where: { id: plan.id },
      data: {
        ...(data.successorId !== undefined && { successorId: data.successorId }),
        ...(data.readyInMonths !== undefined && { readyInMonths: data.readyInMonths }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "succession.update",
        entityType: "SuccessionPlan",
        entityId: plan.id,
        metadata: { changes: data },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
