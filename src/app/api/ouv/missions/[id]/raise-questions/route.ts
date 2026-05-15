import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { guardOuv } from "@/lib/rbac/ouv-guard";
import { missionRaiseQuestionsSchema } from "@/schemas/ouv-mission";
import { MissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// POST /api/ouv/missions/:id/raise-questions { questions }
// L'ouvrier pose des questions au CC avant ou pendant la mission.
// Stocké dans workerQuestionsRaised (texte concaténé avec date pour
// préserver l'historique simple — un vrai threading viendra en V2).
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = guardOuv();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  try {
    const body = await req.json();
    const input = missionRaiseQuestionsSchema.parse(body);

    const m = await prisma.missionAssignment.findFirst({
      where: { id: ctx.params.id, userId: session.sub },
      select: { id: true, status: true, workerQuestionsRaised: true },
    });
    if (!m) return NextResponse.json({ error: "Mission introuvable" }, { status: 404 });
    if (
      m.status !== MissionStatus.PENDING_ACCEPTANCE &&
      m.status !== MissionStatus.ACCEPTED &&
      m.status !== MissionStatus.IN_PROGRESS
    ) {
      return NextResponse.json(
        { error: "Mission cloturée ou annulée", code: "INVALID_STATE" },
        { status: 409 }
      );
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const newEntry = `[${dateStamp}] ${input.questions}`;
    const combined = m.workerQuestionsRaised
      ? `${m.workerQuestionsRaised}\n\n${newEntry}`
      : newEntry;

    await prisma.missionAssignment.update({
      where: { id: m.id },
      data: { workerQuestionsRaised: combined },
    });

    // TODO fn 1.6 : notification WhatsApp CC (Jean KAMGA) avec les questions
    // Si CC ne répond pas sous 24h, escalade DTrav (Paul ETOUNDI)

    return NextResponse.json({
      ok: true,
      message: "Questions envoyées — le chef répondra rapidement",
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Données invalides", issues: err.flatten() },
        { status: 400 }
      );
    }
    console.error("[POST /api/ouv/missions/:id/raise-questions]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
