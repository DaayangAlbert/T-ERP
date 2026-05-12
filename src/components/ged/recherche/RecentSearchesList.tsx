"use client";

import { History, RotateCcw } from "lucide-react";
import { useRecentSearches } from "@/hooks/useGedSearch";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffH = Math.floor(diffMs / 3600_000);
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${diffH} h`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  onRelaunch: (query: string) => void;
}

export function RecentSearchesList({ onRelaunch }: Props) {
  const { data, isLoading } = useRecentSearches();

  if (isLoading) {
    return (
      <section className="rounded-xl border border-line bg-white">
        <header className="border-b border-line px-4 py-2.5">
          <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <History className="h-4 w-4 text-ink-3" /> Recherches récentes
          </h2>
        </header>
        <div className="space-y-1.5 p-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-surface-alt" />
          ))}
        </div>
      </section>
    );
  }

  const recent = data?.recent ?? [];

  return (
    <section className="rounded-xl border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
          <History className="h-4 w-4 text-ink-3" /> Recherches récentes
        </h2>
        <span className="text-[11px] text-ink-3">{recent.length} dernières</span>
      </header>
      {recent.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12.5px] text-ink-3">
          Aucune recherche enregistrée. Lancez une requête pour commencer.
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {recent.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-ink">{r.query}</div>
                <div className="text-[10.5px] text-ink-3">
                  {r.total} résultat{r.total > 1 ? "s" : ""} · {fmtTime(r.timestamp)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRelaunch(r.query)}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-[11.5px] font-semibold text-violet-700 hover:bg-violet-50"
              >
                <RotateCcw className="h-3 w-3" /> Relancer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
