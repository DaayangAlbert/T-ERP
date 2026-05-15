import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { MissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/missions/:id/accept — L'ouvrier accepte la mission.
// Transition : PENDING_ACCEPTANCE → ACCEPTED.
// La transition ACCEPTED → IN_PROGRESS se fait automatiquement au premier
// update de progress (cf /progress).
export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const m = await prisma.missionAssignment.findFirst({
    where: { id: ctx.params.id, userId: session.sub },
    select: { id: true, status: true },
  });
  if (!m) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
  if (m.status !== MissionStatus.PENDING_ACCEPTANCE) {
    return NextResponse.json(
      { error: "Cette mission n'est pas en attente d'acceptation", code: "INVALID_STATE" },
      { status: 409 }
    );
  }

  const updated = await prisma.missionAssignment.update({
    where: { id: m.id },
    data: {
      status: MissionStatus.ACCEPTED,
      workerAcceptedAt: new Date(),
    },
    select: { id: true, status: true, workerAcceptedAt: true },
  });

  // TODO fn 1.6 : notification WhatsApp au CC "Étienne a accepté"

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    workerAcceptedAt: updated.workerAcceptedAt?.toISOString() ?? null,
    message: "Mission acceptée — bon courage",
  });
}
