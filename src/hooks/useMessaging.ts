"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@prisma/client";
import { fetchWithRefresh } from "@/lib/fetch-with-refresh";

/**
 * Erreur HTTP enrichie avec le statut, pour permettre aux composants
 * d'afficher un message contextuel (ex: 401 → session expirée).
 */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

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
  attachmentType: string | null;
  voiceNote: { durationSec: number; transcript: string | null } | null;
  isSystem: boolean;
  deleted: boolean;
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
      const res = await fetchWithRefresh("/api/conversations");
      if (!res.ok) throw new HttpError(res.status, "Erreur de chargement");
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
      const res = await fetchWithRefresh(`/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new HttpError(res.status, "Conversation introuvable");
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
      const res = await fetchWithRefresh(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new HttpError(res.status, err.error ?? "Envoi échoué");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/**
 * Upload d'une pièce jointe ou note vocale dans une conversation.
 * Crée un Message côté serveur, retourne le message créé.
 */
export function useSendAttachment(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      file: File;
      content?: string;
      kind?: "voice";
      duration?: number;
    }): Promise<MessageItem> => {
      if (!conversationId) throw new Error("Aucune conversation");
      const fd = new FormData();
      fd.append("file", input.file);
      if (input.content) fd.append("content", input.content);
      if (input.kind) fd.append("kind", input.kind);
      if (input.duration) fd.append("duration", String(input.duration));
      const res = await fetchWithRefresh(`/api/conversations/${conversationId}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new HttpError(res.status, err.error ?? "Upload échoué");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Supprime un message "pour tout le monde" (réservé à l'expéditeur). */
export function useDeleteMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string): Promise<void> => {
      if (!conversationId) throw new Error("Aucune conversation");
      const res = await fetchWithRefresh(
        `/api/conversations/${conversationId}/messages/${messageId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new HttpError(res.status, err.error ?? "Suppression échouée");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

/** Met à jour les réglages de la conversation pour l'utilisateur (mute / pin). */
export function useUpdateConversationSettings(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { isMuted?: boolean; isPinned?: boolean }): Promise<void> => {
      if (!conversationId) throw new Error("Aucune conversation");
      const res = await fetchWithRefresh(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new HttpError(res.status, err.error ?? "Mise à jour échouée");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export interface MessagingContact {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  position: string | null;
  department: string | null;
  teamLeader: boolean;
}

export function useMessagingContacts() {
  return useQuery({
    queryKey: ["messaging-contacts"],
    queryFn: async (): Promise<{ items: MessagingContact[] }> => {
      const res = await fetchWithRefresh("/api/messaging/contacts");
      if (!res.ok) throw new HttpError(res.status, "Erreur de chargement des contacts");
      return res.json();
    },
    // Court staleTime pour que la liste suive un éventuel changement de
    // rôle / hiérarchie de l'utilisateur sans devoir recharger la page.
    staleTime: 10_000,
  });
}

export interface CreateConversationInput {
  name?: string;
  isGroup: boolean;
  participantIds: string[];
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<{ id: string; existing?: boolean }> => {
      const res = await fetchWithRefresh("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new HttpError(res.status, err.error ?? "Création échouée");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
