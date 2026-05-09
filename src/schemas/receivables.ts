import { z } from "zod";
import { ReminderLevel, ReminderChannel } from "@prisma/client";

export const sendReminderSchema = z.object({
  level: z.nativeEnum(ReminderLevel),
  channel: z.nativeEnum(ReminderChannel),
  note: z.string().max(2000).optional(),
});

export const recordPromiseSchema = z.object({
  promiseDate: z.string(),
  amount: z.string(),
  note: z.string().max(500).optional(),
});

export const setLitigationSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const campaignSchema = z.object({
  level: z.nativeEnum(ReminderLevel),
  channel: z.nativeEnum(ReminderChannel),
  daysOverdueMin: z.number().int().min(1).max(365).optional(),
});

export type SendReminderInput = z.infer<typeof sendReminderSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
