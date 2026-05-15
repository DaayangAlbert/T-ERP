"use client";

import type { OuvProfile } from "@/hooks/useOuvProfile";

interface Props {
  profile: OuvProfile;
}

// Card identité gradient violet centrée : avatar 88px, nom, qualif,
// matricule + CNI. Mirror direct du prototype.
export function ProfileIdentityCard({ profile }: Props) {
  return (
    <section className="mb-3.5 rounded-2xl bg-gradient-to-br from-[#2A1B3D] to-[#7E22CE] px-5 py-6 text-center text-white shadow-[0_4px_16px_rgba(126,34,206,0.25)]">
      {profile.avatarUrl ? (
        <img
          src={profile.avatarUrl}
          alt={profile.initials}
          className="mx-auto mb-3 h-[88px] w-[88px] rounded-full border-4 border-white/20 object-cover"
        />
      ) : (
        <div className="mx-auto mb-3 grid h-[88px] w-[88px] place-items-center rounded-full border-4 border-white/20 bg-purple-500 text-[32px] font-extrabold">
          {profile.initials}
        </div>
      )}
      <p className="text-[22px] font-extrabold">{profile.fullName}</p>
      <p className="mt-1 text-[14px] opacity-85">{profile.qualification}</p>
      <p className="mt-0.5 font-mono text-[12px] opacity-80">
        Matricule {profile.matriculeShort ?? profile.matricule ?? "—"}
        {profile.cniNumber && ` · CNI ${profile.cniNumber}`}
      </p>
    </section>
  );
}
