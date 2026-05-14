"use client";

import { ChevronRight, Banknote } from "lucide-react";

interface Props {
  maxAllowedXAF: number;
  hasOpenAdvance: boolean;
  onClick: () => void;
}

// CTA "Demander une avance" : card pleine largeur avec icône 💸, libellé,
// plafond 30 % visible. Désactivée si une avance est déjà en cours.
export function AdvanceRequestCTA({ maxAllowedXAF, hasOpenAdvance, onClick }: Props) {
  const disabled = hasOpenAdvance || maxAllowedXAF <= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mb-3.5 flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 transition active:scale-[0.99] disabled:opacity-60 ${
        disabled ? "border-slate-200" : "border-purple-100 hover:border-purple-300"
      }`}
    >
      <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600">
        <Banknote className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[17px] font-bold leading-tight text-slate-900">Demander une avance</p>
        <p className="truncate text-[12.5px] text-slate-500">
          {hasOpenAdvance
            ? "Une avance est déjà en cours"
            : maxAllowedXAF > 0
              ? `Max 30 % salaire base · ${maxAllowedXAF.toLocaleString("fr-FR")} FCFA`
              : "Aucun bulletin émis pour calculer le plafond"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" strokeWidth={2} />
    </button>
  );
}
