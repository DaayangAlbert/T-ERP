import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, OverheadRunStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.DAF, Role.DG, Role.TENANT_ADMIN];

// DELETE — annule une répartition en attente (PENDING). Une répartition
// appliquée ne peut pas être supprimée.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / DG" }, { status: 403 });
  }

  const run = await prisma.overheadRun.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
    select: { id: true, status: true },
  });
  if (!run) return NextResponse.json({ error: "Répartition introuvable" }, { status: 404 });
  if (run.status === OverheadRunStatus.APPLIED) {
    return NextResponse.json({ error: "Répartition appliquée : suppression impossible" }, { status: 400 });
  }

  await prisma.overheadRun.delete({ where: { id: run.id } });
  return NextResponse.json({ ok: true });
}
