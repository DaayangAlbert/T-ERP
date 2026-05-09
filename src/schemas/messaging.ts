import { z } from "zod";
import { MessagePriority } from "@prisma/client";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message vide").max(4000, "Message trop long"),
  priority: z.nativeEnum(MessagePriority).optional(),
  mentions: z.array(z.string()).optional(),
  attachedDocumentIds: z.array(z.string()).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const updatePrioritySchema = z.object({
  priority: z.nativeEnum(MessagePriority),
});

export const createPollSchema = z.object({
  conversationId: z.string().min(1),
  question: z.string().min(3).max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
});

export const createVoiceNoteSchema = z.object({
  conversationId: z.string().min(1),
  audioUrl: z.string().url(),
  durationSec: z.number().int().min(1).max(600),
  transcript: z.string().max(5000).optional(),
});

export const createConversationSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    isGroup: z.boolean().default(false),
    participantIds: z.array(z.string().min(1)).min(1).max(50),
  })
  .refine((d) => !(d.isGroup && (!d.name || d.name.length < 2)), {
    path: ["name"],
    message: "Un groupe nécessite un nom",
  });
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
