"use client";

import { useState } from "react";
import type { TeamMember, TeamResponse } from "@/hooks/useOuvTeam";

interface Props {
  team: TeamResponse | undefined;
  onSelectColleague: (id: string) => void;
}

const COLLAPSED = 5;

// Liste des coéquipiers avec présence du jour. Présent (vert) / Absent
// (ambre) / À pointer (ambre). Chef d'équipe étoilé. Moi en surbrillance.
// 5 affichés par défaut + "Voir N autres".
export function TeamColleaguesList({ team, onSelectColleague }: Props) {
  const [showAll, setShowAll] = useState(false);
  if (!team || team.members.length === 0) return null;

  const visibleMembers = showAll ? team.members : team.members.slice(0, COLLAPSED);
  const remaining = team.members.length - COLLAPSED;

  return (
    <section className="mb-3.5">
      <h3 className="mb-2.5 text-[16px] font-bold text-slate-900">
        👥 Mon équipe {team.specialty ?? "ouvriers"} · aujourd'hui ({team.stats.present} / {team.stats.total} présents)
      </h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {visibleMembers.map((m, idx) => (
          <Row
            key={m.id}
            member={m}
            onClick={() => onSelectColleague(m.id)}
            isLast={!showAll && idx === visibleMembers.length - 1 && remaining > 0 ? false : idx === visibleMembers.length - 1}
          />
        ))}
        {!showAll && remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="block w-full px-4 py-3 text-center text-[13px] font-semibold text-purple-600"
          >
            Voir {remaining} autres ouvrier{remaining > 1 ? "s" : ""} →
          </button>
        )}
      </div>
    </section>
  );
}

function Row({
  member,
  onClick,
  isLast,
}: {
  member: TeamMember;
  onClick: () => void;
  isLast: boolean;
}) {
  const isMe = member.isMe;
  const bgCls = isMe ? "bg-slate-50" : "bg-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left ${bgCls} ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      <span
        className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold text-white ${
          isMe ? "bg-purple-500 ring-2 ring-purple-700" : ""
        }`}
        style={isMe ? undefined : { backgroundColor: avatarColor(member.initials) }}
      >
        {member.initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-slate-900">
          {member.fullName}
          {member.teamLeader && (
            <span className="ml-1 text-[11px] font-bold text-purple-600">⭐ chef d'équipe</span>
          )}
          {isMe && (
            <span className="ml-1 text-[11px] font-bold text-purple-700">← moi</span>
          )}
        </p>
        <p className="truncate text-[12px] text-slate-500">
          {member.qualification}
          {member.presenceState === "PRESENT" && member.arrivalTime && (
            <span> · présent {formatHHMM(member.arrivalTime)}</span>
          )}
          {member.presenceState === "ABSENT" && member.absentReason && (
            <span> · {humanReason(member.absentReason)}</span>
          )}
        </p>
      </div>
      <PresenceChip state={member.presenceState} />
    </button>
  );
}

function PresenceChip({ state }: { state: TeamMember["presenceState"] }) {
  if (state === "PRESENT") {
    return (
      <span className="flex-shrink-0 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        ● Présent
      </span>
    );
  }
  if (state === "ABSENT") {
    return (
      <span className="flex-shrink-0 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        Absent
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
      ⏰ À pointer
    </span>
  );
}

function humanReason(reason: string): string {
  if (reason === "ABSENT_JUSTIFIED") return "absent justifié";
  if (reason === "ABSENT_UNJUSTIFIED") return "absent injustifié";
  if (reason === "LEAVE") return "en congé";
  if (reason === "SICK") return "en arrêt maladie";
  if (reason === "HOLIDAY") return "jour férié";
  return "absent";
}

function formatHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Couleur d'avatar déterministe basée sur les initiales — accord visuel
// avec le prototype (#0F766E, #9F580A, #2A1B3D, #A855F7). Tailwind ne
// supporte pas les couleurs dynamiques, on passe par style inline.
const PALETTE = ["#0F766E", "#9F580A", "#2A1B3D", "#7C3AED", "#0369A1", "#15803D", "#92400E"];
function avatarColor(initials: string): string {
  let h = 0;
  for (let i = 0; i < initials.length; i++) h = (h * 31 + initials.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
