"use client";

import type { HierarchyLevel } from "@/hooks/useOuvTeam";
import { ContactActions } from "@/components/contact/ContactActions";

interface Props {
  chief: HierarchyLevel | null;
}

// Card focus "Mon Chef Chantier" : avatar 64px, nom + rôle, statut
// présence + boutons Message / Appel via la messagerie interne.
export function TeamChiefCard({ chief }: Props) {
  if (!chief) {
    return (
      <section className="mb-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-center">
        <p className="text-[14px] text-slate-500">Aucun chef de chantier assigné</p>
      </section>
    );
  }

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 mt-1 text-[16px] font-bold text-slate-900">👷 Mon Chef Chantier</h3>
      <article className="rounded-2xl border-2 border-purple-500 bg-white p-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-purple-700 text-[20px] font-extrabold text-white">
            {chief.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-slate-900">{chief.fullName}</p>
            <p className="text-[13px] text-slate-500">
              {chief.roleLabel}
              {chief.isDirectChief ? " · chef direct" : ""}
            </p>
            <p className="mt-1 text-[12px] font-bold text-emerald-600">
              ● Présent sur chantier
            </p>
          </div>
        </div>
        <div className="mt-4">
          <ContactActions userId={chief.id} variant="full" size="lg" className="grid w-full grid-cols-2 gap-2.5" />
        </div>
      </article>
    </section>
  );
}
