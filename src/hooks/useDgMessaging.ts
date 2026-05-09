"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MessagePriority, Role } from "@prisma/client";

interface StrategicGroup {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  isStrategic: boolean;
  pinnedAt: string | null;
  participants: Array<{ userId: string; name: string; role: Role }>;
  lastMessage: { content: string; senderId: string; createdAt: string } | null;
  lastMessageAt: string | null;
}

interface PriorityMessage {
  id: string;
  content: string;
  sender: string;
  senderRole: Role;
  conversation: { id: string; name: string | null; isStrategic: boolean };
  priority: MessagePriority;
  createdAt: string;
}

interface MentionItem {
  id: string;
  content: string;
  sender: string;
  conversation: { id: string; name: string | null; isStrategic: boolean };
  priority: MessagePriority;
  createdAt: string;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function useStrategicGroups() {
  return useQuery({
    queryKey: ["dg-messaging", "strategic"],
    queryFn: () => getJson<{ items: StrategicGroup[] }>(`/api/messages/strategic`),
  });
}

export function usePriorityInbox() {
  return useQuery({
    queryKey: ["dg-messaging", "priority-inbox"],
    queryFn: () =>
      getJson<{
        items: PriorityMessage[];
        summary: { total: number; urgent: number; high: number };
      }>(`/api/messages/priority-inbox`),
  });
}

export function useMentions() {
  return useQuery({
    queryKey: ["dg-messaging", "mentions"],
    queryFn: () => getJson<{ items: MentionItem[] }>(`/api/messages/mentions`),
  });
}

export function useUpdateMessagePriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: MessagePriority }) =>
      getJson(`/api/messages/${id}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-messaging"] }),
  });
}

export function useCreatePoll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { conversationId: string; question: string; options: string[] }) =>
      getJson(`/api/messages/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dg-messaging"] }),
  });
}

export function useCreateVoiceNote() {
  return useMutation({
    mutationFn: (data: { conversationId: string; audioUrl: string; durationSec: number; transcript?: string }) =>
      getJson(`/api/messages/voice-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });
}
