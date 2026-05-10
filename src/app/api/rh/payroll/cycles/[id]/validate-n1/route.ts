import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation N1 réservée RH" }, { status: 403 });
  }

  const cycle = await prisma.payrollCycle.findFirst({
    where: { id: params.id, tenantId: session.tenantId },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle introuvable" }, { status: 404 });

  await prisma.payrollCycle.update({
    where: { id: cycle.id },
    data: { status: "N1_PENDING", n1ValidatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, status: "N1_PENDING" });
}
