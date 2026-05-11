"use client";

import { clsx } from "clsx";

type View = "in_progress" | "imminent" | "this_month" | "history";

const TABS: Array<{ key: View; label: string }> = [
  { key: "in_progress", label: "En cours" },
  { key: "imminent", label: "Remises J-7" },
  { key: "this_month", label: "Remises ce mois" },
  { key: "history", label: "Historique" },
];

export function TendersStageTabs({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            "relative inline-flex items-center px-3 py-2 text-[12.5px] font-medium transition",
            view === t.key
              ? "text-primary-700"
              : "text-ink-3 hover:text-ink"
          )}
        >
          {t.label}
          {view === t.key && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary-500" />
          )}
        </button>
      ))}
    </div>
  );
}
