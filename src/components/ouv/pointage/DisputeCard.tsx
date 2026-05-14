"use client";

import { AlertTriangle } from "lucide-react";

interface Props {
  chiefFullName: string | null;
  onOpen: () => void;
}

// Card ambré "Vous constatez un désaccord ?" — fixe à la fin de la page,
// pleine largeur, déclenche l'ouverture du DisputeFormModal au tap.
export function DisputeCard({ chiefFullName, onOpen }: Props) {
  return (
    <section className="mb-3.5 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
      <div className="mb-2.5 flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
        <div>
          <p className="text-[14px] font-bold text-amber-900">
            Vous constatez un désaccord ?
          </p>
          <p className="mt-1 text-[12px] text-amber-800">
            Si une heure pointée
            {chiefFullName ? ` par ${chiefFullName}` : ""} ne correspond pas à votre journée
            réelle, signalez-le sous 48 h.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-white px-4 text-[14px] font-bold text-amber-900 transition active:scale-[0.98]"
      >
        📝 Signaler un désaccord
      </button>
    </section>
  );
}
