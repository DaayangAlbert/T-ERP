"use client";

import { clsx } from "clsx";

export type SpacesTab = "all" | "sites" | "transverse";

interface Props {
  active: SpacesTab;
  counts: { all: number; sites: number; transverse: number };
  onChange: (tab: SpacesTab) => void;
}

export function SpacesTabs({ active, counts, onChange }: Props) {
  const tabs: { id: SpacesTab; label: string; count: number }[] = [
    { id: "all", label: "Tous", count: counts.all },
    { id: "sites", label: "Chantiers", count: counts.sites },
    { id: "transverse", label: "Transverses", count: counts.transverse },
  ];
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={clsx(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12.5px] font-semibold transition",
            active === t.id
              ? "border-violet-300 bg-violet-100 text-violet-800"
              : "border-line bg-white text-ink-3 hover:bg-surface-alt",
          )}
        >
          {t.label}
          <span
            className={clsx(
              "rounded-full px-1.5 py-px text-[10.5px]",
              active === t.id ? "bg-violet-200 text-violet-900" : "bg-surface-alt text-ink-3",
            )}
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  );
}
