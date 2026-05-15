"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvProfile } from "@/hooks/useOuvProfile";
import { useOuvDocuments } from "@/hooks/useOuvDocuments";

import { ProfileIdentityCard } from "@/components/ouv/profil/ProfileIdentityCard";
import { ProfileInfoPro } from "@/components/ouv/profil/ProfileInfoPro";
import { ProfileContacts } from "@/components/ouv/profil/ProfileContacts";
import { ProfileDocuments } from "@/components/ouv/profil/ProfileDocuments";
import { ChangePinModal } from "@/components/ouv/profil/ChangePinModal";
import { ProfileBottomActions } from "@/components/ouv/profil/LogoutButton";

// Page mirror screen-ouv-profil : identité gradient violet + infos pro
// + coordonnées éditables + raccourcis docs + bouton PIN + déconnexion.
export default function OuvProfilPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const profile = useOuvProfile();
  const documents = useOuvDocuments();
  const [pinOpen, setPinOpen] = useState(false);

  return (
    <>
      <header className="flex items-center gap-3 bg-[#2A1B3D] px-4 py-3 text-white">
        <Link
          href={`/${tenantSlug}/ouv/dashboard`}
          aria-label="Retour"
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[17px] font-bold leading-tight">Mon profil</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {profile.data?.profile.initials ?? "??"}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        {profile.isLoading || !profile.data ? (
          <ProfileSkeleton />
        ) : (
          <>
            <ProfileIdentityCard profile={profile.data.profile} />
            <ProfileInfoPro profile={profile.data.profile} />
            <ProfileContacts profile={profile.data.profile} />
            <ProfileDocuments
              documents={documents.data?.documents ?? []}
              countAttestations={documents.data?.counts.attestations ?? 0}
              countPayslips={documents.data?.counts.payslips ?? 0}
              preferredLanguage={profile.data.profile.preferredLanguage}
            />
            <ProfileBottomActions onChangePin={() => setPinOpen(true)} />
          </>
        )}
      </main>

      <ChangePinModal isOpen={pinOpen} onClose={() => setPinOpen(false)} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-3.5">
      <div className="h-[220px] animate-pulse rounded-2xl bg-gradient-to-br from-purple-300 to-purple-400" />
      <div className="h-[260px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[180px] animate-pulse rounded-2xl bg-white" />
      <div className="h-[280px] animate-pulse rounded-2xl bg-white" />
    </div>
  );
}
