/**
 * Détail d'une candidature — lecture depuis la BDD.
 *
 * Calcule un scoring dérivé (technical, soft, motivation) à partir du
 * `score` global stocké, pour matcher la structure attendue par l'UI.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { computeApplicationMatch } from "@/lib/application-score";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const app = await prisma.application.findFirst({
    where: { id: params.id, jobOffer: { tenantId: session.tenantId } },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          desiredLocation: true,
          desiredJob: true,
          availability: true,
        },
      },
      jobOffer: { select: { title: true, region: true, reference: true } },
    },
  });
  if (!app) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Scoring RÉEL : matching live profil candidat ↔ offre (breakdown par
  // critère). Le score global persisté (app.score) sert au tri du pipeline ;
  // le breakdown est recalculé à l'affichage. Le RH peut re-snapshotter via
  // /rescore.
  const match = await computeApplicationMatch(app.userId, app.jobOfferId);
  const overall = app.score ?? match?.score ?? 0;

  // Charge les entretiens éventuels + résout les noms des interviewers
  const interviews = await prisma.interview.findMany({
    where: { applicationId: app.id },
    orderBy: { scheduledAt: "desc" },
    take: 10,
  });
  const interviewerIds = Array.from(new Set(interviews.flatMap((i) => i.interviewers)));
  const interviewers = interviewerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: interviewerIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nameById = new Map(interviewers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return NextResponse.json({
    id: app.id,
    candidateName: `${app.user.firstName} ${app.user.lastName}`,
    email: app.user.email,
    phone: app.user.phone,
    position: app.jobOffer.title,
    region: app.user.desiredLocation ?? app.jobOffer.region ?? "—",
    stage: app.stage,
    appliedAt: app.appliedAt.toISOString(),
    scoring: {
      overall,
      breakdown: match?.breakdown ?? null,
      matchedSkills: match?.matchedSkills ?? [],
      missingRequirements: match?.missingRequirements ?? [],
    },
    interviews: interviews.map((i) => ({
      id: i.id,
      scheduledAt: i.scheduledAt.toISOString(),
      duration: i.duration,
      mode: i.mode,
      location: i.location,
      completed: i.completed,
      feedback: i.feedback,
      score: i.score,
      decision: i.decision,
      candidateConfirmed: i.candidateConfirmed,
      interviewers: i.interviewers.map((uid) => nameById.get(uid)).filter((s): s is string => !!s),
    })),
    cvUrl: app.cvUrl,
    coverLetter: app.coverLetter ?? "Pas de lettre de motivation fournie.",
    notes: app.notes,
    rhMessage: app.rhMessage,
  });
}
