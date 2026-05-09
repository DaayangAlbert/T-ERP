import { z } from "zod";
import { SuccessionStatus, TrainingStatus } from "@prisma/client";

export const updateSuccessionSchema = z.object({
  successorId: z.string().optional().nullable(),
  readyInMonths: z.number().int().min(0).max(60).optional().nullable(),
  status: z.nativeEnum(SuccessionStatus).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const createTrainingSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(3).max(120),
  category: z.string().min(2).max(40),
  provider: z.string().max(80).optional(),
  startDate: z.string(),
  endDate: z.string(),
  cost: z.string().optional().nullable(),
  status: z.nativeEnum(TrainingStatus).default(TrainingStatus.PLANNED),
  expiresAt: z.string().optional().nullable(),
});

export type UpdateSuccessionInput = z.infer<typeof updateSuccessionSchema>;
export type CreateTrainingInput = z.infer<typeof createTrainingSchema>;
