"use client";

import { Plus, Network } from "lucide-react";
import type { InstitutionsListResponse } from "@/hooks/useSgInstitutions";

interface Props {
  counts: InstitutionsListResponse["counts"];
  approvalsValid: number;
  readOnly: boolean;
  onCreate: () => void;
}

export function InstitutionsHeader({ counts, approvalsValid, readOnly, onCreate }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">Relations institutionnelles</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          <Network className="mr-1 inline h-3.5 w-3.5 -translate-y-0.5" />
          {counts.ministries} ministère{counts.ministries > 1 ? "s" : ""} ·{" "}
          {counts.municipalities} commune{counts.municipalities > 1 ? "s" : ""} ·{" "}
          {counts.associations} organisation{counts.associations > 1 ? "s" : ""} pro · {approvalsValid} agrément
          {approvalsValid > 1 ? "s" : ""} BTP valide{approvalsValid > 1 ? "s" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={readOnly}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Nouvelle institution
      </button>
    </div>
  );
}
