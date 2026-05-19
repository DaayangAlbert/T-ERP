import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const url = new URL(req.url);
  const minScore = Number(url.searchParams.get("minScore") ?? "75");

  const matches = await prisma.jobMatch.findMany({
    where: {
      candidateId: session.sub,
      score: { gte: minScore },
      dismissedAt: null,
      jobOffer: { status: "PUBLISHED" },
    },
    include: {
      jobOffer: {
        select: {
          id: true,
          title: true,
          region: true,
          contractType: true,
          category: true,
          salaryMin: true,
          salaryMax: true,
          publishedAt: true,
          description: true,
          tenant: { select: { name: true } },
        },
      },
    },
    orderBy: { score: "desc" },
  });

  return NextResponse.json({
    items: matches.map((m) => ({
      id: m.id,
      jobOfferId: m.jobOfferId,
      title: m.jobOffer.title,
      region: m.jobOffer.region,
      tenantName: m.jobOffer.tenant.name,
      contractType: m.jobOffer.contractType,
      category: m.jobOffer.category,
      salaryMin: m.jobOffer.salaryMin ? Number(m.jobOffer.salaryMin) : null,
      salaryMax: m.jobOffer.salaryMax ? Number(m.jobOffer.salaryMax) : null,
      publishedAt: m.jobOffer.publishedAt?.toISOString() ?? null,
      score: m.score,
      matchedSkills: m.matchedSkills,
      missingRequirements: m.missingRequirements,
    })),
  });
}
