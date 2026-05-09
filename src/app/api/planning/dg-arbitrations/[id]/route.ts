import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { arbitrationDecisionSchema } from "@/schemas/planning";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const DG_ROLES: Role[] = [Role.DG, Role.TECH_DIRECTOR];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!DG_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé à la direction" }, { status: 403 });
  }

  try {
    const data = arbitrationDecisionSchema.parse(await req.json());
    const c = await prisma.resourceConflict.findFirst({
      where: { id: params.id, tenantId: session.tenantId, arbitration: true },
    });
    if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.resourceConflict.update({
      where: { id: c.id },
      data: {
        arbitrationStatus: data.status,
        arbitrationNote: data.note ?? c.arbitrationNote,
        resolved: data.status === "APPROVED",
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: `arbitration.${data.status.toLowerCase()}`,
        entityType: "ResourceConflict",
        entityId: c.id,
        metadata: { note: data.note ?? null },
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
