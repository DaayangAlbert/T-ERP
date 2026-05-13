"use client";

import { clsx } from "clsx";
import type { CorrespondencesListResponse } from "@/hooks/useSgCorrespondences";

export type CorrespondenceTab = "INCOMING" | "OUTGOING" | "DRAFTS" | "AWAITING_DG" | "ARCHIVED";

interface Props {
  active: CorrespondenceTab;
  counts: CorrespondencesListResponse["counts"];
  onChange: (t: CorrespondenceTab) => void;
}

export function CorrespondencesTabs({ active, counts, onChange }: Props) {
  const tabs: { id: CorrespondenceTab; label: string; count: number }[] = [
    { id: "INCOMING", label: "Entrants", count: counts.incomingMonth },
    { id: "OUTGOING", label: "Sortants", count: counts.outgoingMonth },
    { id: "DRAFTS", label: "Brouillons", count: counts.drafts },
    { id: "AWAITING_DG", label: "Signature DG", count: counts.awaitingDg },
    { id: "ARCHIVED", label: "Archivés", count: counts.archived },
  ];
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-[12px] font-semibold transition",
              isActive
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
            <span
              className={clsx(
                "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                isActive ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-700",
                t.id === "AWAITING_DG" && t.count > 0 && "bg-amber-100 text-amber-700",
              )}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
