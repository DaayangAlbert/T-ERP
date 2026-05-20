/**
 * Scoring d'une candidature (Application) : réutilise l'algo de matching
 * candidat↔offre (`computeMatch`) en agrégeant le profil du candidat et
 * l'offre. Utilisé à la création d'une candidature ET au recalcul RH.
 */
import { prisma } from "@/lib/prisma";
import { computeMatch, type MatchResult } from "@/lib/cand-matching";

export async function computeApplicationMatch(
  userId: string,
  jobOfferId: string,
): Promise<MatchResult | null> {
  const [user, experiences, offer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        candidateSkills: true,
        desiredLocation: true,
        desiredContractType: true,
        desiredSalaryMin: true,
        desiredSalaryMax: true,
      },
    }),
    prisma.candidateExperience.findMany({
      where: { userId },
      select: { startDate: true, endDate: true, isCurrent: true },
    }),
    prisma.jobOffer.findUnique({
      where: { id: jobOfferId },
      select: {
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
  ]);

  if (!user || !offer) return null;

  const now = new Date();
  const experienceYears = Math.round(
    experiences.reduce((acc, e) => {
      const end = e.isCurrent ? now : e.endDate ?? e.startDate;
      const diffMs = Math.max(0, end.getTime() - e.startDate.getTime());
      return acc + diffMs / (365.25 * 24 * 3600 * 1000);
    }, 0),
  );

  return computeMatch(
    {
      skills: user.candidateSkills,
      experienceYears,
      desiredLocation: user.desiredLocation,
      desiredContractType: user.desiredContractType,
      desiredSalaryMin: user.desiredSalaryMin,
      desiredSalaryMax: user.desiredSalaryMax,
    },
    offer,
  );
}
