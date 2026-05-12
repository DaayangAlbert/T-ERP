import Link from "next/link";
import { clsx } from "clsx";

export interface ApplicationSummary {
  id: string;
  jobTitle: string;
  region: string | null;
  contractType: string;
  stage:
    | "RECEIVED"
    | "SHORTLISTED"
    | "INTERVIEW"
    | "TECHNICAL_TEST"
    | "OFFER"
    | "HIRED"
    | "REJECTED";
  appliedAt: string; // ISO
  daysSinceApplied: number;
}

const STAGE_CFG: Record<
  ApplicationSummary["stage"],
  { label: string; cls: string; step: string; icon: string }
> = {
  RECEIVED: {
    label: "Reçue",
    cls: "bg-ink-3/10 text-ink-2",
    step: "Étape 1/5",
    icon: "📥",
  },
  SHORTLISTED: {
    label: "Présélection",
    cls: "bg-emerald-100 text-emerald-700",
    step: "Étape 2/5",
    icon: "📐",
  },
  INTERVIEW: {
    label: "En entretien",
    cls: "bg-amber-100 text-amber-800",
    step: "Étape 3/5",
    icon: "👷",
  },
  TECHNICAL_TEST: {
    label: "Test technique",
    cls: "bg-blue-100 text-blue-700",
    step: "Étape 4/5",
    icon: "🛠",
  },
  OFFER: {
    label: "Offre",
    cls: "bg-primary-100 text-primary-700",
    step: "Étape 5/5",
    icon: "🎉",
  },
  HIRED: {
    label: "Embauché",
    cls: "bg-emerald-200 text-emerald-800",
    step: "Succès",
    icon: "✅",
  },
  REJECTED: { label: "Refusée", cls: "bg-rose-100 text-rose-700", step: "—", icon: "—" },
};

export function ActiveApplicationsList({
  applications,
}: {
  applications: ApplicationSummary[];
}) {
  if (applications.length === 0) {
    return (
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">
          Mes candidatures en cours
        </h3>
        <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center text-sm text-ink-3">
          Aucune candidature active.{" "}
          <Link
            href="/"
            className="font-medium text-primary-700 hover:underline"
          >
            Découvrir les offres →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">
          Mes candidatures en cours
        </h3>
        <Link
          href="/cand/candidatures"
          className="text-xs font-medium text-primary-700 hover:underline"
        >
          Voir tout →
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        {applications.slice(0, 3).map((app, idx) => {
          const cfg = STAGE_CFG[app.stage];
          return (
            <Link
              key={app.id}
              href={`/cand/candidatures#${app.id}`}
              className={clsx(
                "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-alt",
                idx < Math.min(applications.length, 3) - 1 && "border-b border-line",
              )}
            >
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-primary-50 text-xl">
                {cfg.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">
                  {app.jobTitle}
                </div>
                <div className="text-xs text-ink-3">
                  BatimCAM
                  {app.region ? ` · ${app.region}` : ""} · postulé il y a{" "}
                  {app.daysSinceApplied} j
                </div>
              </div>
              <div className="text-right">
                <span
                  className={clsx(
                    "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                    cfg.cls,
                  )}
                >
                  {cfg.label}
                </span>
                <div className="mt-1 text-[10px] text-ink-3">{cfg.step}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
