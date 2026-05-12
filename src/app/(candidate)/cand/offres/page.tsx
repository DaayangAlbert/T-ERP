import { cookies } from "next/headers";
import Link from "next/link";
import { requireCandidateSession } from "@/lib/cand-session";
import { prisma } from "@/lib/prisma";
import { computeCandidateCompletion } from "@/lib/cand-profile";
import { RecommendationsHeader } from "@/components/cand/offres/RecommendationsHeader";
import {
  JobMatchCard,
  type JobMatchData,
} from "@/components/cand/offres/JobMatchCard";
import { ImproveMatchingHint } from "@/components/cand/offres/ImproveMatchingHint";

export const dynamic = "force-dynamic";

const MIN_SCORE = 75;

async function fetchRecommendations(): Promise<JobMatchData[]> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(
    `${baseUrl}/api/cand/recommendations?minScore=${MIN_SCORE}`,
    { cache: "no-store", headers: { cookie: cookieHeader } },
  );
  if (!res.ok) throw new Error(`Recommendations API ${res.status}`);
  const data = (await res.json()) as { items: JobMatchData[] };
  return data.items;
}

export default async function OffresPage() {
  const session = requireCandidateSession();
  const matches = await fetchRecommendations();

  // Calc completion pour le hint
  const [user, exp, form] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        position: true,
        cvUrl: true,
        desiredJob: true,
        desiredLocation: true,
        desiredSalaryMin: true,
        candidateSkills: true,
        candidateLanguages: true,
      },
    }),
    prisma.candidateExperience.count({ where: { userId: session.sub } }),
    prisma.candidateFormation.count({ where: { userId: session.sub } }),
  ]);
  const completionPct = user
    ? computeCandidateCompletion({
        ...user,
        experiencesCount: exp,
        formationsCount: form,
      })
    : 0;

  return (
    <div className="space-y-4">
      <RecommendationsHeader count={matches.length} minScore={MIN_SCORE} />

      <ImproveMatchingHint completionPct={completionPct} />

      {matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <p className="text-sm text-ink-3">
            Aucune offre ne correspond actuellement à votre profil (score ≥{" "}
            {MIN_SCORE}%).
          </p>
          <p className="mt-1 text-xs text-ink-3">
            Complétez votre profil ou élargissez vos critères, puis cliquez sur
            « Recalculer ».
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/cand/profil"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-brand hover:bg-primary-600"
            >
              Compléter mon profil
            </Link>
            <Link
              href="/"
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-surface-alt"
            >
              Voir toutes les offres
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <JobMatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
