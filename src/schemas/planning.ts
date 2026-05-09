import { z } from "zod";
import { MilestoneType, MilestoneStatus } from "@prisma/client";

export const createMilestoneSchema = z.object({
  type: z.nativeEnum(MilestoneType),
  title: z.string().min(3).max(120),
  date: z.string(), // YYYY-MM-DD
  siteId: z.string().optional().nullable(),
  critical: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const updateMilestoneSchema = z.object({
  date: z.string().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
  title: z.string().min(3).max(120).optional(),
  critical: z.boolean().optional(),
  notes: z.string().max(500).optional().nullable(),
});

export const resolveConflictSchema = z.object({
  resolution: z.string().min(3).max(500),
});

export const arbitrationDecisionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(500).optional(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
