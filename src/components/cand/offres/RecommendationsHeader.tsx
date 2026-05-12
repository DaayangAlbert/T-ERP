"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Info } from "lucide-react";

interface Props {
  count: number;
  minScore: number;
}

export function RecommendationsHeader({ count, minScore }: Props) {
  const router = useRouter();
  const [recomputing, startRecompute] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRecompute() {
    setError(null);
    startRecompute(async () => {
      const res = await fetch("/api/cand/recommendations/recompute", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Erreur de recalcul");
        return;
      }
      router.refresh();
    });
  }

  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ink">
            <Sparkles className="h-5 w-5 text-primary" /> Offres pour vous
          </h1>
          <p className="text-sm text-ink-3">
            {count} offre{count > 1 ? "s" : ""} avec un score matching ≥ {minScore}%
          </p>
        </div>
        <button
          type="button"
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-surface-alt disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recomputing ? "animate-spin" : ""}`} />
          {recomputing ? "Recalcul…" : "Recalculer maintenant"}
        </button>
      </div>
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <p className="flex items-start gap-1.5 text-[11px] text-ink-3">
        <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
        Score basé sur compétences (40%), expérience (25%), localisation (15%),
        contrat (10%) et salaire (10%).
      </p>
    </header>
  );
}
