import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.string().min(10).max(500),
  proposedDates: z.array(z.string().datetime()).max(3).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      applicationId: true,
      scheduledAt: true,
      interviewers: true,
      completed: true,
    },
  });
  if (!interview)
    return NextResponse.json({ error: "Entretien introuvable" }, { status: 404 });

  const app = await prisma.application.findUnique({
    where: { id: interview.applicationId },
    select: { userId: true, jobOffer: { select: { title: true } } },
  });
  if (!app || app.userId !== session.sub)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  if (interview.completed)
    return NextResponse.json(
      { error: "Cet entretien est déjà passé" },
      { status: 400 },
    );

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const proposedSummary =
    parsed.data.proposedDates && parsed.data.proposedDates.length > 0
      ? `\nDates proposées : ${parsed.data.proposedDates
          .map((d) => new Date(d).toLocaleString("fr-FR"))
          .join(", ")}`
      : "";

  for (const interviewerId of interview.interviewers) {
    await prisma.notification
      .create({
        data: {
          userId: interviewerId,
          type: "interview_reschedule_request",
          title: `Demande de report d'entretien — ${app.jobOffer.title}`,
          body: `Le candidat demande à reporter l'entretien prévu le ${interview.scheduledAt.toLocaleString(
            "fr-FR",
          )}.\nMotif : ${parsed.data.reason}${proposedSummary}`,
          link: `/rh/recrutement/entretiens/${interview.id}`,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({ ok: true, notified: interview.interviewers.length });
}
