import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== Role.TECH_DIRECTOR && session.role !== Role.TENANT_ADMIN) {
    return NextResponse.json({ error: "Réservé Direction Technique" }, { status: 403 });
  }

  await prisma.delegation.update({
    where: { id: params.id },
    data: { active: false, endDate: new Date() },
  });

  return NextResponse.json({ ok: true });
}
