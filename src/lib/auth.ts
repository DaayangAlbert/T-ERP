import bcrypt from "bcrypt";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "";
const ACCESS_TTL = (process.env.JWT_ACCESS_TTL ?? "15m") as SignOptions["expiresIn"];
const BCRYPT_ROUNDS = 12;

export type SessionType = "candidate" | "employee";

export interface TerpJwtPayload extends JwtPayload {
  sub: string;
  tenantId: string | null;
  tenantSlug?: string | null;
  role: string;
  email: string;
  type: SessionType;
}

export function resolveSessionType(role: string): SessionType {
  return role === "CANDIDATE" ? "candidate" : "employee";
}

export function isCandidateSession(payload: TerpJwtPayload | null | undefined): boolean {
  if (!payload) return false;
  return payload.type === "candidate" || payload.role === "CANDIDATE";
}

export function signJwt(payload: Omit<TerpJwtPayload, "iat" | "exp">, ttl: SignOptions["expiresIn"] = ACCESS_TTL): string {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, SECRET, { expiresIn: ttl });
}

export function verifyJwt(token: string): TerpJwtPayload {
  if (!SECRET) throw new Error("JWT_SECRET is not configured");
  return jwt.verify(token, SECRET) as TerpJwtPayload;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
