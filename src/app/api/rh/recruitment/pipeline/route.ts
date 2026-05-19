/**
 * Pipeline kanban recrutement — branche sur la BDD (model Application).
 *
 * Retourne 5 colonnes (RECEIVED, SHORTLISTED, INTERVIEW, OFFER, HIRED)
 * avec leurs candidatures triées par score décroissant.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

const STAGE_LABEL: Record<AppStage, string> = {
  RECEIVED: "Reçues",
  SHORTLISTED: "Présélection",
  INTERVIEW: "Entretien",
  TECHNICAL_TEST: "Test technique",
  OFFER: "Décision",
  HIRED: "Embauchés",
  REJECTED: "Rejetés",
  WITHDRAWN: "Retirées",
  EXPIRED: "Expirées",
};

const COLUMNS_ORDER: AppStage[] = [
  AppStage.RECEIVED,
  AppStage.SHORTLISTED,
  AppStage.INTERVIEW,
  AppStage.OFFER,
  AppStage.HIRED,
];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const apps = await prisma.application.findMany({
    where: {
      jobOffer: { tenantId: session.tenantId },
      stage: { in: COLUMNS_ORDER },
    },
    include: {
      user: { select: { firstName: true, lastName: true, desiredLocation: true } },
      jobOffer: { select: { title: true, region: true } },
    },
    orderBy: [{ score: "desc" }, { appliedAt: "desc" }],
  });

  const columns = COLUMNS_ORDER.map((stage) => {
    const items = apps
      .filter((a) => a.stage === stage)
      .map((a) => ({
        id: a.id,
        candidateName: `${a.user.firstName} ${a.user.lastName}`,
        position: a.jobOffer.title,
        region: a.user.desiredLocation ?? a.jobOffer.region ?? "—",
        appliedAt: a.appliedAt.toISOString(),
        scoreOverall: a.score ?? 0,
        stage,
      }));
    return { stage, label: STAGE_LABEL[stage], count: items.length, items };
  });

  return NextResponse.json({ columns });
}
