import { cookies } from "next/headers";
import Link from "next/link";
import { requireCandidateSession } from "@/lib/cand-session";
import { ApplicationsHeader } from "@/components/cand/candidatures/ApplicationsHeader";
import { ApplicationsTabs } from "@/components/cand/candidatures/ApplicationsTabs";
import {
  ApplicationCard,
  type ApplicationCardData,
} from "@/components/cand/candidatures/ApplicationCard";

export const dynamic = "force-dynamic";

interface ApplicationsPayload {
  filter: "active" | "archived" | "all";
  stats: { active: number; archived: number; total: number };
  applications: ApplicationCardData[];
}

async function fetchApplications(
  filter: string,
): Promise<ApplicationsPayload> {
  const cookieHeader = cookies().toString();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000";
  const res = await fetch(
    `${baseUrl}/api/cand/applications?filter=${encodeURIComponent(filter)}`,
    { cache: "no-store", headers: { cookie: cookieHeader } },
  );
  if (!res.ok) throw new Error(`Applications API ${res.status}`);
  return res.json();
}

export default async function CandidaturesPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  requireCandidateSession();
  const filter = searchParams?.filter ?? "active";
  const data = await fetchApplications(filter);

  return (
    <div className="space-y-4">
      <ApplicationsHeader
        active={data.stats.active}
        archived={data.stats.archived}
      />
      <ApplicationsTabs
        active={data.stats.active}
        archived={data.stats.archived}
        total={data.stats.total}
      />

      {data.applications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <p className="text-sm text-ink-3">
            {filter === "active"
              ? "Aucune candidature active."
              : filter === "archived"
                ? "Aucune candidature archivée."
                : "Aucune candidature."}
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-sm font-medium text-primary-700 hover:underline"
          >
            Découvrir les offres →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.applications.map((app) => (
            <ApplicationCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}
