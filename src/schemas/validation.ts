import { z } from "zod";
import { ValidationType } from "@prisma/client";

export const approveSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(3, "Motif requis (3 car. min)").max(500),
});

export const requestInfoSchema = z.object({
  message: z.string().min(3).max(500),
});

export const bulkApproveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Au moins un id"),
  comment: z.string().max(500).optional(),
});

export const createDelegationSchema = z.object({
  toUserId: z.string().min(1, "Destinataire requis"),
  types: z.array(z.nativeEnum(ValidationType)).min(1, "Au moins un type"),
  maxAmount: z.string().optional().nullable(), // BigInt envoyé en string
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string().optional().nullable(),
  reason: z.string().max(300).optional(),
});

export type ApproveInput = z.infer<typeof approveSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type RequestInfoInput = z.infer<typeof requestInfoSchema>;
export type BulkApproveInput = z.infer<typeof bulkApproveSchema>;
export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
