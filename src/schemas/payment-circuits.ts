import { z } from "zod";

const stepInput = z.object({
  order: z.number().int().min(1).max(50),
  label: z.string().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  contactRole: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(40).optional().nullable(),
  contactEmail: z.string().email().or(z.literal("")).optional().nullable(),
  estimatedDays: z.number().int().min(0).max(365).optional().nullable(),
});

export const createCircuitTemplateSchema = z.object({
  name: z.string().min(2).max(120),
  clientName: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  steps: z.array(stepInput).min(1).max(20),
});
export type CreateCircuitTemplateInput = z.infer<typeof createCircuitTemplateSchema>;

export const updateCircuitTemplateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  clientName: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
});
export type UpdateCircuitTemplateInput = z.infer<typeof updateCircuitTemplateSchema>;

export const applyCircuitSchema = z.object({
  templateId: z.string().min(1),
  assignedToId: z.string().min(1).optional().nullable(),
});
export type ApplyCircuitInput = z.infer<typeof applyCircuitSchema>;

export const assignTrackSchema = z.object({
  assignedToId: z.string().min(1).nullable(),
});
export type AssignTrackInput = z.infer<typeof assignTrackSchema>;

export const blockStepSchema = z.object({
  reason: z.string().min(3).max(2000),
  requiredDocuments: z.array(z.string().min(1).max(200)).max(20).default([]),
});
export type BlockStepInput = z.infer<typeof blockStepSchema>;

export const provideDocumentSchema = z.object({
  note: z.string().max(2000).optional().nullable(),
});
export type ProvideDocumentInput = z.infer<typeof provideDocumentSchema>;
