import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.TENANT_ADMIN];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée DAF" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: "RELANCE" | "TAKE_OVER"; note?: string };
  const action = body.action ?? "RELANCE";

  const v = await prisma.validation.findFirst({
    where: { id: params.id, tenantId: session.tenantId, status: "PENDING" },
  });
  if (!v) return NextResponse.json({ error: "Validation introuvable ou non bloquée" }, { status: 404 });

  if (action === "TAKE_OVER") {
    // DAF reprend la main : devient validateur courant
    await prisma.validation.update({
      where: { id: v.id },
      data: { currentApproverId: session.sub, currentStep: "DAF" },
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
          message: body.note ?? (action === "TAKE_OVER" ? "Reprise par DAF" : "Validateur relancé par DAF"),
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
