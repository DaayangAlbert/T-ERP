import { cookies } from "next/headers";
import { requireCandidateSession } from "@/lib/cand-session";
import { CandKpiRow } from "@/components/cand/dashboard/CandKpiRow";
import { NextInterviewCard } from "@/components/cand/dashboard/NextInterviewCard";
import {
  ActiveApplicationsList,
  type ApplicationSummary,
} from "@/components/cand/dashboard/ActiveApplicationsList";
import {
  RecommendedJobsList,
  type JobMatchSummary,
} from "@/components/cand/dashboard/RecommendedJobsList";

export const dynamic = "force-dynamic";

interface DashboardPayload {
  candidate: {
    firstName: string;
    lastName: string;
    tenantName: string;
    completionPct: number;
  };
  kpis: {
    activeApplications: number;
    applicationsInInterview: number;
    upcomingInterviews: number;
    nextInterviewLabel: string | null;
    recommendations: number;
    profileCompletion: number;
    profileMissingHint: string | null;
  };
  nextInterview: {
    id: string;
    scheduledAt: string;
    duration: number;
    mode: "ONSITE" | "PHONE" | "VIDEO";
    location: string | null;
    jobTitle: string;
    interviewerName: string | null;
    candidateConfirmed: boolean;
  } | null;
  activeApplications: ApplicationSummary[];
  topMatches: JobMatchSummary[];
  totalRecommendations: number;
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/cand/dashboard`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) {
    throw new Error(`Dashboard API ${res.status}`);
  }
  return res.json();
}

export default async function CandidateDashboardPage() {
  // Garantit la session candidat avant l'appel API.
  requireCandidateSession();

  const data = await fetchDashboard();

  return (
    <div className="space-y-5">
      <CandKpiRow data={data.kpis} />

      {data.nextInterview ? (
        <NextInterviewCard interview={data.nextInterview} />
      ) : null}

      <ActiveApplicationsList applications={data.activeApplications} />

      <RecommendedJobsList
        matches={data.topMatches}
        totalAvailable={data.totalRecommendations}
      />
    </div>
  );
}
