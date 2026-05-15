import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { missionCompleteSchema } from "@/schemas/ouv-mission";
import { MissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/missions/:id/complete { notes? }
// Permet de clôturer une mission même en dessous de 100 % avec notes
// d'explication (force majeure, redirection chantier, etc.). À éviter
// — préférer /progress avec percent: 100 qui clôture automatiquement.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json().catch(() => ({}));
    const input = missionCompleteSchema.parse(body);

    const m = await prisma.missionAssignment.findFirst({
      where: { id: ctx.params.id, userId: session.sub },
      select: { id: true, status: true, progressPercent: true },
    });
    if (!m) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (
      m.status !== MissionStatus.ACCEPTED &&
      m.status !== MissionStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { error: "Mission déjà cloturée ou non acceptée", code: "INVALID_STATE" },
        { status: 409 }
      );
    }

    const updated = await prisma.missionAssignment.update({
      where: { id: m.id },
      data: {
        status: MissionStatus.COMPLETED,
        progressPercent: Math.max(m.progressPercent, 100),
        completedAt: new Date(),
        completionNotes: input.notes ?? null,
      },
      select: { id: true, status: true, completedAt: true, progressPercent: true },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      progressPercent: updated.progressPercent,
      completedAt: updated.completedAt?.toISOString() ?? null,
      message: "Mission marquée terminée",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/missions/:id/complete]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
