import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.SITE_MANAGER, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Validation plan réservée CDT/CC" }, { status: 403 });
  }

  const plan = await prisma.dailyPlan.findUnique({ where: { id: params.id } });
  if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

  await prisma.dailyPlan.update({
    where: { id: plan.id },
    data: {
      status: "VALIDATED",
      validatedAt: new Date(),
      validatedBy: session.sub,
    },
  });

  return NextResponse.json({ ok: true });
}
