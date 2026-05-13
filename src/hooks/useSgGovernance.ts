"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BoardMemberFunction,
  DecisionType,
  MeetingStatus,
  MeetingType,
} from "@prisma/client";

export interface AgendaItem {
  num: number;
  title: string;
  duration?: string;
}

export interface MeetingsListResponse {
  kpis: {
    boardMembersCount: number;
    scheduledCount: number;
    completedYtd: number;
    nextMeetingDaysAway: number | null;
  };
  nextMeeting: {
    id: string;
    type: MeetingType;
    scheduledAt: string;
    location: string;
    status: MeetingStatus;
    convocationsSentAt: string | null;
    agenda: { items?: AgendaItem[] } | null;
    convocationsRecipients: any;
    pvSignedAt: string | null;
    decisionsCount: number;
  } | null;
  meetings: Array<{
    id: string;
    type: MeetingType;
    scheduledAt: string;
    location: string;
    status: MeetingStatus;
    convocationsSentAt: string | null;
    pvSignedAt: string | null;
    pvDocumentUrl: string | null;
    decisionsCount: number;
  }>;
}

export function useGovernanceMeetings() {
  return useQuery<MeetingsListResponse>({
    queryKey: ["sg", "governance", "meetings"],
    queryFn: async () => {
      const r = await fetch("/api/sg/governance/meetings", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur chargement réunions");
      return r.json();
    },
  });
}

export interface BoardMember {
  id: string;
  fullName: string;
  function: BoardMemberFunction;
  representingEntity: string | null;
  isIndependent: boolean;
  mandateStartDate: string;
  mandateEndDate: string;
  mandateRenewable: boolean;
  biography: string | null;
  daysToEndOfMandate: number;
  mandateStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
}

export function useBoardMembers() {
  return useQuery<{ items: BoardMember[] }>({
    queryKey: ["sg", "governance", "board-members"],
    queryFn: async () => {
      const r = await fetch("/api/sg/governance/board-members", { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur chargement administrateurs");
      return r.json();
    },
  });
}

export interface DecisionsRegisterEntry {
  id: string;
  decisionNumber: number;
  title: string;
  description: string;
  decisionType: DecisionType;
  decidedAt: string;
  followUpStatus: string | null;
  meeting: { id: string; type: MeetingType; scheduledAt: string; location: string };
}

export function useDecisionsRegister(source?: "BOARD" | "AG") {
  return useQuery<{ total: number; countByMeetingType: Record<string, number>; items: DecisionsRegisterEntry[] }>({
    queryKey: ["sg", "governance", "decisions-register", source ?? "ALL"],
    queryFn: async () => {
      const url = source ? `/api/sg/governance/decisions-register?source=${source}` : `/api/sg/governance/decisions-register`;
      const r = await fetch(url, { credentials: "same-origin" });
      if (!r.ok) throw new Error("Erreur chargement registre");
      return r.json();
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["sg", "governance"] });
  qc.invalidateQueries({ queryKey: ["sg", "dashboard"] });
}

export function useUpdateAgenda(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { items: AgendaItem[]; approveByDg?: boolean }) => {
      const r = await fetch(`/api/sg/governance/meetings/${meetingId}/agenda`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useSendConvocations(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      recipients: Array<{ name: string; email?: string; phone?: string }>;
      channels: Array<"EMAIL" | "WHATSAPP" | "REGISTERED_MAIL">;
      message?: string;
    }) => {
      const r = await fetch(`/api/sg/governance/meetings/${meetingId}/convocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json() as Promise<{ ok: true; recipientsCount: number; channels: string[] }>;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUploadPv(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      documentUrl: string;
      signedBy: string;
      attendees?: any;
      quorum?: number;
    }) => {
      const r = await fetch(`/api/sg/governance/meetings/${meetingId}/pv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useAddDecision(meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      decisionType: DecisionType;
      followUpStatus?: string;
    }) => {
      const r = await fetch(`/api/sg/governance/meetings/${meetingId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json();
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: MeetingType;
      scheduledAt: string;
      location: string;
      agenda: { items: AgendaItem[] };
    }) => {
      const r = await fetch("/api/sg/governance/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error ?? "Erreur");
      }
      return r.json() as Promise<{ id: string }>;
    },
    onSuccess: () => invalidate(qc),
  });
}
