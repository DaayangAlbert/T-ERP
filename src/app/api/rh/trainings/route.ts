/**
 * Plan annuel de formation (RH 1.6).
 *
 * Lecture depuis la BDD : model TrainingSession (formations groupées).
 * Le résumé renvoie : budget annuel total, dépensé YTD (sessions terminées/en cours),
 * taux de consommation, sessions en cours / confirmées.
 *
 * Le model Training (individuel) sert pour les inscriptions nominales et
 * recyclages — exposé séparément via /api/rh/certifications.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, TrainingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const sessions = await prisma.trainingSession.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ startDate: "asc" }],
    include: { _count: { select: { trainings: true } } },
  });

  const items = sessions.map((s) => ({
    ref: s.ref,
    title: s.title,
    category: s.category,
    provider: s.provider ?? "",
    startDate: s.startDate.toISOString().slice(0, 10),
    endDate: s.endDate.toISOString().slice(0, 10),
    // expectedParticipants en priorité, fallback sur les inscriptions effectives
    participants: s.expectedParticipants || s._count.trainings,
    budget: Number(s.budget),
    status: s.status,
  }));

  const annualBudget = items.reduce((sum, i) => sum + i.budget, 0);
  const spentYtd = items
    .filter((i) => i.status === TrainingStatus.COMPLETED || i.status === TrainingStatus.IN_PROGRESS)
    .reduce((sum, i) => sum + i.budget, 0);
  const inProgress = items.filter((i) => i.status === TrainingStatus.IN_PROGRESS || i.status === TrainingStatus.CONFIRMED).length;

  return NextResponse.json({
    items,
    summary: {
      annualBudget,
      spentYtd,
      spentRate: annualBudget > 0 ? Math.round((spentYtd / annualBudget) * 100) : 0,
      inProgress,
    },
  });
}
