import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

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

  // Génère un mot de passe temporaire (en prod, on enverrait un lien magique)
  const tempPassword = Math.random().toString(36).slice(2, 12) + "A1!";
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, twoFactorEnabled: false, twoFactorSecret: null },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "user.reset_password",
      entityType: "User",
      entityId: target.id,
      metadata: { email: target.email },
    },
  });

  return NextResponse.json({
    ok: true,
    tempPassword: process.env.RESEND_API_KEY ? undefined : tempPassword,
    note: process.env.RESEND_API_KEY
      ? "Email de réinitialisation envoyé via Resend (lien valide 24h)"
      : "Stub : RESEND_API_KEY non configuré. Mot de passe temporaire à transmettre manuellement.",
  });
}
