import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const app = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      jobOffer: {
        select: {
          id: true,
          title: true,
          region: true,
          contractType: true,
          salaryMin: true,
          salaryMax: true,
          description: true,
        },
      },
    },
  });
  if (!app)
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  if (app.userId !== session.sub)
    return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const interviews = await prisma.interview.findMany({
    where: { applicationId: app.id },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      mode: true,
      location: true,
      completed: true,
      candidateConfirmed: true,
      candidateConfirmedAt: true,
    },
  });

  return NextResponse.json({
    application: {
      id: app.id,
      jobOffer: {
        ...app.jobOffer,
        salaryMin: app.jobOffer.salaryMin ? Number(app.jobOffer.salaryMin) : null,
        salaryMax: app.jobOffer.salaryMax ? Number(app.jobOffer.salaryMax) : null,
      },
      stage: app.stage,
      coverLetter: app.coverLetter,
      cvUrl: app.cvUrl,
      rhMessage: app.rhMessage,
      withdrawnAt: app.withdrawnAt?.toISOString() ?? null,
      withdrawnReason: app.withdrawnReason,
      appliedAt: app.appliedAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      lastStageChangeAt: app.lastStageChangeAt?.toISOString() ?? null,
    },
    interviews: interviews.map((i) => ({
      ...i,
      scheduledAt: i.scheduledAt.toISOString(),
      candidateConfirmedAt: i.candidateConfirmedAt?.toISOString() ?? null,
    })),
  });
}
