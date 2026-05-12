import { cookies } from "next/headers";
import { requireCandidateSession } from "@/lib/cand-session";
import {
  UpcomingInterviewCard,
  type UpcomingInterview,
} from "@/components/cand/entretiens/UpcomingInterviewCard";
import {
  PastInterviewsList,
  type PastInterview,
} from "@/components/cand/entretiens/PastInterviewsList";

export const dynamic = "force-dynamic";

interface InterviewsPayload {
  upcoming: UpcomingInterview[];
  past: PastInterview[];
}

async function fetchInterviews(): Promise<InterviewsPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(`${baseUrl}/api/cand/interviews`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error(`Interviews API ${res.status}`);
  return res.json();
}

export default async function EntretiensPage() {
  requireCandidateSession();
  const data = await fetchInterviews();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-ink">Mes entretiens</h1>
        <p className="text-sm text-ink-3">
          {data.upcoming.length} à venir · {data.past.length} effectué
          {data.past.length > 1 ? "s" : ""}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">À venir</h2>
        {data.upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">
            Aucun entretien à venir. Vous serez notifié dès qu&apos;un recruteur en
            programme un.
          </p>
        ) : (
          <div className="space-y-4">
            {data.upcoming.map((iv) => (
              <UpcomingInterviewCard key={iv.id} interview={iv} />
            ))}
          </div>
        )}
      </section>

      <PastInterviewsList interviews={data.past} />
    </div>
  );
}
