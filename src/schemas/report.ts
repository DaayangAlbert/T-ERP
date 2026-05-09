import { z } from "zod";
import { ReportType } from "@prisma/client";

export const createReportSchema = z.object({
  type: z.nativeEnum(ReportType),
  title: z.string().min(3).max(150),
  period: z.string().min(2).max(40),
  scope: z.enum(["GROUP", "TENANT", "SITES"]).default("GROUP"),
  blocks: z.array(z.string()).min(1, "Sélectionnez au moins un bloc"),
  signature: z.string().max(80).optional(),
  recipients: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).optional(),
});

export const sendReportSchema = z.object({
  recipients: z
    .array(z.object({ email: z.string().email(), name: z.string().optional() }))
    .min(1, "Au moins un destinataire"),
  message: z.string().max(500).optional(),
});

export const createScheduledReportSchema = z.object({
  type: z.nativeEnum(ReportType),
  title: z.string().min(3).max(150),
  rule: z.enum(["WEEKLY_MONDAY_06", "MONTHLY_FIRST_08", "QUARTERLY_FIRST"]),
  blocks: z.array(z.string()).min(1),
  recipients: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type SendReportInput = z.infer<typeof sendReportSchema>;
export type CreateScheduledReportInput = z.infer<typeof createScheduledReportSchema>;
