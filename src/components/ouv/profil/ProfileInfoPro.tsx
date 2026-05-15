"use client";

import type { OuvProfile } from "@/hooks/useOuvProfile";

interface Props {
  profile: OuvProfile;
}

// Bloc "Informations professionnelles" en read-only. Tout changement
// passe par RH (cf spec confidentialité).
export function ProfileInfoPro({ profile }: Props) {
  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">💼 Informations professionnelles</h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <Row label="Type contrat" value={profile.contractType ?? "—"} />
        <Row
          label="Date embauche"
          value={
            profile.hireDate
              ? new Date(profile.hireDate).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : "—"
          }
        />
        <Row label="Ancienneté" value={profile.seniorityLabel} />
        <Row label="Catégorie" value={profile.professionalCategory ?? "—"} />
        <Row label="N° CNPS" value={profile.cnpsNumber ?? "—"} mono />
        <Row label="NIU fiscal" value={profile.niu ?? "—"} mono isLast />
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        Changement contrat / catégorie / RIB : passe par RH
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  isLast,
}: {
  label: string;
  value: string;
  mono?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3.5 ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={`text-[13px] font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
