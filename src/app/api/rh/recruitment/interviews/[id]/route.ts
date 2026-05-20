/**
 * Mise à jour d'un entretien (RH) : reprogrammation OU compte-rendu
 * (feedback, score 1-5, décision GO/NO_GO/PENDING, clôture). Et annulation.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role } from "@prisma/client";
import { updateInterviewSchema } from "@/schemas/recruitment";
import { mailInterviewCancelled } from "@/lib/recruitment-mail";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];

// L'Interview n'a pas de relation Prisma vers Application (juste applicationId),
// donc on vérifie l'appartenance au tenant en deux temps.
async function findScoped(id: string, tenantId: string) {
  const itw = await prisma.interview.findUnique({
    where: { id },
    select: { id: true, completed: true, applicationId: true },
  });
  if (!itw) return null;
  const app = await prisma.application.findFirst({
    where: { id: itw.applicationId, jobOffer: { tenantId } },
    select: { userId: true, user: { select: { email: true, firstName: true, lastName: true } } },
  });
  if (!app) return null;
  return {
    id: itw.id,
    completed: itw.completed,
    candidateUserId: app.userId,
    candidateEmail: app.user.email,
    candidateName: `${app.user.firstName} ${app.user.lastName}`,
  };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  try {
    const data = updateInterviewSchema.parse(await req.json());
    const itw = await findScoped(params.id, session.tenantId);
    if (!itw) return NextResponse.json({ error: "Entretien introuvable" }, { status: 404 });

    await prisma.interview.update({
      where: { id: itw.id },
      data: {
        ...(data.scheduledAt !== undefined && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.mode !== undefined && { mode: data.mode }),
        ...(data.location !== undefined && { location: data.location || null }),
        ...(data.completed !== undefined && { completed: data.completed }),
        ...(data.feedback !== undefined && { feedback: data.feedback || null }),
        ...(data.score !== undefined && { score: data.score ?? null }),
        ...(data.decision !== undefined && { decision: data.decision ?? null }),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: data.completed ? "interview.debrief" : "interview.update",
        entityType: "Interview",
        entityId: itw.id,
        metadata: { decision: data.decision ?? null, score: data.score ?? null },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[PATCH .../interviews/[id]]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  const itw = await findScoped(params.id, session.tenantId);
  if (!itw) return NextResponse.json({ error: "Entretien introuvable" }, { status: 404 });

  await prisma.interview.delete({ where: { id: itw.id } });

  if (itw.candidateUserId) {
    await prisma.notification.create({
      data: {
        userId: itw.candidateUserId,
        type: "interview_cancelled",
        title: "Entretien annulé",
        body: "Un entretien planifié a été annulé par le service RH. Vous serez recontacté.",
        link: "/cand/entretiens",
      },
    });
    await mailInterviewCancelled({ to: itw.candidateEmail, candidateName: itw.candidateName });
  }

  await prisma.auditLog.create({
    data: {
      tenantId: session.tenantId,
      userId: session.sub,
      action: "interview.cancel",
      entityType: "Interview",
      entityId: itw.id,
      metadata: {},
    },
  });

  return NextResponse.json({ ok: true });
}
