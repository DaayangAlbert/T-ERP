import { z } from "zod";
import { SiteStatus, SiteType } from "@prisma/client";

const siteCodeRegex = /^[A-Z]{2,5}-\d{4}-\d{2,4}$/;

export const createSiteSchema = z.object({
  code: z.string().regex(siteCodeRegex, "Format attendu : CHT-2026-001"),
  name: z.string().min(2).max(120),
  client: z.string().min(2).max(120),
  type: z.nativeEnum(SiteType),
  region: z.string().max(60).optional().nullable(),
  budget: z.coerce.number().int().nonnegative(),
  startDate: z.coerce.date(),
  plannedEndDate: z.coerce.date(),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  margin: z.coerce.number().min(-100).max(100).default(0),
  status: z.nativeEnum(SiteStatus).default(SiteStatus.PLANNED),
  managerId: z.string().optional().nullable(),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;

export const updateSiteSchema = createSiteSchema.partial().omit({ code: true });
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
