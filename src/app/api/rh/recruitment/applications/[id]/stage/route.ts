/**
 * Change le stage d'une candidature dans le kanban — persisté en BDD.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.TENANT_ADMIN];
const STAGES = Object.values(AppStage);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Action réservée RH" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { stage?: AppStage };
  if (!body.stage || !STAGES.includes(body.stage)) {
    return NextResponse.json({ error: "Stage invalide" }, { status: 400 });
  }

  const existing = await prisma.application.findFirst({
    where: { id: params.id, jobOffer: { tenantId: session.tenantId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

  await prisma.application.update({
    where: { id: existing.id },
    data: {
      stage: body.stage,
      lastStageChangeAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, stage: body.stage });
}
