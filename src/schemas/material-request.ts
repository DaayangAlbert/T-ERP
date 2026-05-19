import { z } from "zod";

export const materialRequestLineSchema = z.object({
  articleId: z.string().min(1),
  quantityRequested: z.number().positive("Quantité > 0 requise"),
  notes: z.string().max(300).optional(),
});

export const createMaterialRequestSchema = z.object({
  siteId: z.string().min(1, "Chantier requis"),
  warehouseId: z.string().min(1, "Magasin requis"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  reason: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(materialRequestLineSchema).min(1, "Au moins 1 article requis").max(50),
});
export type CreateMaterialRequestInput = z.infer<typeof createMaterialRequestSchema>;

export const fulfillLineSchema = z.object({
  lineId: z.string().min(1),
  quantityFulfilled: z.number().min(0),
});

export const fulfillMaterialRequestSchema = z.object({
  lines: z.array(fulfillLineSchema).min(1),
  notes: z.string().max(500).optional(),
});
export type FulfillMaterialRequestInput = z.infer<typeof fulfillMaterialRequestSchema>;

export const rejectMaterialRequestSchema = z.object({
  reason: z.string().min(3, "Motif requis (3 caractères minimum)").max(500),
});
