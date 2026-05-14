import { z } from "zod";

// Coordonnées GPS optionnelles : si l'ouvrier refuse la permission caméra ou
// GPS, on accepte quand même le pointage (l'API marque outOfGeofence=true et
// la situation est revue par le CC).
const geoSchema = z
  .object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
    accuracyM: z.number().int().min(0).max(50_000).nullish(),
  })
  .nullish();

// Selfie : URL R2 déjà uploadée OU dataURL base64 (fallback si l'upload
// direct R2 n'est pas dispo). L'API normalise en URL. Limite 1 Mo en base64.
const selfieSchema = z
  .string()
  .min(1)
  .max(1_400_000) // ~1 Mo base64 ≈ 700 ko binaire
  .nullish();

export const clockInSchema = z.object({
  siteId: z.string().min(1),
  at: z.string().datetime().nullish(), // ISO — sinon now() côté serveur
  geo: geoSchema,
  selfie: selfieSchema,
  deviceFingerprint: z.string().min(8).max(128).nullish(),
  acknowledgeOutOfGeofence: z.boolean().optional(),
  fromOfflineQueue: z.boolean().optional(),
  localId: z.string().optional(),
});
export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  at: z.string().datetime().nullish(),
  geo: geoSchema,
  selfie: selfieSchema,
  deviceFingerprint: z.string().min(8).max(128).nullish(),
  acknowledgeOutOfGeofence: z.boolean().optional(),
  fromOfflineQueue: z.boolean().optional(),
  localId: z.string().optional(),
});
export type ClockOutInput = z.infer<typeof clockOutSchema>;

export const disputeSchema = z.object({
  reason: z.string().min(5, "Précise ton désaccord (≥ 5 caractères)").max(500),
});
export type DisputeInput = z.infer<typeof disputeSchema>;
