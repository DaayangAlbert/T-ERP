import { z } from "zod";

export const hseTypeSchema = z.enum([
  "CORPORAL_ACCIDENT",
  "NEAR_MISS",
  "EQUIPMENT_DEFECT",
  "SITE_DANGER",
  "THEFT_INTRUSION",
]);
export type OuvHseType = z.infer<typeof hseTypeSchema>;

export const hseSeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
export type OuvHseSeverity = z.infer<typeof hseSeveritySchema>;

// Création d'un signalement HSE. Champs adaptatifs selon type :
//  - CORPORAL_ACCIDENT : injuredPersonIds + witnessIds + photos
//  - NEAR_MISS : description circonstances
//  - EQUIPMENT_DEFECT : description matériel + photo
//  - SITE_DANGER : locationDetail + photos
//  - THEFT_INTRUSION : description + photos preuves
// Sévérité par défaut MEDIUM (HIGH pour CORPORAL_ACCIDENT).
export const hseReportSchema = z.object({
  type: hseTypeSchema,
  title: z.string().min(5, "Titre court requis (≥ 5 caractères)").max(200),
  description: z.string().min(10, "Description requise (≥ 10 caractères)").max(2000),
  severity: hseSeveritySchema.optional(),
  // Géolocalisation incident (peut différer du site)
  geo: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
    })
    .nullish(),
  locationDetail: z.string().max(300).optional(),
  // Personnes impliquées (seulement pour accident corporel)
  injuredPersonIds: z.array(z.string().cuid()).max(20).optional(),
  witnessIds: z.array(z.string().cuid()).max(20).optional(),
  // Photos jusqu'à 5 ; dataURLs webp ~ < 1.4Mo chacune
  photos: z.array(z.string().min(1).max(1_400_000)).max(5).optional(),
  // Anonymat (anti-représailles, art. L132 Code du travail CM)
  isAnonymous: z.boolean().optional(),
});
export type OuvHseReportInput = z.infer<typeof hseReportSchema>;

export const hseAddInfoSchema = z.object({
  additionalInfo: z.string().min(5).max(2000),
});
export type OuvHseAddInfoInput = z.infer<typeof hseAddInfoSchema>;

export const hsePhotoUploadSchema = z.object({
  photos: z.array(z.string().min(1).max(1_400_000)).min(1).max(5),
});
export type OuvHsePhotoUploadInput = z.infer<typeof hsePhotoUploadSchema>;

export function hseTypeLabel(t: OuvHseType): string {
  switch (t) {
    case "CORPORAL_ACCIDENT":
      return "Accident corporel";
    case "NEAR_MISS":
      return "Presque-accident";
    case "EQUIPMENT_DEFECT":
      return "Anomalie matériel";
    case "SITE_DANGER":
      return "Danger sur chantier";
    case "THEFT_INTRUSION":
      return "Vol ou intrusion";
  }
}

export function hseTypeEmoji(t: OuvHseType): string {
  switch (t) {
    case "CORPORAL_ACCIDENT":
      return "🚑";
    case "NEAR_MISS":
      return "⚠️";
    case "EQUIPMENT_DEFECT":
      return "🔧";
    case "SITE_DANGER":
      return "🚧";
    case "THEFT_INTRUSION":
      return "🚓";
  }
}

export function hseTypeSubLabel(t: OuvHseType): string {
  switch (t) {
    case "CORPORAL_ACCIDENT":
      return "Blessure · chute · brûlure";
    case "NEAR_MISS":
      return "Sans blessure mais a failli";
    case "EQUIPMENT_DEFECT":
      return "Outil cassé · EPI défectueux";
    case "SITE_DANGER":
      return "Échafaudage · électricité · sol";
    case "THEFT_INTRUSION":
      return "Disparition matériel · personne";
  }
}

// Sévérité par défaut selon type (l'ouvrier peut affiner)
export function defaultSeverityForType(t: OuvHseType): OuvHseSeverity {
  if (t === "CORPORAL_ACCIDENT") return "HIGH";
  if (t === "SITE_DANGER") return "MEDIUM";
  return "MEDIUM";
}
