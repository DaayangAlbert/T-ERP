"use client";

import { clsx } from "clsx";
import { REPORT_BLOCKS, BLOCK_CATEGORIES, type BlockCategory } from "@/lib/report-blocks";

interface Props {
  selected: string[];
  onToggle: (key: string) => void;
}

export function BlockLibrary({ selected, onToggle }: Props) {
  const grouped = REPORT_BLOCKS.reduce<Record<BlockCategory, typeof REPORT_BLOCKS>>((acc, b) => {
    acc[b.category] = acc[b.category] ?? [];
    acc[b.category].push(b);
    return acc;
  }, { KPI: [], CHART: [], TABLE: [], TEXT: [] });

  return (
    <div className="space-y-4">
      {(Object.keys(BLOCK_CATEGORIES) as BlockCategory[]).map((cat) => (
        <div key={cat}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
            {BLOCK_CATEGORIES[cat]}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {grouped[cat].map((b) => {
              const isOn = selected.includes(b.key);
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => onToggle(b.key)}
                  className={clsx(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-left transition",
                    isOn
                      ? "border-primary-300 bg-primary-50"
                      : "border-line bg-white hover:border-primary-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggle(b.key)}
                    className="mt-0.5 h-3.5 w-3.5"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{b.label}</div>
                    <div className="text-[11px] text-ink-3">{b.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
