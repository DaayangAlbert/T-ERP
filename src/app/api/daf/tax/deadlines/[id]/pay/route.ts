import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.DAF, Role.ACCOUNTANT];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé DAF / Comptable" }, { status: 403 });
  }

  const t = await prisma.taxDeadline.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!t) return NextResponse.json({ error: "Échéance introuvable" }, { status: 404 });

  await prisma.taxDeadline.update({
    where: { id: t.id },
    data: { paymentStatus: "PAID", paidAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
