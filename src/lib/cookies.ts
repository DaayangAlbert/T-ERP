import { cookies } from "next/headers";
import { signJwt, resolveSessionType, type TerpJwtPayload } from "@/lib/auth";

export const ACCESS_COOKIE = "terp_access";
export const REFRESH_COOKIE = "terp_refresh";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? "7d";
const REFRESH_TTL_SECONDS = parseTtlToSeconds(REFRESH_TTL);
const ACCESS_TTL_SECONDS = parseTtlToSeconds(ACCESS_TTL);

function parseTtlToSeconds(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m) return 900;
  const n = parseInt(m[1], 10);
  const mul = { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as "s" | "m" | "h" | "d"];
  return n * mul;
}

export type AuthIdentity = Pick<TerpJwtPayload, "sub" | "tenantId" | "role" | "email"> & {
  tenantSlug?: string | null;
  type?: TerpJwtPayload["type"];
};

export function setAuthCookies(identity: AuthIdentity) {
  const payload: Omit<TerpJwtPayload, "iat" | "exp"> = {
    sub: identity.sub,
    tenantId: identity.tenantId,
    tenantSlug: identity.tenantSlug ?? null,
    role: identity.role,
    email: identity.email,
    type: identity.type ?? resolveSessionType(identity.role),
  };
  const access = signJwt(payload, ACCESS_TTL as `${number}${"s" | "m" | "h" | "d"}`);
  const refresh = signJwt(payload, REFRESH_TTL as `${number}${"s" | "m" | "h" | "d"}`);
  const jar = cookies();
  const baseOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
  };
  jar.set(ACCESS_COOKIE, access, { ...baseOpts, maxAge: ACCESS_TTL_SECONDS });
  jar.set(REFRESH_COOKIE, refresh, { ...baseOpts, maxAge: REFRESH_TTL_SECONDS });
}

export function clearAuthCookies() {
  const jar = cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export function getAccessCookie(): string | null {
  return cookies().get(ACCESS_COOKIE)?.value ?? null;
}

export function getRefreshCookie(): string | null {
  return cookies().get(REFRESH_COOKIE)?.value ?? null;
}
