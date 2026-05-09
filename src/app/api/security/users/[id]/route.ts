import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { updateUserSchema } from "@/schemas/security";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  try {
    const data = updateUserSchema.parse(await req.json());
    const target = await prisma.user.findFirst({
      where: { id: params.id, tenantId: session.tenantId },
    });
    if (!target) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.user.update({
      where: { id: target.id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "user.update",
        entityType: "User",
        entityId: target.id,
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
