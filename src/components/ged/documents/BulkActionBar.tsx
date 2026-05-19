"use client";

import { FolderOpen, Tags, X } from "lucide-react";

interface Props {
  count: number;
  onMove: () => void;
  onClassify: () => void;
  onClear: () => void;
}

export function BulkActionBar({ count, onMove, onClassify, onClear }: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-0 z-30 mx-auto flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 shadow-md">
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
          {count}
        </span>
        <span className="font-semibold text-violet-900">
          {count} document{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMove}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-violet-600 px-3 text-[12px] font-semibold text-white hover:bg-violet-700"
        >
          <FolderOpen className="h-3.5 w-3.5" /> Déplacer vers…
        </button>
        {count === 1 && (
          <button
            type="button"
            onClick={onClassify}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-violet-300 bg-white px-3 text-[12px] font-semibold text-violet-700 hover:bg-violet-50"
          >
            <Tags className="h-3.5 w-3.5" /> Classer…
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          className="grid h-8 w-8 place-items-center rounded-md text-violet-700 hover:bg-violet-100"
          aria-label="Annuler la sélection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
