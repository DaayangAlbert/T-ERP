"use client";

import { ShieldCheck } from "lucide-react";

// Mention légale obligatoire en bas du formulaire de signalement HSE.
// Code du travail CM (art. L132) : pas de sanction pour signalement
// de bonne foi. Possibilité d'anonymisation à la demande.
export function AntiRetaliationNotice({
  isAnonymous,
  onToggleAnonymous,
}: {
  isAnonymous: boolean;
  onToggleAnonymous: (v: boolean) => void;
}) {
  return (
    <div className="mb-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
      <div className="mb-2 flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <div>
          <p className="text-[13px] font-bold text-emerald-900">Protection légale</p>
          <p className="mt-1 text-[11.5px] text-emerald-800">
            Aucune sanction possible pour signalement HSE de bonne foi
            (Code du travail Cameroun, art. L132). Tu peux aussi rester
            anonyme — le CC et le DTrav ne verront pas ton nom.
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => onToggleAnonymous(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300 accent-emerald-600"
        />
        <span className="text-[13px] font-semibold text-slate-700">
          Signaler de façon anonyme
        </span>
      </label>
    </div>
  );
}
