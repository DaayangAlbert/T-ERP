"use client";

import { CalendarPlus, HeartPulse } from "lucide-react";

interface Props {
  onRequestLeave: () => void;
  onReportSick: () => void;
  disabled?: boolean;
}

// 2 boutons côte-à-côte 72px : "Demander congé" (vert plein) +
// "Signaler maladie" (blanc avec icône cœur rouge).
export function LeaveActionButtons({ onRequestLeave, onReportSick, disabled }: Props) {
  return (
    <div className="mb-3.5 grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={onRequestLeave}
        disabled={disabled}
        className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl bg-[#16A34A] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(22,163,74,0.3)] transition active:scale-[0.98] disabled:opacity-60"
      >
        <CalendarPlus className="h-7 w-7" strokeWidth={2.5} />
        Demander congé
      </button>
      <button
        type="button"
        onClick={onReportSick}
        disabled={disabled}
        className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-slate-200 bg-white text-[14px] font-bold transition active:scale-[0.98] disabled:opacity-60"
      >
        <HeartPulse className="h-7 w-7 text-rose-600" strokeWidth={2.5} />
        <span className="text-rose-600">Signaler maladie</span>
      </button>
    </div>
  );
}
