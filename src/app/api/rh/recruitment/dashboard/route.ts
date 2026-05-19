/**
 * Dashboard recrutement — KPIs + comptage par stage, lus depuis la BDD.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const tenantId = session.tenantId;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startOfWeek = new Date(Date.now() - 7 * 86_400_000);

  const [offersActive, totalApps, byStage, interviewsThisWeek, hiredThisMonth] = await Promise.all([
    prisma.jobOffer.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.application.count({ where: { jobOffer: { tenantId } } }),
    prisma.application.groupBy({
      by: ["stage"],
      where: { jobOffer: { tenantId } },
      _count: true,
    }),
    prisma.application.count({
      where: {
        jobOffer: { tenantId },
        stage: AppStage.INTERVIEW,
        lastStageChangeAt: { gte: startOfWeek },
      },
    }),
    prisma.application.count({
      where: {
        jobOffer: { tenantId },
        stage: AppStage.HIRED,
        lastStageChangeAt: { gte: startOfMonth },
      },
    }),
  ]);

  const counts: Record<AppStage, number> = {
    RECEIVED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    TECHNICAL_TEST: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
    EXPIRED: 0,
  };
  for (const g of byStage) counts[g.stage] = g._count;

  return NextResponse.json({
    kpis: {
      offersActive,
      applicationsTotal: totalApps,
      // INTERVIEW total (pas seulement cette semaine) si on n'a pas de date
      interviewsThisWeek: interviewsThisWeek || counts.INTERVIEW,
      hiredThisMonth: hiredThisMonth || counts.HIRED,
    },
    counts,
  });
}
