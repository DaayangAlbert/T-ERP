"use client";

interface Props {
  pct: number;
  filledCount: number;
  totalCount: number;
  missing: { key: string; label: string }[];
}

export function ProfileCompletionBar({
  pct,
  filledCount,
  totalCount,
  missing,
}: Props) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-ink">{pct}%</span>
            <span className="text-sm text-ink-3">
              complété ({filledCount}/{totalCount} champs)
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              style={{ width: `${pct}%` }}
              aria-label={`Complétion ${pct}%`}
            />
          </div>
        </div>
      </div>
      {missing.length > 0 ? (
        <p className="mt-3 text-xs text-ink-3">
          <span className="font-semibold text-ink-2">À compléter :</span>{" "}
          {missing
            .slice(0, 4)
            .map((m) => m.label)
            .join(" · ")}
          {missing.length > 4 ? ` · +${missing.length - 4}` : ""}
        </p>
      ) : (
        <p className="mt-3 text-xs text-emerald-700">
          ✓ Profil 100% complété — bravo !
        </p>
      )}
    </section>
  );
}
