import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message vide").max(4000, "Message trop long"),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

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
