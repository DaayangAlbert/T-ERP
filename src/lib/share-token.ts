/**
 * Liens partageables signés (JWT) pour les ressources EMP.
 *
 * Utilisé par le partage WhatsApp d'un bulletin : l'ouvrier envoie le
 * lien à sa famille, qui peut consulter le PDF SANS être connectée
 * — mais pendant 24 h seulement.
 */
import jwt, { type SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "";

export type ShareResource = "payslip" | "work_certificate";

export interface SharePayload {
  resource: ShareResource;
  resourceId: string;
  ownerUserId: string;
  iat?: number;
  exp?: number;
}

const TTL_24H: SignOptions["expiresIn"] = "24h";

export function signShareToken(
  payload: Omit<SharePayload, "iat" | "exp">,
  ttl: SignOptions["expiresIn"] = TTL_24H
): string {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, SECRET, { expiresIn: ttl });
}

export function verifyShareToken(token: string): SharePayload {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.verify(token, SECRET) as SharePayload;
}

export function buildShareUrl(baseUrl: string, resource: ShareResource, resourceId: string, token: string): string {
  return `${baseUrl}/api/emp/share/${resource}/${resourceId}?token=${encodeURIComponent(token)}`;
}
