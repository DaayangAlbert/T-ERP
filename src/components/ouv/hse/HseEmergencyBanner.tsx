"use client";

import { Phone } from "lucide-react";
import type { EmergencyContacts } from "@/hooks/useOuvHse";

interface Props {
  contacts: EmergencyContacts | undefined;
}

// Bandeau URGENCE VITALE rouge gradient. Bouton géant pour appeler le CC,
// rappels des numéros nationaux (117 pompiers, 113 police, 119 SAMU).
// "L'app est secondaire face à l'humain" (cf spec).
export function HseEmergencyBanner({ contacts }: Props) {
  const chief = contacts?.siteManager;
  return (
    <section className="mb-3.5 rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#991B1B] p-[18px] text-center text-white shadow-[0_4px_16px_rgba(220,38,38,0.3)]">
      <p className="text-[13px] font-bold uppercase tracking-wide opacity-90">
        🆘 URGENCE VITALE ?
      </p>
      <p className="mt-1.5 text-[15px] opacity-95">
        Appelle immédiatement le 117 (pompiers) ou ton chef
      </p>

      {chief?.telUrl && (
        <a
          href={chief.telUrl}
          className="mt-3.5 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-white text-[18px] font-bold text-rose-700 shadow-lg active:scale-[0.98]"
        >
          <Phone className="h-6 w-6" />
          Appeler {chief.fullName}
        </a>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {(contacts?.nationalEmergencies ?? []).map((e) => (
          <a
            key={e.number}
            href={e.telUrl}
            className="flex flex-col items-center justify-center rounded-lg bg-white/15 px-2 py-2 text-white"
          >
            <span className="text-[11px] opacity-80">{e.label}</span>
            <span className="text-[18px] font-extrabold leading-tight">{e.number}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
