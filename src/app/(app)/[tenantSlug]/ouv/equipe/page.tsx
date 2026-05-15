"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useOuvDashboard } from "@/hooks/useOuvDashboard";
import { useTeam, useHierarchy } from "@/hooks/useOuvTeam";

import { TeamChiefCard } from "@/components/ouv/equipe/TeamChiefCard";
import { TeamHierarchyList } from "@/components/ouv/equipe/TeamHierarchyList";
import { TeamColleaguesList } from "@/components/ouv/equipe/TeamColleaguesList";
import { ColleagueDetailModal } from "@/components/ouv/equipe/ColleagueDetailModal";

// Page mirror screen-ouv-equipe :
//   1. Card "Mon Chef Chantier" focus (extrait depuis hierarchy)
//   2. Liste hiérarchie 3-4 niveaux (DTrav → CondTrav → CC → Moi)
//   3. Liste équipe coffrage avec présences temps réel
//
// Tap sur un collègue → ouvre ColleagueDetailModal (fiche min. + contact).
export default function OuvEquipePage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug ?? "";

  const dashboard = useOuvDashboard();
  const team = useTeam();
  const hierarchy = useHierarchy();
  const [colleagueId, setColleagueId] = useState<string | null>(null);

  const initials = dashboard.data?.user.initials ?? "??";
  const directChief =
    hierarchy.data?.hierarchy.find((h) => h.isDirectChief) ?? null;

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
          <p className="text-[17px] font-bold leading-tight">Mon équipe</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-500 text-[13px] font-bold">
          {initials}
        </span>
      </header>

      <main className="page mx-auto w-full max-w-screen-md px-3 pt-3.5">
        {hierarchy.isLoading ? (
          <div className="mb-3.5 h-[140px] animate-pulse rounded-2xl bg-white" />
        ) : (
          <TeamChiefCard chief={directChief} />
        )}

        {hierarchy.isLoading ? (
          <div className="mb-3.5 h-[200px] animate-pulse rounded-2xl bg-white" />
        ) : (
          <TeamHierarchyList hierarchy={hierarchy.data?.hierarchy ?? []} />
        )}

        {team.isLoading ? (
          <div className="mb-3.5 h-[360px] animate-pulse rounded-2xl bg-white" />
        ) : (
          <TeamColleaguesList team={team.data} onSelectColleague={setColleagueId} />
        )}
      </main>

      <ColleagueDetailModal
        isOpen={colleagueId != null}
        colleagueId={colleagueId}
        onClose={() => setColleagueId(null)}
      />
    </>
  );
}
