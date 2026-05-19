import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

const ACTIVE = ["RECEIVED", "SHORTLISTED", "INTERVIEW", "TECHNICAL_TEST", "OFFER"] as const;
const ARCHIVED = ["HIRED", "REJECTED", "WITHDRAWN", "EXPIRED"] as const;

export async function GET(req: Request) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") ?? "active";
  const stageFilter =
    filter === "archived"
      ? { in: [...ARCHIVED] }
      : filter === "all"
        ? undefined
        : { in: [...ACTIVE] };

  const apps = await prisma.application.findMany({
    where: {
      userId: session.sub,
      ...(stageFilter && { stage: stageFilter }),
    },
    include: {
      jobOffer: {
        select: {
          id: true,
          title: true,
          region: true,
          contractType: true,
          salaryMin: true,
          salaryMax: true,
          // Multi-tenant SaaS : on remonte le nom de l'entreprise qui publie
          // l'offre — un même candidat peut postuler à plusieurs entreprises
          // clientes de T-ERP, chaque carte affiche son tenant respectif.
          tenant: { select: { name: true } },
        },
      },
    },
    orderBy: { appliedAt: "desc" },
  });

  const appIds = apps.map((a) => a.id);
  const upcomingInterviews =
    appIds.length === 0
      ? []
      : await prisma.interview.findMany({
          where: {
            applicationId: { in: appIds },
            scheduledAt: { gte: new Date() },
            completed: false,
          },
          select: { id: true, applicationId: true },
        });
  const upcomingByApp = new Map(upcomingInterviews.map((i) => [i.applicationId, i.id]));

  const [activeCount, archivedCount] = await Promise.all([
    prisma.application.count({
      where: { userId: session.sub, stage: { in: [...ACTIVE] } },
    }),
    prisma.application.count({
      where: { userId: session.sub, stage: { in: [...ARCHIVED] } },
    }),
  ]);

  const now = Date.now();
  return NextResponse.json({
    filter,
    stats: {
      active: activeCount,
      archived: archivedCount,
      total: activeCount + archivedCount,
    },
    applications: apps.map((a) => {
      const refDate = a.lastStageChangeAt ?? a.updatedAt ?? a.appliedAt;
      return {
        id: a.id,
        jobOfferId: a.jobOffer.id,
        jobTitle: a.jobOffer.title,
        jobRegion: a.jobOffer.region,
        tenantName: a.jobOffer.tenant.name,
        jobContractType: a.jobOffer.contractType,
        salaryMin: a.jobOffer.salaryMin ? Number(a.jobOffer.salaryMin) : null,
        salaryMax: a.jobOffer.salaryMax ? Number(a.jobOffer.salaryMax) : null,
        stage: a.stage,
        appliedAt: a.appliedAt.toISOString(),
        daysSinceApplied: Math.max(
          0,
          Math.floor((now - a.appliedAt.getTime()) / 86_400_000),
        ),
        daysSinceLastUpdate: Math.max(
          0,
          Math.floor((now - refDate.getTime()) / 86_400_000),
        ),
        rhMessage: a.rhMessage,
        hasUpcomingInterview: upcomingByApp.has(a.id),
        upcomingInterviewId: upcomingByApp.get(a.id) ?? null,
      };
    }),
  });
}
