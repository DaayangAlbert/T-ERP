import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, TeamStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.WORKS_MANAGER, Role.TENANT_ADMIN, Role.SUPER_ADMIN];

export async function PATCH(req: Request, { params }: { params: { id: string; teamId: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé Conducteur de travaux" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{
    mainTask: string;
    objective: string;
    status: TeamStatus;
    materialsNeeded: Array<{ article: string; quantity: number; unit: string }>;
    extraNotes: string;
  }>;

  const plan = await prisma.dailyPlan.findFirst({
    where: { id: params.id, site: { tenantId: session.tenantId } },
  });
  if (!plan) return NextResponse.json({ error: "Plan introuvable" }, { status: 404 });

  const updated = await prisma.dailyPlanTeam.upsert({
    where: { planId_teamId: { planId: params.id, teamId: params.teamId } },
    update: {
      ...(body.mainTask !== undefined && { mainTask: body.mainTask }),
      ...(body.objective !== undefined && { objective: body.objective }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.materialsNeeded !== undefined && { materialsNeeded: body.materialsNeeded as object }),
      ...(body.extraNotes !== undefined && { extraNotes: body.extraNotes }),
    },
    create: {
      planId: params.id,
      teamId: params.teamId,
      mainTask: body.mainTask ?? "",
      objective: body.objective ?? null,
      status: body.status ?? "ASSIGNED",
      materialsNeeded: (body.materialsNeeded ?? []) as object,
      extraNotes: body.extraNotes ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: updated.id });
}
