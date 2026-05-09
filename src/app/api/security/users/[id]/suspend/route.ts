import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, UserStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: Role[] = [Role.DG, Role.TENANT_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ADMIN_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Accès réservé DG / admin" }, { status: 403 });
  }

  const target = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!target) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const newStatus = target.status === UserStatus.SUSPENDED ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
  await prisma.user.update({
    where: { id: target.id },
    data: { status: newStatus },
  });

  // Si on suspend, on révoque ses sessions actives
  if (newStatus === UserStatus.SUSPENDED) {
    await prisma.session.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: newStatus === UserStatus.SUSPENDED ? "user.suspend" : "user.reactivate",
      entityType: "User",
      entityId: target.id,
      metadata: { email: target.email },
    },
  });

  return NextResponse.json({ ok: true, status: newStatus });
}
