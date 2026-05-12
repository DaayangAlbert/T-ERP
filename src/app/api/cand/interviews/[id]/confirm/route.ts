import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      applicationId: true,
      scheduledAt: true,
      completed: true,
      candidateConfirmed: true,
      interviewers: true,
    },
  });
  if (!interview) {
    return NextResponse.json({ error: "Entretien introuvable" }, { status: 404 });
  }

  const application = await prisma.application.findUnique({
    where: { id: interview.applicationId },
    select: { userId: true },
  });
  if (!application || application.userId !== session.sub) {
    return NextResponse.json({ error: "Interdit" }, { status: 403 });
  }

  if (interview.completed) {
    return NextResponse.json(
      { error: "Cet entretien est déjà passé" },
      { status: 400 },
    );
  }

  const updated = await prisma.interview.update({
    where: { id: params.id },
    data: {
      candidateConfirmed: true,
      candidateConfirmedAt: new Date(),
    },
    select: {
      id: true,
      candidateConfirmed: true,
      candidateConfirmedAt: true,
      scheduledAt: true,
    },
  });

  // Notification candidat (confirmation interne) + interviewers — best effort.
  await prisma.notification
    .create({
      data: {
        userId: session.sub,
        type: "interview_confirmed",
        title: "Présence confirmée",
        body: `Vous avez confirmé votre présence à l'entretien du ${updated.scheduledAt.toLocaleString("fr-FR")}.`,
        link: "/cand/entretiens",
      },
    })
    .catch(() => {});
  for (const interviewerId of interview.interviewers) {
    await prisma.notification
      .create({
        data: {
          userId: interviewerId,
          type: "interview_confirmed_by_candidate",
          title: "Candidat a confirmé sa présence",
          body: `Entretien du ${updated.scheduledAt.toLocaleString("fr-FR")} confirmé.`,
          link: "/rh",
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({
    id: updated.id,
    candidateConfirmed: updated.candidateConfirmed,
    candidateConfirmedAt: updated.candidateConfirmedAt?.toISOString() ?? null,
  });
}
