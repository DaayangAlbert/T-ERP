/**
 * Planifie un entretien pour une candidature (RH).
 * Crée l'Interview, fait passer la candidature au stage INTERVIEW si besoin,
 * et notifie le candidat (notification interne).
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";
import { scheduleInterviewSchema } from "@/schemas/recruitment";
import { mailInterviewScheduled } from "@/lib/recruitment-mail";

export const dynamic = "force-dynamic";

const MANAGE_ROLES: Role[] = [Role.HR, Role.TENANT_ADMIN];

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!MANAGE_ROLES.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH" }, { status: 403 });
  }

  try {
    const data = scheduleInterviewSchema.parse(await req.json());

    const app = await prisma.application.findFirst({
      where: { id: params.id, jobOffer: { tenantId: session.tenantId } },
      select: {
        id: true,
        userId: true,
        stage: true,
        jobOffer: { select: { title: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
    if (!app) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });

    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId: app.id,
        scheduledAt,
        duration: data.duration,
        mode: data.mode,
        location: data.location || null,
        interviewers: [session.sub], // le RH planificateur est l'interviewer par défaut
      },
      select: { id: true },
    });

    // Avance la candidature au stage Entretien si elle est en amont.
    if (app.stage === AppStage.RECEIVED || app.stage === AppStage.SHORTLISTED) {
      await prisma.application.update({
        where: { id: app.id },
        data: { stage: AppStage.INTERVIEW, lastStageChangeAt: new Date() },
      });
    }

    // Notifie le candidat (in-app).
    await prisma.notification.create({
      data: {
        userId: app.userId,
        type: "interview_scheduled",
        title: "Entretien planifié",
        body: `Un entretien pour le poste « ${app.jobOffer.title} » est prévu le ${scheduledAt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}. Merci de confirmer votre présence.`,
        link: "/cand/entretiens",
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: session.tenantId,
        userId: session.sub,
        action: "interview.schedule",
        entityType: "Interview",
        entityId: interview.id,
        metadata: { applicationId: app.id, scheduledAt: scheduledAt.toISOString(), mode: data.mode },
      },
    });

    // Convocation par email (best-effort).
    await mailInterviewScheduled({
      to: app.user.email,
      candidateName: `${app.user.firstName} ${app.user.lastName}`,
      jobTitle: app.jobOffer.title,
      scheduledAt,
      mode: data.mode,
      location: data.location || null,
      durationMin: data.duration,
    });

    return NextResponse.json({ id: interview.id }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "Validation", issues: err.flatten() }, { status: 400 });
    }
    console.error("[POST .../interviews]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
