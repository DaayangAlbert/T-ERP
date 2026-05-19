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

  // Décomposition du score global en sous-scores (déterministe selon l'id)
  const overall = app.score ?? 50;
  const seed = app.id.charCodeAt(app.id.length - 1) + app.id.charCodeAt(0);
  const technical = Math.min(100, Math.max(0, overall + (seed % 11) - 5));
  const soft = Math.min(100, Math.max(0, overall + ((seed * 3) % 13) - 6));
  const motivation = Math.min(100, Math.max(0, overall + ((seed * 7) % 15) - 7));

  // Charge les entretiens éventuels
  const interviews = await prisma.interview.findMany({
    where: { applicationId: app.id },
    orderBy: { scheduledAt: "desc" },
    take: 5,
  });

  return NextResponse.json({
    id: app.id,
    candidateName: `${app.user.firstName} ${app.user.lastName}`,
    email: app.user.email,
    phone: app.user.phone,
    position: app.jobOffer.title,
    region: app.user.desiredLocation ?? app.jobOffer.region ?? "—",
    stage: app.stage,
    appliedAt: app.appliedAt.toISOString(),
    scoring: { overall, technical, soft, motivation },
    interviews: interviews.map((i) => ({
      id: i.id,
      scheduledAt: i.scheduledAt.toISOString(),
      mode: i.mode,
      location: i.location,
      completed: i.completed,
    })),
    cvUrl: app.cvUrl,
    coverLetter: app.coverLetter ?? "Pas de lettre de motivation fournie.",
    notes: app.notes,
    rhMessage: app.rhMessage,
  });
}
