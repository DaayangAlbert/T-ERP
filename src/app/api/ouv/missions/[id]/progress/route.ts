import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { missionProgressSchema } from "@/schemas/ouv-mission";
import { MissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/missions/:id/progress { percent, photo?, note? }
// Met à jour l'avancement (0-100%). À 100%, transition automatique vers
// COMPLETED ; sinon ACCEPTED → IN_PROGRESS si nécessaire.
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = missionProgressSchema.parse(body);

    const m = await prisma.missionAssignment.findFirst({
      where: { id: ctx.params.id, userId: session.sub },
      select: {
        id: true,
        status: true,
        progressPhotoUrls: true,
        completionNotes: true,
      },
    });
    if (!m) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (
      m.status !== MissionStatus.ACCEPTED &&
      m.status !== MissionStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        {
          error: "Accepte d'abord la mission avant de mettre à jour son avancement",
          code: "MUST_ACCEPT_FIRST",
        },
        { status: 409 }
      );
    }

    const photoUrls = input.photo
      ? [...m.progressPhotoUrls, input.photo].slice(-10) // max 10 photos
      : m.progressPhotoUrls;

    const reachedComplete = input.percent >= 100;
    const nextStatus = reachedComplete
      ? MissionStatus.COMPLETED
      : MissionStatus.IN_PROGRESS;

    const completionNotesUpdate = reachedComplete
      ? input.note
        ? input.note
        : m.completionNotes
      : m.completionNotes;

    const updated = await prisma.missionAssignment.update({
      where: { id: m.id },
      data: {
        progressPercent: input.percent,
        progressPhotoUrls: photoUrls,
        status: nextStatus,
        completedAt: reachedComplete ? new Date() : null,
        completionNotes: completionNotesUpdate,
      },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        completedAt: true,
      },
    });

    // TODO fn 1.6 : notification WhatsApp CC + DTrav si 100 % (clôture)

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      progressPercent: updated.progressPercent,
      completedAt: updated.completedAt?.toISOString() ?? null,
      message: reachedComplete
        ? "Mission terminée — bravo !"
        : `Avancement mis à jour (${updated.progressPercent} %)`,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/missions/:id/progress]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
