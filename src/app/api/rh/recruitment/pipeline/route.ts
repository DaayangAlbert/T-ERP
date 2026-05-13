import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";
import { getEffectiveStage, getSyntheticApplications } from "@/lib/rh-recruitment";

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

  const apps = getSyntheticApplications();
  const columns = COLUMNS_ORDER.map((stage) => {
    const items = apps
      .filter((a) => getEffectiveStage(a) === stage)
      .sort((a, b) => b.scoring.overall - a.scoring.overall)
      .map((a) => ({
        id: a.id,
        candidateName: a.candidateName,
        position: a.position,
        region: a.region,
        appliedAt: a.appliedAt,
        scoreOverall: a.scoring.overall,
        stage,
      }));
    return { stage, label: STAGE_LABEL[stage], count: items.length, items };
  });
  return NextResponse.json({ columns });
}
