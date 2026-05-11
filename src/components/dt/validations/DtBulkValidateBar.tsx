"use client";

import { Check, X } from "lucide-react";

interface Props {
  count: number;
  onBulkApprove: () => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function DtBulkValidateBar({ count, onBulkApprove, onClear, isLoading }: Props) {
  if (count === 0) return null;
  return (
    <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 shadow-md">
      <span className="text-[12.5px] font-semibold text-primary-800">
        {count} dossier(s) sélectionné(s)
      </span>
      <div className="ml-auto flex gap-1.5">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded border border-line-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 hover:border-primary-300"
        >
          <X className="h-3 w-3" /> Désélectionner
        </button>
        <button
          disabled={isLoading}
          onClick={onBulkApprove}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Check className="h-3 w-3" /> Valider en lot
        </button>
      </div>
    </div>
  );
}
