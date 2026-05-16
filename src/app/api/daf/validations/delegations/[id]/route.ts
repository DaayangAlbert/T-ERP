import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { denyIfReadOnly } from "@/lib/rbac/guard";
import { MODULES } from "@/lib/rbac/modules";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }
  const denied = denyIfReadOnly(session.role as Role, MODULES.DAF);
  if (denied) return denied;

  const d = await prisma.delegation.findFirst({
    where: { id: params.id, tenantId: session.tenantId, fromUserId: session.sub },
  });
  if (!d) return NextResponse.json({ error: "Délégation introuvable" }, { status: 404 });

  await prisma.delegation.update({
    where: { id: d.id },
    data: { active: false, endDate: new Date() },
  });

  return NextResponse.json({ ok: true });
}
