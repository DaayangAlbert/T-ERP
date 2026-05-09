import { z } from "zod";
import { ContractStatus } from "@prisma/client";

export const dgDecisionSchema = z.object({
  note: z.string().max(500).optional(),
});

export const dgRejectSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const evaluateSupplierSchema = z.object({
  period: z.string(),
  ratingQuality: z.number().min(1).max(5),
  ratingDelay: z.number().min(1).max(5),
  ratingPrice: z.number().min(1).max(5),
  comments: z.string().max(1000).optional(),
});

export const createFrameworkContractSchema = z.object({
  supplierId: z.string().min(1),
  reference: z.string().min(2).max(40),
  subject: z.string().min(3).max(200),
  maxAmount: z.string(), // BigInt en string
  startDate: z.string(),
  endDate: z.string(),
  conditions: z
    .object({
      paymentTerms: z.number().int().optional(),
      penalties: z.string().optional(),
      revisionClause: z.string().optional(),
    })
    .optional(),
  status: z.nativeEnum(ContractStatus).default(ContractStatus.DRAFT),
});

export type EvaluateSupplierInput = z.infer<typeof evaluateSupplierSchema>;
export type CreateFrameworkContractInput = z.infer<typeof createFrameworkContractSchema>;
