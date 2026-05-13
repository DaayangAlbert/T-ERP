import bcrypt from "bcrypt";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "";
const ACCESS_TTL = (process.env.ADMIN_JWT_TTL ?? "30m") as SignOptions["expiresIn"];

/**
 * Auth Super-Admin Anthropic — JWT séparé du tenant JWT.
 *
 * Cookie distinct `terp_admin_access` pour éviter toute collision avec
 * la session tenant. Audience "platform-admin" pour bloquer les abus.
 */

export interface AdminJwtPayload extends JwtPayload {
  sub: string; // PlatformAdmin.id
  email: string;
  role: "CTO" | "SUPPORT_L3" | "BILLING_ADMIN" | "COMPLIANCE_OFFICER";
  aud: "platform-admin";
}

export function signAdminJwt(
  payload: Omit<AdminJwtPayload, "iat" | "exp" | "aud">,
): string {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ ...payload, aud: "platform-admin" }, SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

export function verifyAdminJwt(token: string): AdminJwtPayload {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  const decoded = jwt.verify(token, SECRET) as AdminJwtPayload;
  if (decoded.aud !== "platform-admin") {
    throw new Error("Wrong audience");
  }
  return decoded;
}

export function hashAdminPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export function compareAdminPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
