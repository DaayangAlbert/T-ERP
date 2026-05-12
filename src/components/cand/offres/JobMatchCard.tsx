"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Briefcase, Coins, X } from "lucide-react";
import { MatchScoreCircle } from "./MatchScoreCircle";
import { MatchedSkillsChips } from "./MatchedSkillsChips";

export interface JobMatchData {
  id: string;
  jobOfferId: string;
  title: string;
  region: string | null;
  contractType: string;
  category: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  score: number;
  matchedSkills: string[];
  missingRequirements: string[];
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

function relativeDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "publié aujourd'hui";
  if (days === 1) return "publié hier";
  if (days < 30) return `publié il y a ${days} j`;
  return `publié le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(d)}`;
}

export function JobMatchCard({ match }: { match: JobMatchData }) {
  const router = useRouter();
  const [dismissing, startDismiss] = useTransition();
  const [hidden, setHidden] = useState(false);

  async function handleDismiss() {
    startDismiss(async () => {
      const res = await fetch(
        `/api/cand/recommendations/${match.jobOfferId}/dismiss`,
        { method: "POST" },
      );
      if (res.ok) {
        setHidden(true);
        router.refresh();
      }
    });
  }

  if (hidden) return null;

  const salary = formatSalary(match.salaryMin, match.salaryMax);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-card transition-shadow hover:shadow-brand-lg">
      <div className="flex flex-wrap items-start gap-4 p-4">
        <MatchScoreCircle score={match.score} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink">{match.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  BatimCAM{match.region ? ` · ${match.region}` : ""}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {match.contractType}
                </span>
                {salary ? (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      {salary}
                    </span>
                  </>
                ) : null}
                {match.publishedAt ? (
                  <>
                    <span>·</span>
                    <span>{relativeDate(match.publishedAt)}</span>
                  </>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              disabled={dismissing}
              className="rounded-md p-1 text-ink-3 hover:bg-surface-alt hover:text-rose-600 disabled:opacity-60"
              aria-label="Pas intéressé"
              title="Pas intéressé"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <MatchedSkillsChips
              matched={match.matchedSkills}
              missing={match.missingRequirements}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-alt px-4 py-2">
        <Link
          href={`/jobs/${match.jobOfferId}`}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface"
        >
          Voir l&apos;offre
        </Link>
        <Link
          href={`/jobs/${match.jobOfferId}?apply=1`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white shadow-brand hover:bg-primary-600"
        >
          Postuler →
        </Link>
      </div>
    </article>
  );
}
