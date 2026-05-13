"use client";

import { Plus, Mail } from "lucide-react";
import type { CorrespondencesListResponse } from "@/hooks/useSgCorrespondences";

interface Props {
  counts: CorrespondencesListResponse["counts"];
  readOnly: boolean;
  onCreate: () => void;
}

export function CorrespondencesHeader({ counts, readOnly, onCreate }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Courriers officiels</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          <Mail className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5" />
          {counts.incomingMonth + counts.outgoingMonth} traités ce mois ·{" "}
          <span className={counts.awaitingDg > 0 ? "font-semibold text-amber-700" : ""}>
            {counts.awaitingDg} en attente signature DG
          </span>{" "}
          · archivage légal automatique GED
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={readOnly}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Nouveau courrier
      </button>
    </div>
  );
}
