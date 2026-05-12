"use client";

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

/**
 * CTA principal 56 px sticky en bas d'écran sur mobile, intégré au flux
 * sur desktop. Gradient violet T-ERP. Touche cible 56 px.
 */
export function RequestLeaveButton({ onClick }: Props) {
  return (
    <div className="sticky bottom-4 z-10 mt-6">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99]"
      >
        <Plus className="h-5 w-5" />
        Demander un congé
      </button>
    </div>
  );
}
