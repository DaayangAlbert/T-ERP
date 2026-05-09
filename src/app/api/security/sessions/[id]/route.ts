import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const s = await prisma.session.findUnique({
    where: { id: params.id },
    include: { user: { select: { tenantId: true } } },
  });
  if (!s || s.user.tenantId !== session.tenantId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await prisma.session.update({
    where: { id: s.id },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "session.revoke",
      entityType: "Session",
      entityId: s.id,
    },
  });

  return NextResponse.json({ ok: true });
}
