import { z } from "zod";
import { EventType } from "@prisma/client";

export const updatePreferencesSchema = z.object({
  dashboardWidgets: z.array(z.string()).optional(),
  alertThresholds: z
    .object({
      treasuryMin: z.string().optional(),
      marginMin: z.number().optional(),
      validationOverdueDays: z.number().int().optional(),
    })
    .optional(),
  notificationChannels: z.record(z.array(z.enum(["EMAIL", "PUSH", "INAPP", "SMS"]))).optional(),
  dailyReportEnabled: z.boolean().optional(),
  dailyReportTime: z.string().optional(),
  numberFormat: z.enum(["M_FCFA", "MD_FCFA", "RAW"]).optional(),
});

export const updateSignatureSchema = z.object({
  signatureUrl: z.string().optional().nullable(),
  initialsUrl: z.string().optional().nullable(),
});

export const createAgendaEventSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  startAt: z.string(),
  endAt: z.string(),
  location: z.string().max(120).optional(),
  type: z.nativeEnum(EventType).default(EventType.MEETING),
});

export const updateAgendaEventSchema = createAgendaEventSchema.partial();

export const createInterestDeclarationSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  mandates: z
    .array(
      z.object({
        entity: z.string().min(2),
        role: z.string().min(2),
        since: z.string(),
        end: z.string().optional().nullable(),
      })
    )
    .default([]),
  shareholdings: z
    .array(
      z.object({
        entity: z.string().min(2),
        percent: z.number().min(0).max(100),
        value: z.string().optional().nullable(),
      })
    )
    .default([]),
  conflictsOfInterest: z
    .array(
      z.object({
        description: z.string().min(3),
        mitigation: z.string().optional(),
      })
    )
    .default([]),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type CreateAgendaEventInput = z.infer<typeof createAgendaEventSchema>;
export type CreateInterestDeclarationInput = z.infer<typeof createInterestDeclarationSchema>;
