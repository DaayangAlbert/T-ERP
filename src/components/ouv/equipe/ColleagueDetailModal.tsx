"use client";

import { X, Loader2, MapPin, Briefcase, Award } from "lucide-react";
import { useColleague } from "@/hooks/useOuvTeam";
import { ContactActions } from "@/components/contact/ContactActions";

interface Props {
  isOpen: boolean;
  colleagueId: string | null;
  onClose: () => void;
}

// Fiche collègue minimaliste (confidentialité) : nom, qualif, chantier,
// ancienneté, téléphone si même chantier, boutons WhatsApp / Appel.
// PAS de salaire, PAS de CNI, PAS de date de naissance.
export function ColleagueDetailModal({ isOpen, colleagueId, onClose }: Props) {
  const { data: c, isLoading, error } = useColleague(isOpen ? colleagueId : null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50">
      <div className="w-full rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold text-slate-900">Fiche collègue</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : error || !c ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            Impossible de charger cette fiche.
          </p>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-3.5">
              <span className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-full bg-purple-700 text-[20px] font-extrabold text-white">
                {c.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-bold text-slate-900">{c.fullName}</p>
                <p className="text-[13px] text-slate-500">
                  {c.qualification}
                  {c.teamLeader && <span className="ml-1 text-purple-600">⭐ chef d'équipe</span>}
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2.5">
              <InfoLine icon={Briefcase} label="Rôle" value={c.role} />
              {c.professionalCategory && (
                <InfoLine icon={Award} label="Catégorie" value={c.professionalCategory} />
              )}
              {c.site && (
                <InfoLine
                  icon={MapPin}
                  label="Chantier"
                  value={`${c.site.name} (${c.site.code})`}
                />
              )}
              {c.yearsOnSite != null && (
                <InfoLine
                  icon={Award}
                  label="Ancienneté"
                  value={`${c.yearsOnSite} an${c.yearsOnSite > 1 ? "s" : ""} dans l'entreprise`}
                />
              )}
            </div>

            {/* Contact via messagerie interne (pas de tel:/WhatsApp externe) */}
            <ContactActions userId={c.id} variant="full" size="lg" className="grid grid-cols-2" />

            <p className="mt-2 text-center text-[11px] text-slate-500">
              Message ou appel via la messagerie T-ERP
            </p>

            <p className="mt-4 text-center text-[11px] text-slate-400">
              Contact strictement professionnel · pas de données personnelles affichées
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
        <p className="text-[13px] font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
