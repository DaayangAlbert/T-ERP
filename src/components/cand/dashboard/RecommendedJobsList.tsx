import Link from "next/link";
import { clsx } from "clsx";

export interface JobMatchSummary {
  jobOfferId: string;
  title: string;
  region: string | null;
  tenantName?: string;
  contractType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  score: number;
}

function formatSalary(min: number | null, max: number | null): string | null {
  if (min === null && max === null) return null;
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} M`
      : `${Math.round(n / 1000)} K`;
  if (min === null) return `≤ ${fmt(max!)} FCFA`;
  if (max === null) return `≥ ${fmt(min)} FCFA`;
  return `${fmt(min)} - ${fmt(max)} FCFA`;
}

export function RecommendedJobsList({
  matches,
  totalAvailable,
}: {
  matches: JobMatchSummary[];
  totalAvailable: number;
}) {
  if (matches.length === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          Offres recommandées pour vous
        </h3>
        <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">
          Aucune recommandation pour le moment.{" "}
          <Link
            href="/cand/profil"
            className="font-medium text-primary-700 hover:underline"
          >
            Complétez votre profil →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Offres recommandées pour vous
        </h3>
        <span className="text-xs text-ink-3">
          Matching auto (fn 1.5 finale)
        </span>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        {matches.map((m, idx) => {
          const salary = formatSalary(m.salaryMin, m.salaryMax);
          return (
            <Link
              key={m.jobOfferId}
              href={`/jobs/${m.jobOfferId}`}
              className={clsx(
                "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-alt",
                idx < matches.length - 1 && "border-b border-line",
              )}
            >
              <ScoreCircle score={m.score} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {m.title}
                </div>
                <div className="text-xs text-ink-3">
                  {m.tenantName ?? "—"}
                  {m.region ? ` · ${m.region}` : ""} · {m.contractType}
                  {salary ? ` · ${salary}` : ""}
                </div>
              </div>
              <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white">
                Postuler
              </span>
            </Link>
          );
        })}
        {totalAvailable > matches.length ? (
          <Link
            href="/cand/offres"
            className="block px-4 py-3 text-center text-sm font-semibold text-primary-700 transition-colors hover:bg-surface-alt"
          >
            Voir les {totalAvailable} offres recommandées →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function ScoreCircle({ score }: { score: number }) {
  return (
    <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">
      {score}%
    </div>
  );
}
