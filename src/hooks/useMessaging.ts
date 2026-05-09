"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@prisma/client";

export interface ConversationItem {
  id: string;
  name: string;
  isGroup: boolean;
  avatarUrl: string | null;
  otherUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: Role;
    avatarUrl: string | null;
  }>;
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
    senderName: string;
    isMe: boolean;
  } | null;
  lastMessageAt: string | null;
  unread: number;
  isPinned: boolean;
  isMuted: boolean;
}

export interface MessageItem {
  id: string;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  isSystem: boolean;
  createdAt: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: Role;
  };
  isMe: boolean;
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async (): Promise<{ items: ConversationItem[] }> => {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("Erreur de chargement");
      return res.json();
    },
    staleTime: 5_000,
    refetchInterval: 5_000, // refresh sidebar every 5s for new conversations / unreads
  });
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async (): Promise<{ items: MessageItem[]; currentUserId: string }> => {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error("Conversation introuvable");
      return res.json();
    },
    enabled: Boolean(conversationId),
    refetchInterval: 3_000, // J5 spec: polling every 3s on the active conversation
    staleTime: 1_000,
  });
}

export function useSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string): Promise<MessageItem> => {
      if (!conversationId) throw new Error("Aucune conversation");
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Envoi échoué");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
