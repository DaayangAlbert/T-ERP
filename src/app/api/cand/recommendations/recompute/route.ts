import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardCandidate } from "@/lib/rbac/cand-guard";
import { computeMatch } from "@/lib/cand-matching";

export const dynamic = "force-dynamic";

export async function POST() {
  const guard = await guardCandidate();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const [user, experiences, publishedOffers, alreadyApplied] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        candidateSkills: true,
        desiredLocation: true,
        desiredContractType: true,
        desiredSalaryMin: true,
        desiredSalaryMax: true,
      },
    }),
    prisma.candidateExperience.findMany({
      where: { userId: session.sub },
      select: { startDate: true, endDate: true, isCurrent: true },
    }),
    prisma.jobOffer.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        region: true,
        contractType: true,
        category: true,
        description: true,
        requirements: true,
        salaryMin: true,
        salaryMax: true,
      },
    }),
    prisma.application.findMany({
      where: { userId: session.sub },
      select: { jobOfferId: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Calcul années d'expérience cumulées
  const now = new Date();
  const experienceYears = Math.round(
    experiences.reduce((acc, e) => {
      const end = e.isCurrent ? now : (e.endDate ?? e.startDate);
      const diffMs = Math.max(0, end.getTime() - e.startDate.getTime());
      return acc + diffMs / (365.25 * 24 * 3600 * 1000);
    }, 0),
  );

  const candidateInputs = {
    skills: user.candidateSkills,
    experienceYears,
    desiredLocation: user.desiredLocation,
    desiredContractType: user.desiredContractType,
    desiredSalaryMin: user.desiredSalaryMin,
    desiredSalaryMax: user.desiredSalaryMax,
  };

  const appliedSet = new Set(alreadyApplied.map((a) => a.jobOfferId));
  const offersToScore = publishedOffers.filter((o) => !appliedSet.has(o.id));

  let upserted = 0;
  const newAbove75: string[] = [];
  for (const offer of offersToScore) {
    const result = computeMatch(candidateInputs, offer);

    const existing = await prisma.jobMatch.findUnique({
      where: {
        candidateId_jobOfferId: {
          candidateId: session.sub,
          jobOfferId: offer.id,
        },
      },
      select: { id: true, score: true, dismissedAt: true },
    });

    await prisma.jobMatch.upsert({
      where: {
        candidateId_jobOfferId: {
          candidateId: session.sub,
          jobOfferId: offer.id,
        },
      },
      create: {
        candidateId: session.sub,
        jobOfferId: offer.id,
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingRequirements: result.missingRequirements,
        computedAt: now,
      },
      update: {
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingRequirements: result.missingRequirements,
        computedAt: now,
      },
    });
    upserted++;

    // Détection nouveau match > 75
    if (
      result.score >= 75 &&
      (!existing || existing.score < 75) &&
      !existing?.dismissedAt
    ) {
      newAbove75.push(offer.title);
    }
  }

  // Notification résumée nouveaux matchs > 75%
  if (newAbove75.length > 0) {
    await prisma.notification
      .create({
        data: {
          userId: session.sub,
          type: "new_recommendations",
          title: `${newAbove75.length} nouvelle${newAbove75.length > 1 ? "s" : ""} offre${newAbove75.length > 1 ? "s" : ""} pour vous`,
          body: `Matching > 75 % : ${newAbove75.slice(0, 3).join(", ")}${newAbove75.length > 3 ? "…" : ""}`,
          link: "/cand/offres",
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    upserted,
    newAbove75: newAbove75.length,
    experienceYears,
  });
}
