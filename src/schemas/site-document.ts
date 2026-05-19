import { z } from "zod";
import { DocumentCategory } from "@prisma/client";

export const siteDocumentMetadataSchema = z.object({
  title: z.string().trim().min(2, "Titre requis").max(200),
  category: z.nativeEnum(DocumentCategory),
  subCategory: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  referenceNumber: z.string().trim().max(80).optional(),
  issuedAt: z.string().datetime().optional().or(z.literal("")),
  validUntil: z.string().datetime().optional().or(z.literal("")),
  amount: z.number().int().nonnegative().optional(),
  relatedPartyName: z.string().trim().max(160).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

export const siteDocumentUpdateSchema = siteDocumentMetadataSchema
  .partial()
  .extend({
    archived: z.boolean().optional(),
  });

export type SiteDocumentMetadataInput = z.infer<typeof siteDocumentMetadataSchema>;
export type SiteDocumentUpdateInput = z.infer<typeof siteDocumentUpdateSchema>;

// Labels FR pour l'affichage et le groupement UI
export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  EXECUTION_PLANS: "Plans d'exécution",
  FIELD_PHOTOS: "Photos terrain",
  RECEPTION_PV: "PV de réception",
  HSE_REPORTS: "Rapports HSE",
  MOA_CORRESPONDENCE: "Correspondance MOA",
  CONTRACT_AMENDMENTS: "Avenants contractuels",
  STUDIES_REPORTS: "Études & rapports",
  QUALITY_CONTROL: "Contrôle qualité",
  MEETING_MINUTES: "PV de réunion",
  CORRESPONDENCE: "Correspondances",
  BANK_GUARANTEE_PERFORMANCE: "Caution de bonne fin",
  BANK_GUARANTEE_ADVANCE: "Caution avance de démarrage",
  BANK_GUARANTEE_RETENTION: "Caution de retenue",
  INSURANCE_ALL_RISKS: "Assurance Tous Risques Chantier",
  INSURANCE_CIVIL_LIABILITY: "Assurance Responsabilité Civile",
  INSURANCE_DECENNIAL: "Garantie décennale",
  STATEMENT: "Décomptes",
  PURCHASE_ORDER: "Bons de commande / Contrats",
  TECHNICAL_PLAN: "Plans techniques",
  PHOTO_SITE: "Photos chantier",
  OFFICIAL_NOTIFICATION: "Ordres de service / Notifications",
  OTHER: "Autres documents",
};

// Regroupement en grandes familles pour l'UI Kanban CC
export const DOCUMENT_CATEGORY_GROUPS: Array<{
  key: string;
  label: string;
  categories: DocumentCategory[];
}> = [
  {
    key: "meetings",
    label: "Réunions & Correspondances",
    categories: ["MEETING_MINUTES", "CORRESPONDENCE", "MOA_CORRESPONDENCE", "OFFICIAL_NOTIFICATION"],
  },
  {
    key: "guarantees",
    label: "Cautions bancaires",
    categories: ["BANK_GUARANTEE_PERFORMANCE", "BANK_GUARANTEE_ADVANCE", "BANK_GUARANTEE_RETENTION"],
  },
  {
    key: "insurances",
    label: "Assurances",
    categories: ["INSURANCE_ALL_RISKS", "INSURANCE_CIVIL_LIABILITY", "INSURANCE_DECENNIAL"],
  },
  {
    key: "financial",
    label: "Financier",
    categories: ["STATEMENT", "PURCHASE_ORDER", "CONTRACT_AMENDMENTS"],
  },
  {
    key: "technical",
    label: "Technique",
    categories: ["TECHNICAL_PLAN", "EXECUTION_PLANS", "STUDIES_REPORTS", "QUALITY_CONTROL"],
  },
  {
    key: "operations",
    label: "Exploitation chantier",
    categories: ["RECEPTION_PV", "HSE_REPORTS", "PHOTO_SITE", "FIELD_PHOTOS"],
  },
  {
    key: "other",
    label: "Autres",
    categories: ["OTHER"],
  },
];
