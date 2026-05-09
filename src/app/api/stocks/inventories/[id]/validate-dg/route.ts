import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DG];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DG" }, { status: 403 });
  }

  const inventory = await prisma.inventory.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!inventory) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (inventory.status !== "COMPLETED") {
    return NextResponse.json({ error: "L'inventaire doit être terminé avant validation DG" }, { status: 422 });
  }

  await prisma.inventory.update({
    where: { id: inventory.id },
    data: { dgValidated: true, status: "VALIDATED" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "inventory.validate_dg",
      entityType: "Inventory",
      entityId: inventory.id,
      metadata: { period: inventory.period, gapsValue: inventory.gapsValue.toString() },
    },
  });

  return NextResponse.json({ ok: true });
}
