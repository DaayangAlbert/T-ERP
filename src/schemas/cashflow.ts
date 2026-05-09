import { z } from "zod";
import { CashFlowType } from "@prisma/client";

export const manualForecastSchema = z.object({
  type: z.nativeEnum(CashFlowType),
  category: z.string().min(2).max(40).default("OTHER"),
  label: z.string().min(2).max(120),
  amount: z.coerce.number().int().positive(),
  expectedDate: z.coerce.date(),
  probability: z.coerce.number().int().min(0).max(100).default(100),
  recurrence: z.enum(["UNIQUE", "MONTHLY"]).default("UNIQUE"),
  recurrenceCount: z.coerce.number().int().min(1).max(12).default(1),
});
export type ManualForecastInput = z.infer<typeof manualForecastSchema>;

export const updateForecastSchema = z.object({
  amount: z.coerce.number().int().positive().optional(),
  expectedDate: z.coerce.date().optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  label: z.string().min(2).max(120).optional(),
  realized: z.boolean().optional(),
  realizedAmount: z.coerce.number().int().positive().optional(),
});
export type UpdateForecastInput = z.infer<typeof updateForecastSchema>;
