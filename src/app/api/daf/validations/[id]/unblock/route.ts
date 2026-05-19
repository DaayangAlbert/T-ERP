import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// Mapping rôle → étape workflow vers laquelle la reprise réassigne.
const STEP_BY_ROLE: Partial<Record<Role, string>> = {
  [Role.DAF]: "DAF",
  [Role.DG]: "DG",
  [Role.TENANT_ADMIN]: "DAF",
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée DAF / DG" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: "RELANCE" | "TAKE_OVER"; note?: string };
  const action = body.action ?? "RELANCE";

  const v = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId, status: "PENDING" },
  });
  if (!v) return NextResponse.json({ error: "Validation introuvable ou non bloquée" }, { status: 404 });

  const callerRole = session.role as Role;
  const takeOverStep = STEP_BY_ROLE[callerRole] ?? "DAF";
  const actorLabel = callerRole === Role.DG ? "DG" : "DAF";

  if (action === "TAKE_OVER") {
    // Reprise : le superviseur (DAF ou DG) devient validateur courant à son étape.
    await prisma.validation.update({
      where: { id: v.id },
      data: { currentApproverId: session.sub, currentStep: takeOverStep },
    });
  }
  // RELANCE : on log l'action mais on ne change pas le workflow
  const existingComments = (v.comments as Array<Record<string, unknown>>) ?? [];
  await prisma.validation.update({
    where: { id: v.id },
    data: {
      comments: [
        ...existingComments,
        {
          type: action === "TAKE_OVER" ? "TAKE_OVER" : "RELANCE",
          authorId: session.sub,
          message: body.note ?? (action === "TAKE_OVER" ? `Reprise par ${actorLabel}` : `Validateur relancé par ${actorLabel}`),
          at: new Date().toISOString(),
        },
      ] as object,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `validation.unblock_${action.toLowerCase()}`,
      entityType: "Validation",
      entityId: v.id,
      metadata: { reference: v.reference, note: body.note ?? null },
    },
  });

  return NextResponse.json({ ok: true, action });
}
