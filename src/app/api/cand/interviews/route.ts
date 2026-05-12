import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const now = new Date();
  const apps = await prisma.application.findMany({
    where: { userId: session.sub },
    select: {
      id: true,
      jobOffer: { select: { title: true, region: true, contractType: true } },
    },
  });
  const appById = new Map(apps.map((a) => [a.id, a]));
  const appIds = apps.map((a) => a.id);

  if (appIds.length === 0) {
    return NextResponse.json({ upcoming: [], past: [] });
  }

  const [upcoming, past] = await Promise.all([
    prisma.interview.findMany({
      where: {
        applicationId: { in: appIds },
        scheduledAt: { gt: now },
        completed: false,
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.interview.findMany({
      where: {
        applicationId: { in: appIds },
        OR: [{ completed: true }, { scheduledAt: { lt: now } }],
      },
      orderBy: { scheduledAt: "desc" },
      take: 20,
    }),
  ]);

  const allInterviewerIds = Array.from(
    new Set([...upcoming, ...past].flatMap((i) => i.interviewers)),
  );
  const interviewers = allInterviewerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: allInterviewerIds } },
        select: { id: true, firstName: true, lastName: true, position: true },
      })
    : [];
  const interviewerById = new Map(interviewers.map((u) => [u.id, u]));

  function format(i: (typeof upcoming)[number]) {
    const app = appById.get(i.applicationId);
    return {
      id: i.id,
      applicationId: i.applicationId,
      jobTitle: app?.jobOffer.title ?? "Entretien",
      region: app?.jobOffer.region ?? null,
      scheduledAt: i.scheduledAt.toISOString(),
      duration: i.duration,
      mode: i.mode,
      location: i.location,
      completed: i.completed,
      score: i.score,
      decision: i.decision,
      candidateConfirmed: i.candidateConfirmed,
      candidateConfirmedAt: i.candidateConfirmedAt?.toISOString() ?? null,
      interviewers: i.interviewers
        .map((id) => {
          const u = interviewerById.get(id);
          return u
            ? `${u.firstName} ${u.lastName}${u.position ? ` (${u.position})` : ""}`
            : null;
        })
        .filter((s): s is string => !!s),
    };
  }

  return NextResponse.json({
    upcoming: upcoming.map(format),
    past: past.map(format),
  });
}
