import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardIt, isProtectedTarget } from "@/lib/rbac/it-guard";
import { hashPassword } from "@/lib/auth";
import { UserStatus } from "@prisma/client";

const actionSchema = z.object({
  action: z.enum(["lock", "unlock", "deactivate", "reactivate", "reset-password", "reset-mfa", "revoke-sessions"]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardIt("canManageUsers");
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const protectedCheck = await isProtectedTarget(params.id);
  if (protectedCheck.blocked) {
    return NextResponse.json({ error: protectedCheck.reason }, { status: 403 });
  }

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!target) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let result: Record<string, unknown> = { ok: true };

  switch (parsed.data.action) {
    case "lock":
      await prisma.user.update({ where: { id: target.id }, data: { status: UserStatus.SUSPENDED } });
      break;
    case "unlock":
    case "reactivate":
      await prisma.user.update({ where: { id: target.id }, data: { status: UserStatus.ACTIVE } });
      break;
    case "deactivate":
      await prisma.user.update({ where: { id: target.id }, data: { status: UserStatus.INACTIVE } });
      break;
    case "reset-password": {
      const newPassword = Math.random().toString(36).slice(2, 12) + "A1!";
      await prisma.user.update({
        where: { id: target.id },
        data: { passwordHash: await hashPassword(newPassword) },
      });
      result = { ok: true, temporaryPassword: newPassword };
      break;
    }
    case "reset-mfa":
      await prisma.user.update({
        where: { id: target.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
      break;
    case "revoke-sessions":
      const revoked = await prisma.session.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      result = { ok: true, revokedCount: revoked.count };
      break;
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: `it.user.${parsed.data.action}`,
      entityType: "User",
      entityId: target.id,
      metadata: { targetEmail: target.email, result } as object,
    },
  });

  return NextResponse.json(result);
}
