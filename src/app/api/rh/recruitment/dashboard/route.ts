import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { Role, AppStage } from "@prisma/client";
import { getActiveOffers, getEffectiveStage, getSyntheticApplications } from "@/lib/rh-recruitment";

export const dynamic = "force-dynamic";

const ALLOWED: Role[] = [Role.HR, Role.DG, Role.DAF, Role.TENANT_ADMIN];

export async function GET() {
  const session = getCurrentSession();
  if (!session?.tenantId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!ALLOWED.includes(session.role as Role)) {
    return NextResponse.json({ error: "Réservé RH / DG / DAF" }, { status: 403 });
  }

  const apps = getSyntheticApplications();
  const offers = getActiveOffers();
  const counts: Record<AppStage, number> = {
    RECEIVED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    TECHNICAL_TEST: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
  };
  for (const a of apps) counts[getEffectiveStage(a)]++;
  return NextResponse.json({
    kpis: {
      offersActive: offers.length,
      applicationsTotal: apps.length,
      interviewsThisWeek: counts.INTERVIEW,
      hiredThisMonth: counts.HIRED,
    },
    counts,
  });
}
