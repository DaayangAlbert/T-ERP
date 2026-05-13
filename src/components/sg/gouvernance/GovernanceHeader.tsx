"use client";

import { Plus, Download } from "lucide-react";
import type { MeetingsListResponse } from "@/hooks/useSgGovernance";

interface Props {
  kpis: MeetingsListResponse["kpis"];
  nextMeeting: MeetingsListResponse["nextMeeting"];
  readOnly: boolean;
  onCreate: () => void;
  onExportRegister: () => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export function GovernanceHeader({ kpis, nextMeeting, readOnly, onCreate, onExportRegister }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">CA & Gouvernance</h1>
        <p className="mt-1 text-[12.5px] text-ink-3">
          SA OHADA Acte Uniforme · {kpis.boardMembersCount} administrateurs
          {nextMeeting && (
            <>
              {" "}· prochain {nextMeeting.type === "BOARD_MEETING" ? "CA" : nextMeeting.type === "ORDINARY_AG" ? "AG ordinaire" : "AG extraordinaire"} {fmtDate(nextMeeting.scheduledAt)}
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportRegister}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-surface-alt"
        >
          <Download className="h-4 w-4" /> Registre des décisions
        </button>
        <button
          type="button"
          onClick={onCreate}
          disabled={readOnly}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[12.5px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Programmer une réunion
        </button>
      </div>
    </div>
  );
}
