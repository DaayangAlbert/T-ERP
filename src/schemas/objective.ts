import { z } from "zod";
import { ObjectiveCategory, ObjectivePeriod, ObjectiveStatus } from "@prisma/client";

export const createObjectiveSchema = z
  .object({
    category: z.nativeEnum(ObjectiveCategory),
    title: z.string().min(2).max(120),
    description: z.string().max(2000).optional().or(z.literal("")),
    targetValue: z.coerce.number().finite(),
    actualValue: z.coerce.number().finite().default(0),
    unit: z.string().min(1).max(40),
    period: z.nativeEnum(ObjectivePeriod).default(ObjectivePeriod.ANNUAL),
    year: z.coerce.number().int().min(2024).max(2099),
    quarter: z.coerce.number().int().min(1).max(4).optional().nullable(),
    weight: z.coerce.number().int().min(1).max(10).default(1),
    status: z.nativeEnum(ObjectiveStatus).default(ObjectiveStatus.IN_PROGRESS),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((d) => d.period === ObjectivePeriod.ANNUAL || d.quarter !== null, {
    path: ["quarter"],
    message: "Le trimestre est requis pour un objectif trimestriel ou mensuel",
  })
  .refine((d) => d.endDate >= d.startDate, {
    path: ["endDate"],
    message: "La date de fin doit être postérieure à la date de début",
  });
export type CreateObjectiveInput = z.infer<typeof createObjectiveSchema>;

export const updateObjectiveSchema = z.object({
  category: z.nativeEnum(ObjectiveCategory).optional(),
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  targetValue: z.coerce.number().finite().optional(),
  actualValue: z.coerce.number().finite().optional(),
  unit: z.string().min(1).max(40).optional(),
  weight: z.coerce.number().int().min(1).max(10).optional(),
  status: z.nativeEnum(ObjectiveStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type UpdateObjectiveInput = z.infer<typeof updateObjectiveSchema>;
