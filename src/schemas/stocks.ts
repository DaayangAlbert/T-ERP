import { z } from "zod";
import { AssetCategory, MovementType, InventoryStatus, LossType } from "@prisma/client";

export const updateAssetSchema = z.object({
  description: z.string().min(2).max(200).optional(),
  category: z.nativeEnum(AssetCategory).optional(),
  grossValue: z.string().optional(),
  accumulatedDepreciation: z.string().optional(),
  usefulLifeMonths: z.number().int().min(1).max(600).optional(),
  siteId: z.string().optional().nullable(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR"]).optional(),
  insurance: z
    .object({
      company: z.string().max(80).optional(),
      policyRef: z.string().max(40).optional(),
      expiresAt: z.string().optional(),
      coveredAmount: z.string().optional(),
    })
    .optional(),
});

export const createInventorySchema = z.object({
  siteId: z.string().optional().nullable(),
  period: z.string(),
  startDate: z.string(),
});

export const validateInventorySchema = z.object({
  note: z.string().max(500).optional(),
});

export const createLossSchema = z.object({
  type: z.nativeEnum(LossType),
  itemDescription: z.string().min(3).max(200),
  value: z.string(),
  siteId: z.string().optional().nullable(),
  occurredAt: z.string(),
  declaredToInsurance: z.boolean().default(false),
  indemnification: z.string().optional().nullable(),
  correctiveActions: z.string().max(1000).optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type CreateLossInput = z.infer<typeof createLossSchema>;
