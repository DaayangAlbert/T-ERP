"use client";

import { useQuery } from "@tanstack/react-query";

export type PresenceState = "PRESENT" | "ABSENT" | "NOT_POINTED";

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  qualification: string;
  teamLeader: boolean;
  isMe: boolean;
  presenceState: PresenceState;
  arrivalTime: string | null;
  absentReason: string | null;
  phoneE164: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
}

export interface TeamResponse {
  site: { id: string; code: string; name: string } | null;
  specialty: string | null;
  members: TeamMember[];
  stats: { total: number; present: number; absent: number; notPointed: number };
}

export interface HierarchyLevel {
  id: string;
  fullName: string;
  initials: string;
  roleLabel: string;
  levelLabel: string;
  isDirectChief: boolean;
  isMe: boolean;
  phoneE164: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
}

export interface HierarchyResponse {
  hierarchy: HierarchyLevel[];
}

export interface ColleagueDetail {
  id: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
  qualification: string;
  professionalCategory: string | null;
  teamLeader: boolean;
  role: string;
  site: { code: string; name: string } | null;
  yearsOnSite: number | null;
  phoneE164: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
}

export function useTeam() {
  return useQuery<TeamResponse>({
    queryKey: ["ouv", "team"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/team", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture équipe impossible");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useHierarchy() {
  return useQuery<HierarchyResponse>({
    queryKey: ["ouv", "team", "hierarchy"],
    queryFn: async () => {
      const res = await fetch("/api/ouv/team/hierarchy", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture hiérarchie impossible");
      return res.json();
    },
    staleTime: 10 * 60_000,
  });
}

export function useColleague(id: string | null) {
  return useQuery<ColleagueDetail>({
    queryKey: ["ouv", "team", "colleague", id],
    enabled: id != null,
    queryFn: async () => {
      const res = await fetch(`/api/ouv/team/colleague/${id}`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("Lecture collègue impossible");
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}
