"use client";

import { Clock, Loader2 } from "lucide-react";
import type { OuvClockState } from "@/hooks/useOuvDashboard";

interface Props {
  state: OuvClockState;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
}

// Bouton XXL 88px de hauteur, font 22px, vert (#16A34A) ou desaturé.
// Texte adaptatif selon l'état du pointage du jour.
export function ClockHeroButton({ state, pending, disabled = false, onClick }: Props) {
  const isDone = state === "DONE";
  const label = labelForState(state);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending || isDone}
      aria-busy={pending}
      className={`mb-3.5 flex min-h-[88px] w-full items-center justify-center gap-3 rounded-2xl px-6 text-[22px] font-bold text-white shadow-[0_6px_16px_rgba(22,163,74,0.35)] transition active:scale-[0.98] disabled:opacity-60 disabled:shadow-none ${
        isDone ? "bg-slate-400" : "bg-[#16A34A]"
      }`}
    >
      {pending ? (
        <Loader2 className="h-8 w-8 animate-spin" />
      ) : (
        <Clock className="h-8 w-8" strokeWidth={2.5} />
      )}
      {label}
    </button>
  );
}

function labelForState(state: OuvClockState): string {
  if (state === "NOT_CLOCKED") return "Je pointe MON ARRIVÉE";
  if (state === "IN_PROGRESS") return "Je pointe MA SORTIE";
  return "Journée pointée ✓";
}
