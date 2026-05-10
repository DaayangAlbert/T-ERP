"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onChange: (p: number) => void;
}

export function PersonnelPagination({ page, totalPages, total, limit, onChange }: Props) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Compact range: previous, current, next, first/last
  const pages: number[] = [];
  pages.push(1);
  if (page > 3) pages.push(-1);
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
    pages.push(p);
  }
  if (page < totalPages - 2) pages.push(-1);
  if (totalPages > 1) pages.push(totalPages);
  const dedup = pages.filter((p, i, arr) => p !== arr[i - 1]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-2 text-[12px] text-ink-3">
      <div>
        Affichage <span className="font-mono font-semibold text-ink">{start}-{end}</span> sur{" "}
        <span className="font-mono font-semibold text-ink">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-3 hover:bg-surface-alt disabled:opacity-40"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {dedup.map((p, i) =>
          p === -1 ? (
            <span key={`g-${i}`} className="px-1 text-ink-3">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={clsx(
                "min-w-[28px] rounded border px-1.5 text-[11.5px] font-medium",
                p === page
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-line bg-white text-ink-3 hover:bg-surface-alt"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="grid h-7 w-7 place-items-center rounded border border-line bg-white text-ink-3 hover:bg-surface-alt disabled:opacity-40"
          aria-label="Suivant"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
